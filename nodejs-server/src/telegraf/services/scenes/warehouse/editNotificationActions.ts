import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";
import {bold, code, fmt} from "telegraf/format";
import logger from "../../../../utils/logger/loggerTelegram";
import LaravelService from "../../../../services/laravelService";
import CacheService from "../../../../utils/redis/Cache/Cache";

const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const enterHandler = async (ctx: MyContext) => {
    const page = ctx.session.page || 1; // Store page in session for navigation
    const perPage = 10; // Adjust perPage if needed

    ctx.scene.session.notificationForm.product_id = null;
    ctx.scene.session.notificationForm.product_name = null;
    ctx.scene.session.notificationForm.sum = null;
    ctx.scene.session.notificationForm.type = null;

    try {
        await CacheService.forgetByPattern(`notifications_product_balance_telegram_id_${ctx.from.id}_page_*`);
        const notificationData = await LaravelService.getNotificationsByTelegramId(ctx.from.id, page, perPage, 'product_balance');

        if (!notificationData || notificationData.data.length === 0) {
            await ctx.reply('Нет доступных товаров.', Markup.inlineKeyboard([
                [Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }

        const { data, current_page, last_page: total } = notificationData;

        // Generate buttons for products
        const buttons = data.map(notification => [
            Markup.button.callback(notification.settings.product_name, `edit_warehouse_product_${notification.id}`)
        ]);

        // Add navigation buttons
        const navigationButtons = [];
        if (current_page > 1) {
            navigationButtons.push(Markup.button.callback('← Назад', `edit_products_page_${current_page - 1}`));
        }
        if (current_page < total) {
            navigationButtons.push(Markup.button.callback('Вперед →', `edit_products_page_${current_page + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }

        buttons.push(...defaultButtonsMenuOnly);

        const message = `Выберите товар чтобы изменить или удалить отслеживание:`
        const keyboard = Markup.inlineKeyboard(buttons);

        try {
            await ctx.editMessageText(message, {
                ...keyboard, // Spread the keyboard markup
                link_preview_options: {
                    is_disabled: true
                },
            });
            await ctx.answerCbQuery('Введите товар');
        } catch (error) {
            logger.error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }

        await ctx.answerCbQuery();
    } catch (error) {
        logger.error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров.', Markup.inlineKeyboard([
            [Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
    return ctx.wizard.next();
};

export const promptForSum = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Назад', 'warehouse_product_' + ctx.scene.session.notificationForm.product_id)],
    ]);

    const product_name = ctx.scene.session.notificationForm.product_name;
    const message = fmt`Введите минимальное количество для товара ${code(product_name)}`;

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Минимальное количество для товара');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }


}

export const promptForAction = async (ctx: MyContext) => {

    const product = await LaravelService.getOneProductByTelegramId(ctx.from.id, ctx.scene.session.notificationForm.product_id);

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Изменить минимальное количество', 'change_minimal_sum')],
        [Markup.button.callback('Удалить уведомление', 'delete_notification')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const amount = product.actual_amounts[0].amount ?? 0;

    const message = fmt`
Название товара - ${code(ctx.scene.session.notificationForm.product_name)} 
Фактическое кол-во на складе - ${code(amount)}
Мин кол-во для уведомления: ${code(ctx.scene.session.notificationForm.sum)}`;

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Выберите действие');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
}

export const promptForDateTime = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Пропустить', 'notification_skip_date')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`Введите дату и время уведомления в формате:
dd.mm.yyyy hh:mm

 ${bold('Текущая дата и время: ')} ${code(ctx.session.notificationForm.dateTime)}
 
 Введите новую дату и время или нажмите пропустить
`;

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Введите дату и время уведомления');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }

    return ctx.wizard.next();
}

export const promptForNotificationType = async (ctx: MyContext) => {
    //keyboard one time or constant notification
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Пропустить', 'notification_skip_type')],
        [Markup.button.callback('Одноразовое уведомление', 'notification_one_time')],
        [Markup.button.callback('Постоянное уведомление', 'notification_constant')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`Уведомление разовое или постоянное?
    
    ${bold('Текущий тип уведомления: ')} ${code(ctx.session.notificationForm.type)}
    
    Выберите тип уведомления или нажмите пропустить
    `;

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Выберите тип уведомления');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }

    return ctx.wizard.next();
}

export const deleteNotification = async (ctx: MyContext) => {
    try {
        await LaravelService.deleteNotification(ctx.scene.session.notificationForm.notification_id);
    } catch (error) {
        logger.error('Error deleting notification:', error);
        await ctx.reply('Произошла ошибка при удалении уведомления. Пожалуйста, попробуйте позже.', Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }

    await ctx.reply('Уведомление удалено', Markup.inlineKeyboard(defaultButtonsMenuOnly));
}

export const sendSuccessMessage = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Все уведомления', 'active_notifications')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`
    Вы установили минимальное количество для товара ${code(ctx.scene.session.notificationForm.product_name)} : ${code(ctx.scene.session.notificationForm.sum)}. 

Как только остаток товара достигнет этого количества, вы получите уведомление.
`;

    try {
        await LaravelService.updateNotificationById(ctx.scene.session.notificationForm.notification_id, ctx.scene.session.notificationForm);
    } catch (error) {
        logger.error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Уведомление создано');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }

}