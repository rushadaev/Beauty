import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";
import {code, fmt} from "telegraf/format";
import logger from "../../../../utils/logger/loggerTelegram";
import LaravelService from "../../../../services/laravelService";

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
        const productData = await LaravelService.getProductsByTelegramId(ctx.from.id, page, perPage);

        if (!productData || productData.products.length === 0) {
            await ctx.reply('Нет доступных товаров.', Markup.inlineKeyboard([
                [Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }

        const { products, currentPage, totalPages } = productData;

        // Generate buttons for products
        const buttons = products.map(product => [
            Markup.button.callback(product.title, `warehouse_product_${product.good_id}`)
        ]);

        // Add navigation buttons
        const navigationButtons = [];
        if (currentPage > 1) {
            navigationButtons.push(Markup.button.callback('← Назад', `products_page_${currentPage - 1}`));
        }
        if (currentPage < totalPages) {
            navigationButtons.push(Markup.button.callback('Вперед →', `products_page_${currentPage + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }

        buttons.push(...defaultButtonsMenuOnly);

        const message = 'Выберите товар, для которого нужно отслеживать остаток:';
        const keyboard = Markup.inlineKeyboard(buttons);

        try {
            await ctx.editMessageText(message, {
                ...keyboard, // Spread the keyboard markup
                link_preview_options: {
                    is_disabled: true
                },
            });
            await ctx.answerCbQuery('Введите сумму для оплаты');
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

};


export const promptForSum = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Назад', 'warehouse_notification')],
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

    return ctx.wizard.next();
}

export const promptForDateTime = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`Введите дату и время уведомления в формате:
dd.mm.yyyy hh:mm`;

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
        [Markup.button.callback('Одноразовое уведомление', 'notification_one_time')],
        [Markup.button.callback('Постоянное уведомление', 'notification_constant')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`Уведомление разовое или постоянное?`;

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

export const sendSuccessMessage = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Создать еще', 'create_notification')],
        [Markup.button.callback('Все уведомления', 'active_notifications')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`
    Вы установили минимальное количество для товара ${code(ctx.scene.session.notificationForm.product_name)} : ${code(ctx.scene.session.notificationForm.sum)}. 

Как только остаток товара достигнет этого количества, вы получите уведомление.
`;

    try {
        await LaravelService.createNotificationByTelegramId(ctx.from.id, ctx.scene.session.notificationForm, 'product_balance');
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