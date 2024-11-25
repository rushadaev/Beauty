import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../types/MyContext';
import CacheService from '../../../utils/redis/Cache/Cache';
import { fmt, link } from 'telegraf/format';
import logger from '../../../utils/logger/loggerTelegram';
import {searchRequestsScene} from "./searchRequestsScene";
import LaravelService from "../../../services/laravelService";
import {cabinetGate} from "../../utils/cabinetGate";

export const mainScene = new Scenes.BaseScene<MyContext>('main');

// Define the enter handler
mainScene.enter(async (ctx: MyContext) => {
    const messageText = `главный экран для управляющего`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('задачи', 'tasks')
        ],
        [
            Markup.button.callback('расчет зп', 'salary'),
            Markup.button.callback('уведомления', 'notifications'),
        ],
        [
            Markup.button.callback('трудоустройство', 'employment'),

        ],
        [
            Markup.button.callback('управление складом', 'warehouse'),
            Markup.button.callback('управление персоналом', 'staff'),
        ]
    ]);

    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        }
        catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    } else {
        // Otherwise, send a new message
        await ctx.reply(messageText, mainMenuKeyboard);
    }

});

// Handle 'autobooking' action
mainScene.action('tasks', async (ctx: MyContext) => {
  await ctx.scene.enter('tasks');
});

mainScene.action('salary', async (ctx: MyContext) => {
    await ctx.scene.enter('salary');
});

mainScene.action('notifications', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'notifications');
});

mainScene.action('employment', async (ctx: MyContext) => {
    await ctx.scene.enter('employment');
});
mainScene.action('warehouse', async (ctx: MyContext) => {
    await ctx.scene.enter('warehouse');
});
mainScene.action('staff', async (ctx: MyContext) => {
    await ctx.scene.enter('staff');
});

mainScene.action('cabinets', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'showCabinetsScene');
})
