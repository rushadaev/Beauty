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
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = fmt`Создать уведомление

Введите данные по уведомлению: 
${code('Название уведомления')}`;

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Введите название уведомления');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }

    return ctx.wizard.next();
}

export const promptForSum = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Пропустить', 'notification_skip_sum')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`Какая сумма для оплаты?
(если суммы нет, то пропустите это поле)`;

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

    const message = fmt`Уведомление создано
${code('Название уведомления')}: ${ctx.scene.session.notificationForm.name}
${code('Сумма для оплаты')}: ${ctx.scene.session.notificationForm.sum}
${code('Дата и время уведомления')}: ${ctx.scene.session.notificationForm.dateTime}
${code('Тип уведомления')}: ${ctx.scene.session.notificationForm.type}`;

    try {
        await LaravelService.createNotificationByTelegramId(ctx.from.id, ctx.scene.session.notificationForm);
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