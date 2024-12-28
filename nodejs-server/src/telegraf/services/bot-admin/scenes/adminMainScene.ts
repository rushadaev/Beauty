import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import CacheService from '../../../../utils/redis/Cache/Cache';
import { fmt, link } from 'telegraf/format';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from "../../../../services/laravelService";
import { cabinetGate } from "../../../utils/cabinetGate";

export const adminMainScene = new Scenes.BaseScene<MyContext>('admin_main');

adminMainScene.enter(async (ctx: MyContext) => {
    // Получаем имя пользователя из сессии, если есть
    
    
    const messageText = fmt`
🏢 *Панель управления CherryTown*

👋 Добро пожаловать!

📊 *Доступные функции:*
- Управление персоналом и трудоустройство
- Контроль выполнения задач
- Расчёт заработной платы
- Управление складом и остатками
- Система уведомлений
- Работа с клиентами

ℹ️ Выберите нужный раздел:`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('👥 Управление персоналом', 'staff'),
            Markup.button.callback('📋 Задачи', 'tasks'),
        ],
        [
            Markup.button.callback('💰 Расчет ЗП', 'salary'),
            Markup.button.callback('🏪 Управление складом', 'warehouse'),
        ],
        [
            Markup.button.callback('🔔 Уведомления', 'notifications'),
            Markup.button.callback('👥 Трудоустройство', 'employment'),
        ],
        [
            Markup.button.callback('🚪 Выйти из аккаунта', 'logout')
        ]
    ]);

    try {
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(messageText, {
                ...mainMenuKeyboard,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.reply(messageText, {
                ...mainMenuKeyboard,
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        logger.error('Error in adminMainScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке главного меню. Попробуйте еще раз.');
    }
});

// Обработчик выхода
adminMainScene.action('logout', async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery('Выходим из аккаунта...');
        
        const confirmKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, выйти', 'confirm_logout'),
                Markup.button.callback('❌ Отмена', 'cancel_logout')
            ]
        ]);

        await ctx.editMessageText(
            '❓ Вы уверены, что хотите выйти из аккаунта?',
            confirmKeyboard
        );
    } catch (error) {
        logger.error('Error in logout handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Подтверждение выхода
adminMainScene.action('confirm_logout', async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery();
        
        const telegramId = ctx.from?.id;
        if (telegramId) {
            try {
                await LaravelService.logout(telegramId);
            } catch (error) {
                logger.error('Error during backend logout:', error);
            }
        }

       

        await ctx.editMessageText(
            '👋 Вы успешно вышли из аккаунта.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔑 Войти снова', 'start_login')]
            ])
        );
        
        return ctx.scene.enter('admin_login_wizard');

    } catch (error) {
        logger.error('Error in confirm_logout handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте еще раз через несколько секунд.');
        return ctx.scene.enter('admin_login_wizard');
    }
});

// Отмена выхода
adminMainScene.action('cancel_logout', async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery('Отменено');
        return ctx.scene.reenter();
    } catch (error) {
        logger.error('Error in cancel_logout handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Обработчики переходов в другие сцены
adminMainScene.action('tasks', async (ctx: MyContext) => {
    await ctx.answerCbQuery('📋 Переходим к задачам...');
    await ctx.scene.enter('tasks');
});

adminMainScene.action('salary', async (ctx: MyContext) => {
    await ctx.answerCbQuery('💰 Расчет зарплаты...');
    await ctx.scene.enter('salary');
});

adminMainScene.action('notifications', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_management');
});

adminMainScene.action('employment', async (ctx: MyContext) => {
    await ctx.answerCbQuery('👥 Трудоустройство...');
    await ctx.scene.enter('employment');
});

adminMainScene.action('warehouse', async (ctx) => {
    await ctx.answerCbQuery('🏪 Управление складом...');
    return ctx.scene.enter('warehouse'); // Теперь переходим в основное меню склада
});

adminMainScene.action('staff', async (ctx: MyContext) => {
    await ctx.answerCbQuery('👥 Управление персоналом...');
    await ctx.scene.enter('staff');
});

// Обработчик возврата в главное меню
adminMainScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery('🏠 Главное меню');
    return ctx.scene.reenter();
});

// Обработка ошибок
adminMainScene.use(async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        logger.error('Error in adminMainScene:', error);
        await ctx.reply(
            'Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Вернуться в главное меню', 'mainmenu')]
            ])
        );
    }
});