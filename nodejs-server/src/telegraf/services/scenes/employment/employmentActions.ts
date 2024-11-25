import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";

const defaultButtons = [
    //Посмотреть заявки
    [Markup.button.callback('Заявки', 'viewApplications')],
    //Трудоустроить
    [Markup.button.callback('Трудоустроить', 'employment')],

    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const enterHandler = async (ctx: MyContext) => {
    const messageText = `[трудоустройство]`;

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

export const showApplications = async (ctx: MyContext) => {
    const messageText = `Тут выводим активные заявки на трудоустройство`;

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

export const showEmployment = async (ctx: MyContext) => {
    const messageText = `Перейдите в @Beauty_bot_master_bot по кнопке ниже, чтобы подать заявку на трудоустройство`;

    //@Beauty_bot_master_bot

    const go_to_bot = Markup.button.url('Перейти в бота', 'https://t.me/Beauty_bot_master_bot?start=registration');

    const buttonsArray = Markup.inlineKeyboard([[go_to_bot], ...defaultButtonsMenuOnly]);

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