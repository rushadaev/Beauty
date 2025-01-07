import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import { cabinetGate } from "../../../utils/cabinetGate";
import laravelService from "../../../../services/laravelService";
import { changeDescriptionScene } from './changeDescriptionScene';
import * as fs from 'fs';

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
            Markup.button.callback('изменить время услуги', 'change_service_time') // Добавляем новую кнопку
        ],
        [
            Markup.button.callback('🚪 Выйти из аккаунта', 'logout')
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
            Markup.button.callback('изменить время услуги', 'change_service_time') // Добавляем новую кнопку
        ],
        [
            Markup.button.callback('🚪 Выйти из аккаунта', 'logout')
        ]
    ]);

    await ctx.editMessageText(messageText, mainMenuKeyboard);
});

mainScene.action('change_service_time', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('change_service_time_scene');
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
    const message = `[Мои документы]\n\nНажмите кнопку для получения ваших документов`;
    const documentsKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📄 Получить документы', 'get_documents'),
        ],
        [
            Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]
    ]);
    await ctx.editMessageText(message, documentsKeyboard);
});

mainScene.action('get_documents', async (ctx) => {
    try {
        // Получаем номер телефона из сессии или ctx
        const phone = ctx.session?.phone;
        
        if (!phone) {
            await ctx.reply('Ошибка: не найден номер телефона. Попробуйте перелогиниться.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👌 Главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        // Получаем документы
        const documents = await laravelService.getMasterDocumentsByPhone(phone);
        
        if (documents && documents.length > 0) {
            await ctx.reply('Отправляю ваши документы...');
            
            for (const doc of documents) {
                try {
                    const fileBuffer = await fs.promises.readFile(doc.path);
                    await ctx.replyWithDocument({ 
                        source: fileBuffer,
                        filename: doc.original_name 
                    });
                    // Небольшая задержка между отправкой документов
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (docError) {
                    console.error('Error sending document:', {
                        error: docError,
                        document: doc
                    });
                    await ctx.reply(`Ошибка при отправке документа ${doc.original_name}`);
                }
            }

            await ctx.reply('Все документы отправлены', 
                Markup.inlineKeyboard([[
                    Markup.button.callback('👌 Главное меню', 'mainmenu')
                ]])
            );
        } else {
            await ctx.reply('Документы не найдены.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👌 Главное меню', 'mainmenu')
                ]])
            );
        }
    } catch (error) {
        console.error('Error in get_documents handler:', error);
        await ctx.reply('Произошла ошибка при получении документов.',
            Markup.inlineKeyboard([[
                Markup.button.callback('👌 Главное меню', 'mainmenu')
            ]])
        );
    }
});

mainScene.action('clients_management', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('clients_management_scene');
});

mainScene.action('change_description', async (ctx: MyContext) => {
    await ctx.answerCbQuery();
    // Просто переходим в сцену без отправки сообщения
    return ctx.scene.enter('change_description_scene');
});

mainScene.action('change_photo', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('change_photo_scene');
});

mainScene.action('change_schedule', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('schedule_management');
});