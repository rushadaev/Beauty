import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import laravelService from '../../../../services/laravelService';
import { bold, fmt } from "telegraf/format";

export const notificationsListScene = new Scenes.BaseScene<MyContext>('active_notifications');

// Since type is always 'notifications', no need for type mapping
const listNotifications = async (ctx: MyContext) => {
    // Initialize page number in session if not set
    if (!ctx.session.searchRequestsPage) {
        ctx.session.searchRequestsPage = 1;
    }

    logger.info('Entered searchRequestsScene', { session: ctx.scene.session });

    const currentPage = ctx.session.searchRequestsPage;
    const perPage = 1; // Adjust as needed

    const typeText = 'уведомлений'; // Since type is always 'notifications'

    const messageTextHeader = `🫡 Список активных заявок на ${typeText} (Страница ${currentPage})`;

    try {
        // Fetch paginated notifications
        const paginatedNotifications = await laravelService.getNotificationsByTelegramId(
            ctx.from.id,
            currentPage,
            perPage,
            'notification' // Fixed type
        );

        console.log('paginatedNotifications:', paginatedNotifications);

        if (!paginatedNotifications || paginatedNotifications.data.length === 0) {
            const noNotificationsText = `📭 У вас нет активных ${typeText}.`;
            const noKeyboard = Markup.inlineKeyboard([
                [Markup.button.callback('👈 Назад', 'reenter')],
                [Markup.button.callback('👌 Главное меню', 'mainmenu')],
            ]);

            if (ctx.callbackQuery && ctx.callbackQuery.message) {
                await ctx.editMessageText(noNotificationsText, noKeyboard);
            } else {
                await ctx.reply(noNotificationsText, noKeyboard);
            }

            return;
        }

        let notification;
        try {
            notification = paginatedNotifications.data[0];
        }
        catch (error) {
            logger.error('Error getting notifications:', error);
            await ctx.answerCbQuery('Произошла ошибка [0]', {
                show_alert: true,
            });
            return;
        }

        const name = notification.settings.name;
        const sum = notification.settings.sum;
        const dateTime = notification.settings.dateTime;
        const notificationType = notification.settings.type;

        // Assuming 'status' field exists
        const statusText = notification.status === 'started'
            ? 'ищем'
            : (notification.status === 'finished' ? 'нашли' : 'вышло время');

        // Format the notification message
        const messageText = fmt`
🫡 ${bold`Список активных ${typeText}`}

${bold`Название:`} ${name}
${bold`Сумма:`} ${sum}
${bold`Время:`} ${dateTime}
${bold`Тип:`} ${notificationType}
${bold`Статус:`} ${statusText}

Страница: ${currentPage} из ${paginatedNotifications.last_page}
        `;

        // Build pagination buttons
        const buttons = [];

        const buttonsPagination = [];

        if (paginatedNotifications.prev_page_url) {
            buttonsPagination.push(Markup.button.callback('⬅️', 'notifications_prev'));
        }

        if (paginatedNotifications.next_page_url) {
            buttonsPagination.push(Markup.button.callback('➡️', 'notifications_next'));
        }

        const buttonDelete = Markup.button.callback('❌ Удалить', `delete_${notification.id}`);

        const buttonEdit = Markup.button.callback('✏️ Редактировать', `edit_${notification.id}`);

        buttons.push([buttonDelete]);
        buttons.push([buttonEdit]);
        if (buttonsPagination.length > 0) {
            buttons.push(buttonsPagination);
        }

        // Always show 'Main Menu' and 'Back' buttons
        buttons.push([
            Markup.button.callback('👈 Назад', 'reenter'),
            Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]);

        const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 }); // Adjust columns as per button arrangement

        ctx.session.notifications = paginatedNotifications.data;

        if (ctx.callbackQuery && ctx.callbackQuery.message) {
            try {
                // Edit existing message if interaction is from a callback query
                await ctx.editMessageText(messageText, {
                    ...keyboard,
                    parse_mode: 'Markdown', // Ensure message formatting matches parse mode
                });
            } catch (error) {
                logger.error('Error sending notifications message:', error);
                await ctx.reply(messageText, {
                    ...keyboard,
                    parse_mode: 'Markdown',
                });
            }
        } else {
            // Otherwise, send a new message
            await ctx.reply(messageText, {
                ...keyboard,
                parse_mode: 'Markdown',
            });
        }
    } catch (error) {
        logger.error('Error getting notifications:', error);

    }
}

notificationsListScene.enter(async (ctx: MyContext) => {
    // Since there's only one type, no need to ask user to select type
    await listNotifications(ctx);
});

const listNotificationsAction = async (ctx: MyContext) => {
    await listNotifications(ctx);
}

notificationsListScene.action('notifications_next', async (ctx: MyContext) => {
    if (ctx.session.searchRequestsPage) {
        logger.info('Incrementing page number');
        ctx.session.searchRequestsPage += 1;

        await listNotificationsAction(ctx);
    } else {
        logger.warn('Page number not set');
        // If for some reason the page isn't set, reset to page 1
        ctx.session.searchRequestsPage = 1;
        await ctx.scene.reenter();
    }
});

// Handle 'Previous' button callback
notificationsListScene.action('notifications_prev', async (ctx: MyContext) => {
    if (ctx.session.searchRequestsPage && ctx.session.searchRequestsPage > 1) {
        ctx.session.searchRequestsPage -= 1;

        await listNotificationsAction(ctx);
    } else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});

notificationsListScene.action(/delete_(.*)/, async (ctx) => {
    const notificationId = ctx.match[1];
    try {
        await laravelService.deleteNotification(notificationId);
        await ctx.answerCbQuery('Заявка удалена', { show_alert: true });
        await ctx.scene.reenter();
    } catch (error) {
        logger.error('Error deleting notification:', error);
        await ctx.answerCbQuery('Произошла ошибка при удалении заявки.', { show_alert: true });
    }
});

notificationsListScene.action(/edit_(.*)/, async (ctx) => {
    const notificationId = ctx.match[1];
    ctx.session.notificationId = notificationId;
    console.log('notificationId:', notificationId);
    console.log('ctx.session.notifications:', ctx.session.notifications);

    console.log('ctx.session.notifications.find((n: any) => n.id == notificationId):', ctx.session.notifications.find((n: any) => n.id == notificationId).settings.name);
    ctx.session.notificationForm = {
        id: notificationId,
        name: ctx.session.notifications.find((n: any) => n.id == notificationId).settings.name,
        sum: ctx.session.notifications.find((n: any) => n.id == notificationId).settings.sum,
        dateTime: ctx.session.notifications.find((n: any) => n.id == notificationId).settings.dateTime,
        type: ctx.session.notifications.find((n: any) => n.id == notificationId).settings.type,
    }
    await ctx.scene.enter('edit_notification');
});

notificationsListScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});


export default notificationsListScene;
