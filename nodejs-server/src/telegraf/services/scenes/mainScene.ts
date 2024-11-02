import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../types/MyContext';
import CacheService from '../../../utils/redis/Cache/Cache';
import { fmt, link } from 'telegraf/format';
import logger from '../../../utils/logger/loggerTelegram';
import {searchRequestsScene} from "./searchRequestsScene";
import LaravelService from "../../../services/laravelService";
import {cabinetGate} from "../../utils/cabinetGate";

export const mainScene = new Scenes.BaseScene<MyContext>('main');

// Define the enter handler
mainScene.enter(async (ctx: MyContext) => {
    const messageText = `⚡Я автоматически нахожу и бронирую доступные слоты на складах Wildberries. Выбирайте удобный тариф и бронируйте поставки.

Выберите пункт в меню 👇`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📦 Автобронирование', 'autobooking')
        ],
        [
            Markup.button.callback('⚡ Поиск слотов', 'searchslots'),
            Markup.button.callback('🙌 Мои кабинеты', 'cabinets'),
        ],
        [
            Markup.button.callback('📝 Мои задания', 'searchrequests'),

        ],
        [
            Markup.button.callback('💎 Подписка', 'payments'),
            Markup.button.url('💬 Поддержка', 'https://t.me/helpybot_support'),
        ],
        [
            Markup.button.url('📍 Инструкции', 'http://surl.li/awdppl')
        ]
    ]);

    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        }
        catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    } else {
        // Otherwise, send a new message
        await ctx.reply(messageText, mainMenuKeyboard);
    }

});

// Handle 'autobooking' action
mainScene.action('autobooking', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'autoBookingWizard');
});

mainScene.action('searchrequests', async (ctx: MyContext) => {
    await ctx.scene.enter('searchRequests');
});

mainScene.action('searchslots', async (ctx: MyContext) => {
    await ctx.scene.enter('searchSlotsWizard');
});

mainScene.action('cabinets', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'showCabinetsScene');
})
