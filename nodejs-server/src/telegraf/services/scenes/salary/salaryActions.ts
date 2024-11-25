import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";

const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const enterHandler = async (ctx: MyContext) => {
    const messageText = `Тут будет расчет зп`;

    const buttonsArray = Markup.inlineKeyboard([...defaultButtonsMenuOnly]);

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