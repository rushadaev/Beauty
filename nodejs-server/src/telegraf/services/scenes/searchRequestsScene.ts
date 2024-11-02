// src/scenes/searchRequestsScene.ts

import { Scenes, Markup } from 'telegraf';
import {MyContext} from '../../types/MyContext';
import CacheService from '../../../utils/redis/Cache/Cache';
import logger from '../../../utils/logger/loggerTelegram';
import laravelService from '../../../services/laravelService';
import {bold, fmt} from "telegraf/format";
import {BOX_TYPES, BOX_TYPES_TEXT_ONLY, COEFFICIENTS_TEXT_ONLY, WAREHOUSES} from "../../../utils/wildberries/consts"; // Adjust the import path if necessary

export const searchRequestsScene = new Scenes.BaseScene<MyContext>('searchRequests');

const listBookingRequests = async (ctx: MyContext, type: string = 'booking') => {
    // Initialize page number in session if not set
    if (!ctx.session.searchRequestsPage) {
        ctx.session.searchRequestsPage = 1;
    }

    logger.info('Entered searchRequestsScene', { session: ctx.scene.session });

    const currentPage = ctx.session.searchRequestsPage;
    const perPage = 1; // As per your requirement

    const typeText = type == 'booking' ? 'автобронь' : 'поиск слотов';

    const messageTextHeader = `🫡 Список активных заявок на ${typeText} (Страница ${currentPage})`;

    try {
        // Fetch paginated notifications
        const paginatedNotifications = await laravelService.getNotificationsByTelegramId(
            ctx.from.id,
            currentPage,
            perPage,
            type
        );

        if (!paginatedNotifications || paginatedNotifications.data.length === 0) {
            const noNotificationsText = `📭 У вас нет активных заявок на ${typeText}.`;
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

        const warehouseName = WAREHOUSES[notification.settings.warehouseId];
        const boxTypeName = BOX_TYPES_TEXT_ONLY[notification.settings.boxTypeId];
        const dateText = notification.settings.checkUntilDate;
        const coefficientName = COEFFICIENTS_TEXT_ONLY[notification.settings.coefficient];
        // Format the notification message
        const messageTextBooking = fmt`
🫡 ${bold`Список активных заявок на ${typeText}`}

${bold`Номер автоброни:`} ${notification.settings.preorderId}
${bold`Кабинет:`} ${notification.cabinet?.name ?? 'Не указан'}
${bold`Склад:`} ${warehouseName} 
${bold`Тип упаковки:`} ${boxTypeName} 
${bold`Время:`} ${dateText}
${bold`Коэффициент:`} ${coefficientName}
${bold`Статус:`} ${notification.status === 'started' ? 'ищем' : (notification.status === 'finished' ? 'нашли' : 'вышло время')}

Страница: ${currentPage} из ${paginatedNotifications.last_page}
`;
        const messageTextSearch = fmt`
🫡 ${bold`Список активных заявок на ${typeText}`}

${bold`Номер поисковой заявки:`} ${notification.id}
${bold`Склад:`} ${warehouseName} 
${bold`Тип упаковки:`} ${boxTypeName} 
${bold`Время:`} ${dateText}
${bold`Коэффициент:`} ${coefficientName}
${bold`Статус:`} ${notification.status === 'started' ? 'ищем' : (notification.status === 'finished' ? 'нашли' : 'вышло время')}

Страница: ${currentPage} из ${paginatedNotifications.last_page}
`;
        const messageText = type === 'booking' ? messageTextBooking : messageTextSearch;


        // Build pagination buttons
        const buttons = [];

        const buttonsPagination = [];

        if (paginatedNotifications.prev_page_url) {
            buttonsPagination.push(Markup.button.callback('⬅️', 'notifications_prev'));
        }

        if (paginatedNotifications.next_page_url) {
            buttonsPagination.push(Markup.button.callback('➡️', 'notifications_next'));
        }

        const buttonDelete = Markup.button.callback('❌ Удалить', 'delete_' + notification.id);

        buttons.push([buttonDelete]);
        buttons.push(buttonsPagination);

        // Always show 'Main Menu' button
        buttons.push([Markup.button.callback('👈 Назад', 'reenter')]);
        buttons.push([Markup.button.callback('👌 Главное меню', 'mainmenu')]);

        const keyboard = Markup.inlineKeyboard(buttons, { columns: 3 });

        if (ctx.callbackQuery && ctx.callbackQuery.message) {
           try {
               // Edit existing message if interaction is from a callback query
               await ctx.editMessageText(messageText, {
                   ...keyboard,
                   parse_mode: 'HTML',
               });
           } catch (error) {
               logger.error('Error sending notifications message:', error);
               await ctx.reply(messageText, {
                   ...keyboard,
                   parse_mode: 'HTML',
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
        await ctx.answerCbQuery('Произошла ошибка при получении заявок.', {
            show_alert: true,
        });
    }
}

const listSearchRequests = async (ctx: MyContext) => {
   await listBookingRequests(ctx, 'search');
}

searchRequestsScene.enter(async (ctx: MyContext) => {
    const messageText = `🫡 Выберите тип заявок для просмотра:`;
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('🔍 Поиск', 'search'),
            Markup.button.callback('🚚 Автобронь', 'booking')
        ],
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            await ctx.editMessageText(messageText, keyboard);
        } catch (error) {
            logger.error('Error sending search requests message:', error);
            await ctx.reply(messageText, keyboard);
        }
    } else {
        await ctx.reply(messageText, keyboard);
    }
});

const searchAction = async (ctx: MyContext) => {
    await listSearchRequests(ctx);
}

const bookingAction = async (ctx: MyContext) => {
    await listBookingRequests(ctx);
}

searchRequestsScene.action('search', async (ctx: MyContext) => {
    ctx.session.searchRequestsPage = 1; // Reset page number
    ctx.session.searchRequestsType = 'search';
    await CacheService.forgetByPattern(`notifications_telegram_id_${ctx.from.id}_page_*`)
    await searchAction(ctx);
});

searchRequestsScene.action('booking', async (ctx: MyContext) => {
    ctx.session.searchRequestsPage = 1; // Reset page number
    ctx.session.searchRequestsType = 'booking';
    await CacheService.forgetByPattern(`notifications_telegram_id_${ctx.from.id}_page_*`)
    await bookingAction(ctx);
});


// Handle 'Next' button callback
searchRequestsScene.action('notifications_next', async (ctx: MyContext) => {
    if (ctx.session.searchRequestsPage) {
        logger.info('Incrementing page number');
        ctx.session.searchRequestsPage += 1;

        if (ctx.session.searchRequestsType === 'booking') {
            await bookingAction(ctx);
        }
        else {
            await searchAction(ctx);
        }
    } else {
        logger.warn('Page number not set');
        // If for some reason the page isn't set, reset to page 1
        ctx.session.searchRequestsPage = 1;
        await ctx.scene.reenter();
    }
});

// Handle 'Previous' button callback
searchRequestsScene.action('notifications_prev', async (ctx: MyContext) => {
    if (ctx.session.searchRequestsPage && ctx.session.searchRequestsPage > 1) {
        ctx.session.searchRequestsPage -= 1;

        if (ctx.session.searchRequestsType === 'booking') {
            await bookingAction(ctx);
        }
        else {
            await searchAction(ctx);
        }
    } else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});

searchRequestsScene.action(/delete_(.*)/, async (ctx) => {
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


searchRequestsScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});