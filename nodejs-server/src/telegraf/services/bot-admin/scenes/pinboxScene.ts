import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import LaravelService from "../../../../services/laravelService";
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream'; // Добавляем этот импорт
import logger from '../../../../utils/logger/loggerTelegram';

interface PinboxService {
    'Наименование товара': string;
    'Тип цены': string;
    'Цена товара': number;
    'Валюта': number;
    'Категория': string;
    'Описание': string;
    'Номера филиалов': string;
    'URL фото': string;
}



export const pinboxScene = new Scenes.BaseScene<MyContext>('pinbox');

// Константы для категорий
const CATEGORIES = {
    WOMAN: 'Женский шугаринг',
    MAN: 'Мужской шугаринг',
    ADDITIONAL: 'Дополнительные услуги'
};

const BRANCH_IDS = {
    YCLIENTS: 490462, // ID в Yclients (Спортивная)
    PINBOX: '63744,63745,63746' // ID в Pinbox (все филиалы)
};

const CATEGORY_MAPPING = {
    'Классический шугаринг Cherry Town  женский': CATEGORIES.WOMAN,
    'Чёрный шунгитовый шугаринг Monochrome женский': CATEGORIES.WOMAN,
    'Лечебный spa-шугаринг Botanix  женский': CATEGORIES.WOMAN,
    'Полимерный воск  italwax женский': CATEGORIES.WOMAN,
    'Классический шугаринг Cherry Town мужской': CATEGORIES.MAN,
    'Чёрный шунгитовый шугаринг Monochrome мужской': CATEGORIES.MAN,
    'Лечебный spa-шугаринг Botanix  мужской': CATEGORIES.MAN,
    'Комбинированная депиляция  сахар +воск мужской': CATEGORIES.MAN,
    'Полимерный воск  italwax мужской': CATEGORIES.MAN,
    'Карамельная липосакция Renie': CATEGORIES.ADDITIONAL
};

// Входная точка сцены
pinboxScene.enter(async (ctx: MyContext) => {
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
        [Markup.button.callback('📥 Выгрузить таблицу Pinbox', 'export_pinbox')],
        [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]);

    await ctx.reply(
        '📦 Модуль Pinbox\n\n' +
        '• Выгрузка данных производится из эталонного филиала "Спортивная"\n' +
        '• Услуги автоматически группируются по категориям\n' +
        '• Форматирование производится согласно требованиям Pinbox\n\n' +
        'Нажмите кнопку ниже для выгрузки таблицы.',
        keyboard
    );
});

// Экспорт таблицы
pinboxScene.action('export_pinbox', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;

        // 1. Показываем «Пожалуйста, подождите»
        const waitingMessage = await ctx.reply('⏳ Формируем таблицу Pinbox, пожалуйста, подождите...');

        if (!phone || !password) {
            await ctx.deleteMessage(waitingMessage.message_id);
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }

        // 2. Генерируем файл
        const template = await LaravelService.generatePinboxTemplate({ phone, password });

        // 3. Удаляем сообщение «ждём...»
        await ctx.deleteMessage(waitingMessage.message_id);

        // 4. Отправляем результат
        await ctx.replyWithDocument({
            source: template,
            filename: 'pinbox_services.xlsx'
        });

        await ctx.reply(
            '✅ Таблица успешно сформирована!\n' +
            'Теперь вы можете загрузить её в сервис Pinbox.',
            Markup.inlineKeyboard([[Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]])
        );

    } catch (error) {
        logger.error('Error in pinbox export:', error);

        try {
            await ctx.deleteMessage(); // на случай, если waitingMessage существует
        } catch (e) {
            // ничего страшного
        }

        await ctx.reply(
            '❌ Произошла ошибка при формировании таблицы. Попробуйте позже.',
            Markup.inlineKeyboard([[Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]])
        );
    }
});


function formatServiceTitle(serviceTitle: string, categoryTitle: string): string {
    // Очищаем входные данные от лишних пробелов
    serviceTitle = serviceTitle.trim();
    categoryTitle = categoryTitle.trim();

    // Объявляем переменную title
    let title = serviceTitle;

    // Базовое форматирование категории
    let categoryInfo = categoryTitle
        .replace(/Cherry\s*Town/gi, '')
        .replace(/женский$/, 'шугаринг женский')
        .replace(/мужской$/, 'шугаринг мужской')
        .trim();

    // Специальные случаи форматирования
    if (categoryTitle.toLowerCase().includes('italwax')) {
        const gender = categoryTitle.includes('женский') ? 'женский' : 'мужской';
        if (!serviceTitle.toLowerCase().includes('italwax')) {
            title = `${serviceTitle} Italwax | Полимерный воск italwax шугаринг ${gender}`;
        } else {
            title = `${serviceTitle} | Полимерный воск italwax шугаринг ${gender}`;
        }
    } else if (serviceTitle.includes('Botanix-SPA') || categoryTitle.includes('Botanix')) {
        const gender = categoryTitle.includes('женский') ? 'женский' : 'мужской';
        if (serviceTitle.includes('Botanix-SPA')) {
            title = `${serviceTitle} | Лечебный spa-шугаринг ${gender}`;
        } else {
            title = `${serviceTitle} Botanix-SPA | Лечебный spa-шугаринг ${gender}`;
        }
    } else if (categoryTitle.includes('Monochrome')) {
        const gender = categoryTitle.includes('женский') ? 'женский' : 'мужской';
        if (!serviceTitle.toLowerCase().includes('monochrome')) {
            title = `${serviceTitle} Monochrome | Чёрный шунгитовый шугаринг ${gender}`;
        } else {
            title = `${serviceTitle} | Чёрный шунгитовый шугаринг ${gender}`;
        }
    } else if (categoryTitle.includes('Карамельная липосакция')) {
        title = `${serviceTitle} | Карамельная липосакция Renie`;
    } else {
        // Стандартное форматирование для остальных случаев
        title = `${serviceTitle} | ${categoryInfo}`;
    }

    // Убираем лишние пробелы и дубликаты разделителей
    title = title
        .replace(/\s+/g, ' ') // Убираем множественные пробелы
        .replace(/\|\s+\|/g, '|') // Убираем дубли разделителей
        .trim();

    return title;
}

// Обновляем функцию форматирования для Pinbox
function formatServicesForPinbox(services: any[]): PinboxService[] {
    const result: PinboxService[] = [];

    for (const service of services) {
        if (!CATEGORY_MAPPING[service.category_title]) continue;

        const pinboxCategory = CATEGORY_MAPPING[service.category_title];
        const formattedTitle = formatServiceTitle(service.title, service.category_title);

        result.push({
            'Наименование товара': formattedTitle,
            'Тип цены': service.price_min ? 'фикс' : 'от',
            'Цена товара': service.price_min,
            'Валюта': 0, // рубли
            'Категория': pinboxCategory,
            'Описание': formattedTitle,
            'Номера филиалов': BRANCH_IDS.PINBOX,
            'URL фото': 'https://pinbox.ru/assets/images/cabinet/dfprice.img.png'
        });
    }

    return result;
}

// Навигация
pinboxScene.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
});

pinboxScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

export default pinboxScene;