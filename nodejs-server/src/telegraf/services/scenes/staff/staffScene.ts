import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';

import {enterHandler, userBlockHandler} from "./staffActions";
import {taskBlockHandler} from "../tasks/tasksActions";
import {tasksScene} from "../tasks/tasksScene";

export const staffScene = new Scenes.BaseScene<MyContext>('staff');

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

// Define the enter handler
staffScene.enter(async (ctx: MyContext) => {
    await enterHandler(ctx);
});

staffScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});

staffScene.action(/^user_(\d+)$/, async (ctx) => {
    const user_id = parseInt(ctx.match[1], 10);
    ctx.scene.session.user_id = user_id;
    return userBlockHandler(ctx);
});