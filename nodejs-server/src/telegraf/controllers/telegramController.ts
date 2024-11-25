import { Telegraf, session, Scenes, Markup } from 'telegraf';
import WarehouseBot from '../services/warehouseBot';
import logger from '../../utils/logger/loggerTelegram'; // Ensure correct path
import { Redis as RedisStore } from '@telegraf/session/redis';
import {MyContext, MySession} from "../types/MyContext";

// Import mainScene from the new file
import { mainScene } from '../services/scenes/mainScene';
import { tasksScene } from '../services/scenes/tasks/tasksScene';
import {cabinetGate} from "../utils/cabinetGate";
import {salaryScene} from "../services/scenes/salary/salaryScene";
import {notifictationsScene} from "../services/scenes/notifications/notificationsScene";
import {employmentScene} from "../services/scenes/employment/employmentScene";
import {warehouseScene} from "../services/scenes/warehouse/warehouseScene";
import {staffScene} from "../services/scenes/staff/staffScene";
import { createNotifictationScene as notificationsCreateNotificationScene } from "../services/scenes/notifications/createNotificationScene";
import { notificationsListScene } from "../services/scenes/notifications/notificationsListScene";
import { editNotificationScene as notificationsEditNotificationScene } from "../services/scenes/notifications/editNotificationScene";

import { createNotifictationScene as warehouseCreateNotificationScene } from "../services/scenes/warehouse/createNotificationScene";
import { editNotificationScene as warehouseEditNotificationScene } from "../services/scenes/warehouse/editNotificationScene";


// If you have other scenes like subscriptionScene, consider importing them similarly


const botToken: string = process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW!;
const bot: Telegraf<MyContext> = new Telegraf(botToken);
const warehouseBot = new WarehouseBot(bot);


const store = RedisStore<MySession>({
    url: 'redis://redis:6379/2',
});

// Initialize the stage with imported scenes
const stage = new Scenes.Stage<MyContext>([
    mainScene,
    tasksScene,
    salaryScene,
    notifictationsScene,
    notificationsCreateNotificationScene,
    notificationsListScene,
    employmentScene,
    warehouseScene,
    staffScene,
    notificationsEditNotificationScene,
    warehouseScene,
    warehouseCreateNotificationScene,
    warehouseEditNotificationScene
]);

// Middleware to log incoming updates
bot.use(session({ store }));
bot.use(stage.middleware());
bot.use(async (ctx: MyContext, next: () => Promise<void>) => {
    logger.info('Received update', { update: ctx.update });
    await next();
});

// Handle /start command
bot.start(async (ctx: MyContext) => {
    const startPayload = ctx.payload;
    await ctx.scene.enter('main');
});

// Handle 'mainmenu' action
bot.action('mainmenu', async (ctx: MyContext) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('🏦Главная');
});

// Handle /ping command
bot.command('ping', (ctx: MyContext) => {
    ctx.reply('pong!');
});

bot.command('autobooking', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'autoBookingWizard');
});

mainScene.action('payments', async (ctx: MyContext) => {
    await ctx.scene.enter('subscriptionWizard');
});

bot.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});

bot.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('active_notifications');
});

bot.action('warehouse_notification', async (ctx) => {
    await ctx.scene.enter('warehouse_create_notification');
});

bot.action('warehouse_list', async (ctx) => {
    await ctx.scene.enter('warehouse_edit_notification');
});

bot.on('callback_query', async (ctx: MyContext) => {
    await ctx.answerCbQuery('👌');
});





export const sendMessageToClient = async (chatId: string, message: string, isButtonAvailable = true) => {

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    try {
        const response = await bot.telegram.sendMessage(chatId, message, isButtonAvailable ? keyboard : null);

        console.log('Message sent to Telegram successfully!', response);
        return true;
    } catch (error: any) {
        console.error('Exception occurred while sending message:', error.message);
        return false;
    }



};
// Export the bot instance
export default bot;
