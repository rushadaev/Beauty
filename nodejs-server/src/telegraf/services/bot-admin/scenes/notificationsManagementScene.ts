import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from '../../../../services/laravelService';

export const notificationsManagementScene = new Scenes.BaseScene<MyContext>('notifications_management');

notificationsManagementScene.enter(async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📝 Создать уведомление', 'create_notification')],
        [Markup.button.callback('📋 Активные уведомления', 'active_notifications')],
        [Markup.button.callback('👈 Назад', 'back_to_main')],
        [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]);

    await ctx.reply(
        'Управление уведомлениями\n\n' +
        'Здесь вы можете создавать напоминания и просматривать активные уведомления.',
        keyboard
    );
});

// Обработчик кнопки создания нового уведомления
notificationsManagementScene.action('create_notification', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_create_scene');
});

// Обработчик кнопки просмотра активных уведомлений
notificationsManagementScene.action('active_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_list_scene');
});

// Обработчик кнопки "Назад"
notificationsManagementScene.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

// Обработчик кнопки "Главное меню"
notificationsManagementScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

export default notificationsManagementScene;