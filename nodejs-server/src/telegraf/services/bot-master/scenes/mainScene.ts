import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import {cabinetGate} from "../../../utils/cabinetGate";

export const mainScene = new Scenes.BaseScene<MyContext>('main');

// Define the enter handler
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

mainScene.action('education', async (ctx: MyContext) => {

    const message = `[модуль обучения]

ссылка на обучение`

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('перейти к обучению', 'https://t.me/dmitrynovikov21')],
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    await ctx.editMessageText(message, keyboard);

});

mainScene.action('documents', async (ctx: MyContext) => {
    const message = `[Мои документы]

В кнопках выводим три документа из карточки мастера`

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

mainScene.action('clients_management', async (ctx: MyContext) => {
   const message = `[работа с клиентами]`

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
    ctx.reply('Изменить описание');
});

mainScene.action('change_photo', async (ctx: MyContext) => {
    ctx.reply('Изменить фотографию');
});

mainScene.action('change_schedule', async (ctx: MyContext) => {
    ctx.reply('Изменить график работы');
});


