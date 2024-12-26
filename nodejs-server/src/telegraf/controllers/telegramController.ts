import { Telegraf, session, Scenes, Markup } from 'telegraf';
import WarehouseBot from '../services/warehouseBot';
import logger from '../../utils/logger/loggerTelegram';
import { Redis as RedisStore } from '@telegraf/session/redis';
import { MyContext, MySession } from "../types/MyContext";

// Импорты сцен управляющего
import { adminMainScene } from '../services/bot-admin/scenes/adminMainScene';
import { tasksScene } from '../services/scenes/tasks/tasksScene';
import { cabinetGate } from "../utils/cabinetGate";
import { salaryScene } from "../services/scenes/salary/salaryScene";
import { notifictationsScene } from "../services/scenes/notifications/notificationsScene";
import { employmentScene } from "../services/scenes/employment/employmentScene";
import { warehouseScene } from "../services/scenes/warehouse/warehouseScene";
import { staffScene } from "../services/scenes/staff/staffScene";
import { adminLoginWizard } from '../services/bot-admin/scenes/adminLoginWizard';

// Импорты сцен уведомлений
import { createNotifictationScene as notificationsCreateNotificationScene } from "../services/scenes/notifications/createNotificationScene";
import { notificationsListScene } from "../services/scenes/notifications/notificationsListScene";
import { editNotificationScene as notificationsEditNotificationScene } from "../services/scenes/notifications/editNotificationScene";

// Импорты сцен склада
import { createNotifictationScene as warehouseCreateNotificationScene } from "../services/scenes/warehouse/createNotificationScene";
import { editNotificationScene as warehouseEditNotificationScene } from "../services/scenes/warehouse/editNotificationScene";

const botToken: string = process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW!;
const bot: Telegraf<MyContext> = new Telegraf(botToken);
const warehouseBot = new WarehouseBot(bot);

const store = RedisStore<MySession>({
    url: 'redis://redis:6379/2',
});

// Инициализация stage со всеми сценами
const stage = new Scenes.Stage<MyContext>([
    adminLoginWizard,
    adminMainScene,
    tasksScene,
    salaryScene,
    notifictationsScene,
    notificationsCreateNotificationScene,
    notificationsListScene,
    employmentScene,
    warehouseScene,
    staffScene,
    notificationsEditNotificationScene,
    warehouseCreateNotificationScene,
    warehouseEditNotificationScene
]);

// Middleware
bot.use(session({ store }));
bot.use(stage.middleware());
bot.use(async (ctx: MyContext, next: () => Promise<void>) => {
    logger.info('Received update', { update: ctx.update });
    await next();
});

// Обработка команды /start
bot.start(async (ctx: MyContext) => {
    await ctx.scene.enter('admin_login_wizard');
});

// Обработка действия 'mainmenu'
bot.action('mainmenu', async (ctx: MyContext) => {
    await ctx.scene.enter('admin_main');
    await ctx.answerCbQuery('🏦 Главное меню');
});

// Обработка команды /ping
bot.command('ping', (ctx: MyContext) => {
    ctx.reply('pong!');
});

// Обработчики уведомлений
bot.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});

bot.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('active_notifications');
});

// Обработчики склада
bot.action('warehouse_notification', async (ctx) => {
    await ctx.scene.enter('warehouse_create_notification');
});

bot.action('warehouse_list', async (ctx) => {
    await ctx.scene.enter('warehouse_edit_notification');
});

// Общий обработчик callback_query
bot.on('callback_query', async (ctx: MyContext) => {
    await ctx.answerCbQuery('👌');
});

// Функция отправки сообщений клиенту
export const sendMessageToClient = async (chatId: string, message: string, isButtonAvailable = true) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    try {
        const response = await bot.telegram.sendMessage(
            chatId, 
            message, 
            isButtonAvailable ? { reply_markup: keyboard.reply_markup } : {}
        );
        logger.info('Message sent to Telegram successfully!', response);
        return true;
    } catch (error: any) {
        logger.error('Exception occurred while sending message:', error.message);
        return false;
    }
};

export default bot;