import {Telegraf} from "telegraf";
import {MyContext} from "../types/MyContext";

import CacheService from '../../utils/redis/Cache/Cache';
class WarehouseBot {
    private bot: Telegraf<MyContext>;
    constructor(bot: Telegraf<MyContext>) {
        this.bot = bot;
    }

    async handleStart(chatId: number) {
        const message = "⚡Я автоматически нахожу и бронирую доступные слоты на складах Wildberries. Выбирайте удобный тариф и бронируйте поставки." +
            "\n\nВыберите пункт в меню 👇";

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📦 Автобронирование', callback_data: 'wh_notification' },
                ],
                [
                    { text: '⚡ Поиск слотов', callback_data: 'wh_notification' },
                    { text: '📝 Заявки на поиск слотов', callback_data: 'wh_notification' },
                ],
                [
                    { text: '🙌 Мои кабинеты', callback_data: 'wh_payment' },
                    { text: '💎 Подписка', callback_data: 'wh_payment' },
                ],
                [
                    { text: '💬 Поддержка', url: 'https://t.me/dmitrynovikov21' },
                    { text: '📍 Инструкции', url: 'https://t.me/dmitrynovikov21' },
                ],
            ],
        };

        await this.bot.telegram.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    }

    async fetchUserByTelegramId(telegramId: number) {
        try {
            return await CacheService.getUserByTelegramId(telegramId);
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    // Implement other methods like handleNotification, handlePayment, etc.
}

export default WarehouseBot;
