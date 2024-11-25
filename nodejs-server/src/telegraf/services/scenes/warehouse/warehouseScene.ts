import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';

import {enterHandler} from "./warehouseActions";

export const warehouseScene = new Scenes.BaseScene<MyContext>('warehouse');

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

// Define the enter handler
warehouseScene.enter(async (ctx: MyContext) => {
    await enterHandler(ctx);
});

warehouseScene.action('warehouse_notification', async (ctx: MyContext) => {
    await ctx.scene.enter('warehouse_create_notification');
});

warehouseScene.action('warehouse_list', async (ctx: MyContext) => {
    await ctx.scene.enter('warehouse_edit_notification');
});

warehouseScene.action('reenter', async (ctx: MyContext) => {
    await ctx.scene.reenter();
});