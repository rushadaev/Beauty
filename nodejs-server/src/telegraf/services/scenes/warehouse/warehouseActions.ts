import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";

const defaultButtons = [
    [Markup.button.callback('Уведомление на остаток', 'warehouse_notification')],
    [Markup.button.callback('Работа с остатком', 'warehouse_list')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const enterHandler = async (ctx: MyContext) => {
    ctx.session.page = 1; // Store page in session for navigation
    const messageText = `Выберите действие`;

    const buttonsArray = Markup.inlineKeyboard([...defaultButtons]);

    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, buttonsArray);
        }
        catch (error) {
            await ctx.reply(messageText, buttonsArray);
        }
    } else {
        await ctx.reply(messageText, buttonsArray);
    }
}