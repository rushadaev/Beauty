import { Telegraf, session, Scenes, Markup } from 'telegraf';
import WarehouseBot from '../services/warehouseBot';
import logger from '../../utils/logger/loggerTelegram'; // Ensure correct path
import { Redis as RedisStore } from '@telegraf/session/redis';
import {MyContext, MySession} from "../types/MyContext";

// Import mainScene from the new file
import CacheService from '../../utils/redis/Cache/Cache';
import { mainScene } from '../services/scenes/mainScene';
import subscriptionWizard from "../services/scenes/subscriptionScene";
import autoBookingWizard from "../services/scenes/autoBookingScene";
import {searchRequestsScene} from "../services/scenes/searchRequestsScene";
import cabinetWizzard from "../services/scenes/createCabinetScene";
import searchSlotsWizard from "../services/scenes/searchSlotsScene";
import LaravelService from "../../services/laravelService";
import {cabinetGate} from "../utils/cabinetGate";
import showCabinetsScene from "../services/scenes/showCabinetsScene";
import reauthCabinetWizzard from "../services/scenes/reauthCabinetScene";
import axios, {AxiosResponse} from "axios";
import {fmt} from "telegraf/format";

// If you have other scenes like subscriptionScene, consider importing them similarly


const botToken: string = process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW!;
const bot: Telegraf<MyContext> = new Telegraf(botToken);
const warehouseBot = new WarehouseBot(bot);


const store = RedisStore<MySession>({
    url: 'redis://redis:6379/2',
});

// Initialize the stage with imported scenes
const stage = new Scenes.Stage<MyContext>([mainScene, subscriptionWizard, autoBookingWizard, searchRequestsScene, cabinetWizzard, searchSlotsWizard, showCabinetsScene, reauthCabinetWizzard]);

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

    if (startPayload) {
        if(startPayload === 'autobooking') {
            await cabinetGate(ctx, 'autoBookingWizard');
        }
        await ctx.scene.enter('main');
    } else {
        await ctx.scene.enter('main');
    }
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


bot.on('callback_query', async (ctx: MyContext) => {
    await ctx.answerCbQuery('👌');
});

bot.action('autobooking', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'autoBookingWizard');
});


export const createUserCabinetAndNotify = async (chatId: string, message: string, payload: any) => {

    const telegramId = payload.telegramId;
    const name = payload.credentials.name;
    const phoneNumber = payload.credentials.phone;
    const userId = payload.userId;
    const statePath = payload.credentials.statePath;

    try {

        const checkCabinetInCache = await CacheService.get(`reauth_cabinet_${telegramId}`);
        if(checkCabinetInCache) {

            const cabinet = JSON.parse(checkCabinetInCache);

            cabinet.settings.statePath = statePath;
            cabinet.is_active = true;
            await LaravelService.updateCabinetByTelegramId(telegramId, cabinet.id, {name: cabinet.name, settings: cabinet.settings});
            await CacheService.forget(`reauth_cabinet_${telegramId}`);
        } else {
            const cabinet = await LaravelService.createCabinetByTelegramId(telegramId, name, phoneNumber, userId, statePath);
        }
    } catch (error) {
        console.error('Error creating user cabinet:', error);
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('👌 Главное меню', 'mainmenu')],
        ]);
        await bot.telegram.sendMessage(chatId, '⚠️ Ошибка создания кабинета. Пожалуйста, попробуйте еще раз.', keyboard);
    }
    const messageText = fmt`🎉 Авторизация прошла успешно!

🫡 Данные вашего кабинета

📝 Название кабинета: ${name} 
📞 Номер телефона: ${phoneNumber};
    `;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📦 Перейти в автобронирование', 'autobooking')],
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    await bot.telegram.sendMessage(chatId, messageText, keyboard);
};

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
