import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';

export const warehouseScene = new Scenes.BaseScene<MyContext>('warehouse');

warehouseScene.enter(async (ctx) => {
    try {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📝 Уведомление на остаток', 'create_notification')],
            [Markup.button.callback('📋 Работа с остатком', 'manage_notifications')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);

        const messageText = 'Выберите действие:';
        
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(messageText, keyboard);
        } else {
            await ctx.reply(messageText, keyboard);
        }
    } catch (error) {
        logger.error('Error in warehouseScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке меню');
    }
});

// Перенаправление на создание уведомления
warehouseScene.action('create_notification', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('select_branch_scene');
});

// Перенаправление на управление существующими уведомлениями
warehouseScene.action('manage_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse_notifications_list');
});

warehouseScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});

export default warehouseScene;