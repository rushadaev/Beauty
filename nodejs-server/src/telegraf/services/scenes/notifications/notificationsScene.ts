import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';

import {enterHandler, notificationListHandler} from "./notificationActions";
import {fmt} from "telegraf/format";
import logger from "../../../../utils/logger/loggerTelegram";
import cabinetWizzard from "../createCabinetScene";


export const notifictationsScene = new Scenes.BaseScene<MyContext>('notifications');

// Define the enter handler
notifictationsScene.enter(async (ctx: MyContext) => {
    await enterHandler(ctx);
});


const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];


notifictationsScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
notifictationsScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});

notifictationsScene.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});

notifictationsScene.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('active_notifications');
});