import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import LaravelService from "../../../../services/laravelService";
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import logger from '../../../../utils/logger/loggerTelegram';

export const changeServicesScene = new Scenes.BaseScene<MyContext>('change_services');

interface PriceChangeDisplay {
    branch_name: string;
    service_name: string;
    old_price: number;
    new_price: number;
    branch_id: number;  // Добавляем ID для API
    service_id: number; // Добавляем ID для API
}

interface PriceChangeUpdate {
    branch_id: number;
    service_id: number;
    new_price: number;
}

// Входная точка сцены
changeServicesScene.enter(async (ctx: MyContext) => {
    // Проверяем авторизацию
    const phone = ctx.session?.phone;
    const password = ctx.session?.password;

    if (!phone || !password) {
        await ctx.reply('Ошибка: не найдены данные авторизации. Попробуйте перелогиниться.',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
            ]])
        );
        return;
    }

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📥 Получить шаблон Excel', 'get_template')],
        [Markup.button.callback('📤 Загрузить заполненный Excel', 'upload_template')],
        [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]);

    await ctx.reply(
        '🏷 Управление услугами\n\n' +
        '1. Нажмите «Получить шаблон Excel» — вы получите таблицу со списком филиалов и услуг.\n' +
        '2. Откройте скачанный файл, найдите нужную услугу(и) и в колонке «Новая цена» укажите желаемую стоимость.\n' +
        '3. Сохраните файл.\n' +
        '4. Нажмите «Загрузить заполненный Excel», а затем отправьте файл сюда в чат.\n' +
        '\nПосле загрузки бот покажет, какие услуги будут изменены, и предложит подтвердить или отменить изменения.',
        keyboard
    );
});

changeServicesScene.action('upload_template', async (ctx) => {
    await ctx.answerCbQuery(); // закрыть «часики» на кнопке
    await ctx.reply(
        'Пожалуйста, отправьте файл Excel (XLSX) в чат сообщением.\n' +
        'Убедитесь, что загружаете файл в формате .xlsx.'
    );
});

// Обработка получения шаблона
changeServicesScene.action('get_template', async (ctx) => {
    try {
        // 1. Сразу отвечаем на нажатие кнопки, чтобы убрать «часики» у инлайн-кнопки
        await ctx.answerCbQuery();

        // 2. Отправляем «пожалуйста, подождите»
        const waitingMessage = await ctx.reply('⏳ Пожалуйста, подождите, идёт генерация Excel...');

        // 3. Проверяем авторизацию
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;

        if (!phone || !password) {
            // Если нет авторизации – удаляем «ждём-сообщение» и выходим
            await ctx.deleteMessage(waitingMessage.message_id);
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }

        // 4. Генерируем файл через сервис
        const template = await LaravelService.generateServicesTemplate({ phone, password });

        // 5. Удаляем «ждём-сообщение»
        await ctx.deleteMessage(waitingMessage.message_id);

        // 6. Отправляем файл
        await ctx.replyWithDocument({
            source: template,
            filename: 'services_template.xlsx'
        });

        // 7. Дополнительное сообщение
        await ctx.reply(
            '📝 Заполните колонку "Новая цена" для тех услуг, которые нужно изменить.\n' +
            'После заполнения загрузите файл обратно в бот.',
            Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_menu')]])
        );

    } catch (error) {
        logger.error('Error generating template:', error);

        // Если произошло исключение — желательно удалить «ждём-сообщение» (если оно существует)
        // Но нужно убедиться, что мы его не удаляли раньше
        // Здесь для простоты можем обернуть в try/catch
        try {
            // Если не успели создать waitingMessage, этот вызов может упасть
            // но это не критично
            await ctx.deleteMessage();
        } catch (e) {
            // Игнорируем ошибку удаления
        }

        await ctx.reply('Произошла ошибка при генерации шаблона. Попробуйте позже.');
    }
});



// Обработка загрузки файла
changeServicesScene.on('document', async (ctx) => {
    try {
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;

        if (!phone || !password) {
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }

        if (!ctx.message.document.mime_type?.includes('spreadsheet')) {
            await ctx.reply('Пожалуйста, загрузите файл Excel (.xlsx)');
            return;
        }

        const file = await ctx.telegram.getFile(ctx.message.document.file_id);
        const filePath = file.file_path;
        
        if (!filePath) {
            await ctx.reply('Не удалось получить файл');
            return;
        }

        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW}/${filePath}`;
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();

        // Обрабатываем файл через API
        // В обработке файла:
const result = await LaravelService.processServicesUpdates({
    phone,
    password,
    file: Buffer.from(buffer)
});

if (!result.success) {
    await ctx.reply('Ошибка при обработке файла: ' + result.message);
    return;
}

// Формируем сообщение для подтверждения
let message = '📋 Подтвердите изменения:\n\n';

if (result.data.changes) {
    // Группируем изменения по филиалам с явным указанием типов
    const groupedChanges = result.data.changes.reduce((acc, change: PriceChangeDisplay) => {
        if (!acc[change.branch_name]) {
            acc[change.branch_name] = [];
        }
        acc[change.branch_name].push(change);
        return acc;
    }, {} as Record<string, PriceChangeDisplay[]>);

    // Преобразуем сгруппированные изменения в сообщение
    Object.keys(groupedChanges).forEach(branch => {
        message += `🏢 ${branch}:\n`;
        groupedChanges[branch].forEach(change => {
            message += `- ${change.service_name}: ${change.old_price}₽ → ${change.new_price}₽\n`;
        });
        message += '\n';
    });
}

        if (result.data.errors.length > 0) {
            message += '\n⚠️ Предупреждения:\n';
            for (const error of result.data.errors) {
                message += `- Строка ${error.row}: ${error.message}\n`;
            }
        }

        ctx.session.pendingChanges = result.data.changes;

        await ctx.reply(message, Markup.inlineKeyboard([
            [Markup.button.callback('✅ Подтвердить', 'confirm_changes')],
            [Markup.button.callback('❌ Отменить', 'cancel_changes')]
        ]));

    } catch (error) {
        logger.error('Error processing uploaded file:', error);
        await ctx.reply('Произошла ошибка при обработке файла. Проверьте формат и попробуйте снова.');
    }
});

// Подтверждение изменений
changeServicesScene.action('confirm_changes', async (ctx) => {
    try {
        await ctx.answerCbQuery('Применяем изменения...');

        const phone = ctx.session?.phone;
        const password = ctx.session?.password;
        const changes = ctx.session.pendingChanges;

        if (!phone || !password) {
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }

        if (!changes || changes.length === 0) {
            await ctx.editMessageText('Нет изменений для применения');
            return;
        }

        // Применяем изменения через API
        const updates = changes.map(change => ({
            branch_id: change.branch_id,
            service_id: change.service_id,
            new_price: change.new_price
        }));
        
        // Применяем изменения через API
        const results = await LaravelService.updateServicePrices({
            phone,
            password,
            updates
        });

        // Формируем отчет
        let message = '📊 Результаты обновления:\n\n';
        message += `✅ Успешно: ${results.data.success}\n`;
        
        if (results.data.failed > 0) {
            message += `❌ Ошибок: ${results.data.failed}\n\n`;
            message += 'Детали ошибок:\n';
            results.data.errors.forEach((error: any) => {
                message += `- ${error.branch_name}, ${error.service_name}: ${error.error}\n`;
            });
        }

        await ctx.editMessageText(message, Markup.inlineKeyboard([
            [Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]));

    } catch (error) {
        logger.error('Error applying changes:', error);
        await ctx.reply('Произошла ошибка при применении изменений. Попробуйте позже.');
    }
});

// Навигация
changeServicesScene.action('back_to_menu', async (ctx) => {
    await ctx.scene.reenter();
});

changeServicesScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
});

changeServicesScene.action('cancel_changes', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        ctx.session.pendingChanges = undefined;
        await ctx.editMessageText(
            '❌ Изменения отменены',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')
            ]])
        );
    } catch (error) {
        logger.error('Error cancelling changes:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

export default changeServicesScene;