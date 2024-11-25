import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";
import {fmt} from "telegraf/format";
import logger from "../../../../utils/logger/loggerTelegram";

const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const enterHandler = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Создать уведомление', 'create_notification')],
        [Markup.button.callback('Активные уведомления', 'active_notifications')],
        [Markup.button.callback('Главное меню', 'mainmenu')],
    ]);

    const message = fmt`что хотите сделать?`

    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Уведомления');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
}

export const notificationListHandler = async (ctx: MyContext) => {

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'reenter')],
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    const message = fmt`Активные уведомления:`


    try {
        await ctx.editMessageText(message, {
            ...keyboard, // Spread the keyboard markup
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('Активные уведомления');
    } catch (error) {
        logger.error('Error sending notification list message:', error);
        await ctx.reply(message, keyboard);
    }
}