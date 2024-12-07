import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import { cabinetGate } from "../../../utils/cabinetGate";
import laravelService from "../../../../services/laravelService";
import { changeDescriptionScene } from './changeDescriptionScene';

export const mainScene = new Scenes.BaseScene<MyContext>('main');

mainScene.enter(async (ctx: MyContext) => {
    const messageText = `[главный экран для мастеров]`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('обучение', 'education'),
        ],
        [
            Markup.button.callback('мои документы', 'documents'),
            Markup.button.callback('работа с клиентами', 'clients_management'),
        ],
        [
            Markup.button.callback('изменить описание', 'change_description'),
        ],
        [
            Markup.button.callback('изменить фотографию', 'change_photo'),
            Markup.button.callback('изменить график работы', 'change_schedule'),
        ],
        [
            Markup.button.callback('🚪 Выйти из аккаунта', 'logout')  // Добавляем кнопку выхода
        ]
    ]);

    if (ctx.callbackQuery?.message) {
        try {
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        }
        catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    } else {
        await ctx.reply(messageText, mainMenuKeyboard);
    }
});

// Обработчик выхода
mainScene.action('logout', async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery('Выходим из аккаунта...');
        
        // Сначала спрашиваем подтверждение
        const confirmKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Да, выйти', 'confirm_logout'),
                Markup.button.callback('❌ Отмена', 'cancel_logout')
            ]
        ]);

        await ctx.editMessageText(
            'Вы уверены, что хотите выйти из аккаунта?',
            confirmKeyboard
        );
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Подтверждение выхода
mainScene.action('confirm_logout', async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery();
        
        // Очищаем данные на бэкенде
        const telegramId = ctx.from?.id;
        if (telegramId) {
            try {
                await laravelService.logout(telegramId);
            } catch (error) {
                // Логируем ошибку, но продолжаем процесс выхода
                console.error('Ошибка при очистке данных на бэкенде:', error);
            }
        }

        // Показываем сообщение об успешном выходе в любом случае
        await ctx.editMessageText(
            'Вы успешно вышли из аккаунта.',
            Markup.inlineKeyboard([
                [Markup.button.callback('Войти снова', 'start_login')]
            ])
        );

        // Переходим на сцену логина
        
        return ctx.scene.enter('login_wizard');

    } catch (error) {
        console.error('Ошибка при выходе:', error);
        await ctx.reply('Произошла ошибка. Попробуйте еще раз через несколько секунд.');
        
        // В случае ошибки всё равно пытаемся вернуться к логину
        return ctx.scene.enter('login_wizard');
    }
});

// Отмена выхода
mainScene.action('cancel_logout', async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery('Отменено');
        return ctx.scene.reenter(); // Возвращаемся в главное меню
    } catch (error) {
        console.error('Ошибка при отмене выхода:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

mainScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    const messageText = `[главный экран для мастеров]`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('обучение', 'education'),
        ],
        [
            Markup.button.callback('мои документы', 'documents'),
            Markup.button.callback('работа с клиентами', 'clients_management'),
        ],
        [
            Markup.button.callback('изменить описание', 'change_description'),
        ],
        [
            Markup.button.callback('изменить фотографию', 'change_photo'),
            Markup.button.callback('изменить график работы', 'change_schedule'),
        ],
        [
            Markup.button.callback('🚪 Выйти из аккаунта', 'logout')  // Добавляем кнопку выхода
        ]
    ]);

    await ctx.editMessageText(messageText, mainMenuKeyboard);
});

// Остальные обработчики остаются без изменений
mainScene.action('education', async (ctx) => {
    const message = `[модуль обучения]\n\nссылка на обучение`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('перейти к обучению', 'https://t.me/dmitrynovikov21')],
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    await ctx.editMessageText(message, keyboard);
});

mainScene.action('documents', async (ctx) => {
    const message = `[Мои документы]\n\nВ кнопках выводим три документа из карточки мастера`;
    const documentsKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('документ 1', 'document_1'),
            Markup.button.callback('документ 2', 'document_2'),
        ],
        [
            Markup.button.callback('документ 3', 'document_3'),
        ],
        [
            Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]
    ]);
    await ctx.editMessageText(message, documentsKeyboard);
});

mainScene.action('clients_management', async (ctx) => {
    const message = `[работа с клиентами]`;
    const clientsManagementKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('изменить время услуги', 'change_service_time'),
            Markup.button.callback('удалить услугу из заказа', 'delete_service_from_order'),
        ],
        [
            Markup.button.callback('добавить услугу в заказ', 'add_service_to_order'),
        ],
        [
            Markup.button.callback('изменить номер телефона', 'change_phone_number'),
            Markup.button.callback('изменить состав заказа', 'change_order_content'),
        ],
        [
            Markup.button.callback('отменить запись клиента', 'cancel_client_booking'),
        ],
        [
            Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]
    ]);
    await ctx.editMessageText(message, clientsManagementKeyboard);
});

mainScene.action('change_description', async (ctx: MyContext) => {
    await ctx.answerCbQuery();
    // Просто переходим в сцену без отправки сообщения
    return ctx.scene.enter('change_description_scene');
});

mainScene.action('change_photo', async (ctx) => {
    ctx.reply('Изменить фотографию');
});

mainScene.action('change_schedule', async (ctx) => {
    ctx.reply('Изменить график работы');
});