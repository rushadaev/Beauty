import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';

import {enterHandler} from "./salaryActions";

export const salaryScene = new Scenes.BaseScene<MyContext>('salary');

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

// Define the enter handler
salaryScene.enter(async (ctx: MyContext) => {
    await enterHandler(ctx);
});

salaryScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});