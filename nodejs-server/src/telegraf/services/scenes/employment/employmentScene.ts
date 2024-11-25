import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';

import {enterHandler, showApplications, showEmployment} from "./employmentActions";

export const employmentScene = new Scenes.BaseScene<MyContext>('employment');

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

// Define the enter handler
employmentScene.enter(async (ctx: MyContext) => {
    await enterHandler(ctx);
});

employmentScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});

//viewApplications
//employment
employmentScene.action('viewApplications', async (ctx: MyContext) => {
    await showApplications(ctx);
});

employmentScene.action('employment', async (ctx: MyContext) => {
    await showEmployment(ctx);
});