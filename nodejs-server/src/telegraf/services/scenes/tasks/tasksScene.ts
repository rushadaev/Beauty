import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';

import {enterHandler, taskBlockHandler} from "./tasksActions";
import {createNotifictationScene} from "../warehouse/createNotificationScene";
import laravelService from "../../../../services/laravelService";

export const tasksScene = new Scenes.BaseScene<MyContext>('tasks');

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

// Define the enter handler
tasksScene.enter(async (ctx: MyContext) => {
    await enterHandler(ctx);
});

tasksScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});

tasksScene.action(/^products_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    ctx.session.page = page;
    return enterHandler(ctx); // Reload the handler with the new page
});

//task_(*
tasksScene.action(/^task_(\d+)$/, async (ctx) => {
    const task_id = parseInt(ctx.match[1], 10);
    ctx.scene.session.task_id = task_id;
    return taskBlockHandler(ctx);
});

tasksScene.action('close_task', async (ctx) => {
    const task_id = ctx.scene.session.task_id;

    laravelService.closeTask(task_id, ctx.from.id);
    // Close the task
    await ctx.reply('Задача закрыта');
});