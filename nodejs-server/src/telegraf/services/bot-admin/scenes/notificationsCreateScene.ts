import { Scenes, Markup } from 'telegraf';
import { MyContext, NotificationForm } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from '../../../../services/laravelService';

interface NotificationResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export const notificationsCreateScene = new Scenes.BaseScene<MyContext>('notifications_create_scene');

// Обработчик входа в сцену
notificationsCreateScene.enter(async (ctx) => {
    // Инициализируем структуру уведомления
    ctx.session.notificationForm = {
        name: '',
        sum: '',
        dateTime: '',
        type: '',
        frequency: '', // daily, weekly, monthly, custom
        frequency_value: '', // Для custom: количество дней
        created_at: new Date().toISOString()
    };

    await ctx.reply(
        'Введите название уведомления\n\nПример: Оплатить аренду помещения',
        Markup.inlineKeyboard([
            [Markup.button.callback('👈 Назад', 'back_to_notifications')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ])
    );
});

// Обработчик текстовых сообщений
notificationsCreateScene.on('text', async (ctx) => {
    if (!ctx.session.notificationForm) {
        await ctx.scene.reenter();
        return;
    }

    const form = ctx.session.notificationForm;

    try {
        // Этап ввода названия
        if (!form.name) {
            form.name = ctx.message.text;
            await ctx.reply(
                'Какая сумма для оплаты?\n\nЕсли сумма не требуется, введите 0',
                Markup.inlineKeyboard([
                    [Markup.button.callback('👈 Назад', 'reset_name')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        // Этап ввода суммы
        if (!form.sum && form.sum !== '0') {
            const sum = Number(ctx.message.text);
            if (isNaN(sum) || sum < 0) {
                await ctx.reply('Пожалуйста, введите положительное число или 0');
                return;
            }
            form.sum = sum.toString();
            await ctx.reply(
                'Введите дату и время уведомления\n\nФормат: ДД.ММ.ГГГГ ЧЧ:ММ\nПример: 25.12.2024 15:00',
                Markup.inlineKeyboard([
                    [Markup.button.callback('👈 Назад', 'reset_sum')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        // Этап ввода даты и времени
        if (!form.dateTime) {
            const dateTimeRegex = /^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/;
            const match = ctx.message.text.match(dateTimeRegex);
            
            if (!match) {
                await ctx.reply(
                    'Неверный формат даты и времени!\n\n' +
                    'Используйте формат: ДД.ММ.ГГГГ ЧЧ:ММ\n' +
                    'Например: 25.12.2024 15:00'
                );
                return;
            }

            const [_, day, month, year, hour, minute] = match;
            const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

            if (date < new Date()) {
                await ctx.reply('Дата и время не могут быть в прошлом');
                return;
            }

            form.dateTime = ctx.message.text;
            
            // Запрашиваем тип уведомления
            await ctx.reply(
                'Уведомление разовое или повторяющееся?',
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback('⚡️ Разовое', 'type_single'),
                        Markup.button.callback('🔄 Повторяющееся', 'type_recurring')
                    ],
                    [Markup.button.callback('👈 Назад', 'reset_datetime')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        // Этап ввода значения для кастомной периодичности
        if (form.type === 'recurring' && form.frequency === 'custom' && !form.frequency_value) {
            const days = parseInt(ctx.message.text);
            if (isNaN(days) || days <= 0 || days > 365) {
                await ctx.reply('Пожалуйста, введите число от 1 до 365');
                return;
            }
            
            form.frequency_value = days.toString();
            await createNotification(ctx);
        }

    } catch (error) {
        logger.error('Error in notifications create scene:', error);
        await ctx.reply(
            '❌ Произошла ошибка. Попробуйте начать сначала.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Начать сначала', 'restart')],
                [Markup.button.callback('👈 Назад', 'back_to_notifications')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    }
});

// Обработчики типа уведомления
notificationsCreateScene.action('type_single', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.type = 'single';
    await createNotification(ctx);
});

notificationsCreateScene.action('type_recurring', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.type = 'recurring';
    
    await ctx.reply(
        'Выберите периодичность уведомления:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📅 Каждый день', 'frequency_daily')],
            [Markup.button.callback('📅 Каждую неделю', 'frequency_weekly')],
            [Markup.button.callback('📅 Каждый месяц', 'frequency_monthly')],
            [Markup.button.callback('📅 Указать свой период', 'frequency_custom')],
            [Markup.button.callback('👈 Назад', 'reset_type')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ])
    );
});

// Обработчики периодичности
notificationsCreateScene.action(['frequency_daily', 'frequency_weekly', 'frequency_monthly'], async (ctx) => {
    await ctx.answerCbQuery();
    const frequencyMap: Record<string, NotificationForm['frequency']> = {
        'frequency_daily': 'daily',
        'frequency_weekly': 'weekly',
        'frequency_monthly': 'monthly'
    };
    
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        const frequency = frequencyMap[data];
        if (frequency) {
            ctx.session.notificationForm.frequency = frequency;
        }
    }
    await createNotification(ctx);
});

notificationsCreateScene.action('frequency_custom', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.frequency = 'custom';
    
    await ctx.reply(
        'Введите количество дней между уведомлениями (от 1 до 365):',
        Markup.inlineKeyboard([
            [Markup.button.callback('👈 Назад', 'reset_frequency')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ])
    );
});

// Функция создания уведомления
async function createNotification(ctx: MyContext) {
    try {
        const form = ctx.session.notificationForm;
        
        if (!form) {
            throw new Error('Notification form is empty');
        }

        const result = await LaravelService.createNotificationByTelegramId(
            ctx.from.id,
            ctx.session.notificationForm
        ) as NotificationResponse;

        if (!result?.success) {
            throw new Error(result?.message || 'Failed to create notification');
        }

        const message = `✅ Уведомление успешно создано!\n\n` +
            `📝 Название: ${form.name}\n` +
            `💰 Сумма: ${form.sum === '0' ? 'не указана' : form.sum + ' руб.'}\n` +
            `🕐 Время: ${form.dateTime}\n` +
            `🔄 Тип: ${form.type === 'single' ? 'разовое' : 'повторяющееся'}`;

        await ctx.reply(
            message,
            Markup.inlineKeyboard([
                [Markup.button.callback('📝 Создать ещё', 'create_another')],
                [Markup.button.callback('📋 К списку уведомлений', 'back_to_notifications')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );

    } catch (error) {
        logger.error('Error creating notification:', error);
        await ctx.reply(
            '❌ Ошибка при создании уведомления',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Попробовать снова', 'restart')],
                [Markup.button.callback('👈 Назад', 'back_to_notifications')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    }
}

// Обработчики навигации и сброса данных
notificationsCreateScene.action('reset_name', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.name = '';
    await ctx.scene.reenter();
});

notificationsCreateScene.action('reset_sum', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.sum = '';
    await ctx.reply('Какая сумма для оплаты?\n\nЕсли сумма не требуется, введите 0');
});

notificationsCreateScene.action('reset_datetime', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.dateTime = '';
    await ctx.reply(
        'Введите дату и время уведомления\n\nФормат: ДД.ММ.ГГГГ ЧЧ:ММ\nПример: 25.12.2024 15:00'
    );
});

notificationsCreateScene.action('reset_type', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.type = '';
    await ctx.reply(
        'Уведомление разовое или повторяющееся?',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('⚡️ Разовое', 'type_single'),
                Markup.button.callback('🔄 Повторяющееся', 'type_recurring')
            ],
            [Markup.button.callback('👈 Назад', 'reset_datetime')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ])
    );
});

notificationsCreateScene.action('reset_frequency', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.frequency = '';
    ctx.session.notificationForm.type = 'recurring';
    
    await ctx.reply(
        'Выберите периодичность уведомления:',
        Markup.inlineKeyboard([
            [Markup.button.callback('📅 Каждый день', 'frequency_daily')],
            [Markup.button.callback('📅 Каждую неделю', 'frequency_weekly')],
            [Markup.button.callback('📅 Каждый месяц', 'frequency_monthly')],
            [Markup.button.callback('📅 Указать свой период', 'frequency_custom')],
            [Markup.button.callback('👈 Назад', 'reset_type')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ])
    );
});

// Общие обработчики навигации
notificationsCreateScene.action('create_another', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
});

notificationsCreateScene.action('back_to_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_management');
});

notificationsCreateScene.action('restart', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
});

notificationsCreateScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

export default notificationsCreateScene;