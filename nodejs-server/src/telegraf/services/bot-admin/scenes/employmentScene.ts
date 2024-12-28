import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import LaravelService from "../../../../services/laravelService";
import * as fs from 'fs';

export const employmentScene = new Scenes.BaseScene<MyContext>('employment');

// Функция для отображения главного меню трудоустройства
const showEmploymentMenu = async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📋 Активные заявки', 'show_applications')],
        [Markup.button.callback('➕ Трудоустроить', 'add_employee')],
        [Markup.button.callback('« Назад', 'mainmenu')]
    ]);

    const text = '👥 Управление трудоустройством\n\nВыберите действие:';
    
    if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(text, keyboard);
    } else {
        await ctx.reply(text, keyboard);
    }
};

// Вход в сцену
employmentScene.enter(async (ctx) => {
    
    await showEmploymentMenu(ctx);
});

// Обработчик для показа активных заявок
employmentScene.action('show_applications', async (ctx) => {
    try {
        const applications = await LaravelService.getActiveRegistrations();
        console.log('Received applications:', applications); // Добавим лог

        if (!applications || applications.length === 0) {
            await ctx.editMessageText(
                '📝 Активные заявки отсутствуют',
                Markup.inlineKeyboard([[Markup.button.callback('« Назад', 'back_to_employment')]])
            );
            return;
        }

        const buttons = applications.map(app => ([
            Markup.button.callback(
                `👤 ${app.short_name}`, 
                `view_application_${app.id}`
            )
        ]));
        
        buttons.push([Markup.button.callback('« Назад', 'back_to_employment')]);

        await ctx.editMessageText(
            '📋 Активные заявки на трудоустройство:',
            Markup.inlineKeyboard(buttons)
        );
    } catch (error) {
        console.error('Error fetching applications:', error);
        await ctx.reply('Произошла ошибка при получении заявок.');
    }
});

// Обработчик просмотра конкретной заявки
employmentScene.action(/^view_application_(\d+)$/, async (ctx) => {
    try {
        const applicationId = ctx.match[1];
        const application = await LaravelService.getRegistrationDetails(applicationId);

        // Форматируем дату из ISO в DD.MM.YYYY
        const formattedDate = application.has_med_book && application.med_book_expiry 
            ? new Date(application.med_book_expiry).toLocaleDateString('ru-RU') 
            : '';

        const messageText = `
👤 Заявка на трудоустройство

ФИО: ${application.full_name}
Телефон: ${application.phone}
Email: ${application.email}
Филиал: ${application.branch_name}
Ставка: ${application.master_price}%

🏥 Мед. книжка: ${application.has_med_book ? '✅' : '❌'}
${application.has_med_book ? `Срок действия до: ${formattedDate}` : ''}
📜 Сертификат: ${application.has_education_cert ? '✅' : '❌'}

🏦 Самозанятый: ${application.is_self_employed ? '✅' : '❌'}
`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Принять', `approve_${applicationId}`),
                Markup.button.callback('❌ Отказать', `reject_${applicationId}`)
            ],
            [Markup.button.callback('📄 Проверить документы', `check_docs_${applicationId}`)],
            [Markup.button.callback('« К списку заявок', 'show_applications')]
        ]);

        await ctx.editMessageText(messageText, keyboard);
    } catch (error) {
        console.error('Error viewing application:', error);
        await ctx.reply('Произошла ошибка при просмотре заявки.');
    }
});

// Обработка проверки документов
// Обработка проверки документов
employmentScene.action(/^check_docs_(\d+)$/, async (ctx) => {
    const applicationId = ctx.match[1];
    try {
        const documents = await LaravelService.getRegistrationDocuments(applicationId);
        
        if (documents && documents.length > 0) {
            for (const doc of documents) {
                try {
                    const fileBuffer = await fs.promises.readFile(doc.path);
                    await ctx.replyWithDocument({ 
                        source: fileBuffer,
                        filename: doc.original_name 
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (docError) {
                    console.error('Error sending document:', {
                        error: docError,
                        document: doc
                    });
                    await ctx.reply(`Ошибка при отправке документа ${doc.original_name}`);
                }
            }

            // Добавляем сообщение с кнопкой возврата после отправки всех документов
            await ctx.reply('Все документы отправлены', 
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к заявке', `view_application_${applicationId}`)
                ]])
            );
        } else {
            await ctx.reply('Документы еще не были загружены кандидатом.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к заявке', `view_application_${applicationId}`)
                ]])
            );
        }
    } catch (error) {
        console.error('Error fetching documents:', error);
        await ctx.reply('Произошла ошибка при получении документов.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад к заявке', `view_application_${applicationId}`)
            ]])
        );
    }
});

// Обработчики принятия/отказа
employmentScene.action(/^approve_(\d+)$/, async (ctx) => {
    const applicationId = ctx.match[1];
    try {
        await LaravelService.approveRegistration(applicationId);
        await ctx.answerCbQuery('✅ Кандидат успешно принят на работу');
        await ctx.scene.reenter();
    } catch (error) {
        console.error('Error approving application:', error);
        await ctx.reply('Произошла ошибка при одобрении заявки.');
    }
});

employmentScene.action(/^reject_(\d+)$/, async (ctx) => {
    const applicationId = ctx.match[1];
    try {
        await LaravelService.rejectRegistration(applicationId);
        await ctx.answerCbQuery('❌ Заявка отклонена');
        await ctx.scene.reenter();
    } catch (error) {
        console.error('Error rejecting application:', error);
        await ctx.reply('Произошла ошибка при отклонении заявки.');
    }
});

// Обработчик добавления нового сотрудника
employmentScene.action('add_employee', async (ctx) => {
    const text = `
📝 Инструкция по трудоустройству нового мастера:

1️⃣ Отправьте кандидату ссылку на бота:
@testmaster031224_bot

2️⃣ Кандидату необходимо:
- Запустить бота командой /start
- Пройти процесс регистрации
- Загрузить необходимые документы

❗️ После загрузки документов заявка появится в разделе "Активные заявки"
    `;

    const keyboard = Markup.inlineKeyboard([[
        Markup.button.callback('« Назад', 'back_to_employment')
    ]]);

    await ctx.editMessageText(text, keyboard);
});

// Обработчики навигации
employmentScene.action('back_to_employment', async (ctx) => {
    await ctx.answerCbQuery();
    await showEmploymentMenu(ctx);
});

employmentScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

// Обработка ошибок
employmentScene.use(async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        console.error('Error in employmentScene:', error);
        await ctx.reply(
            'Произошла ошибка. Попробуйте позже или обратитесь к администратору.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад', 'back_to_employment')
            ]])
        );
    }
});