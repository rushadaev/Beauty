import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';
import * as fs from 'node:fs';
import * as path from 'path';
import axios from 'axios';
import logger from '../../../../utils/logger/loggerTelegram';

export const changePhotoScene = new Scenes.BaseScene<MyContext>('change_photo_scene');

const MIN_SIZE = 800; // Минимальный размер для ширины и высоты
const MAX_SIZE = 2000; // Максимальный размер для ширины и высоты
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ в байтах

// Вход в сцену
changePhotoScene.enter(async (ctx: MyContext) => {
    const message = `
📸 *Загрузка новой фотографии профиля*

⚠️ *Требования к фото:*
• Квадратный формат (1:1)
• Размер от ${MIN_SIZE}x${MIN_SIZE} до ${MAX_SIZE}x${MAX_SIZE} пикселей
• Формат JPG/JPEG
• Размер файла до 5 МБ
• Чёткое изображение на светлом фоне
• Без посторонних предметов и людей
• В деловом стиле

✨ *Рекомендации:*
• Хорошее освещение
• Нейтральное выражение лица
• Профессиональный внешний вид
• Четкий фокус на лице

🔄 Отправьте фото прямо сейчас или выберите действие:`;

    await ctx.replyWithMarkdown(message, 
        Markup.inlineKeyboard([
            [Markup.button.callback('❌ Отменить изменение фото', 'cancel_photo')],
            [Markup.button.callback('ℹ️ Помощь по загрузке', 'photo_help')],
            [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
        ])
    );
});

// Обработка полученных фотографий
changePhotoScene.on('photo', async (ctx) => {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        
        if (!file.file_path) {
            throw new Error('Не удалось получить файл фотографии');
        }

        // Проверка размеров фото
        if (photo.width < MIN_SIZE || photo.height < MIN_SIZE) {
            await ctx.reply(
                `⚠️ Фото слишком маленькое. Минимальный размер ${MIN_SIZE}x${MIN_SIZE} пикселей.`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Загрузить другое фото', 'retry_photo')],
                    [Markup.button.callback('❓ Помощь с размером', 'size_help')]
                ])
            );
            return;
        }

        // Проверка квадратного формата
        if (Math.abs(photo.width - photo.height) > 10) { // Допуск в 10 пикселей
            await ctx.reply(
                '⚠️ Фото должно быть квадратным (соотношение сторон 1:1).',
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Загрузить другое фото', 'retry_photo')],
                    [Markup.button.callback('✂️ Как обрезать фото?', 'crop_help')]
                ])
            );
            return;
        }

        await ctx.reply('⌛ Обрабатываем фотографию...');

        // Получаем файл
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN_MASTER}/${file.file_path}`;
        
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        // Проверка размера файла
        if (response.data.length > MAX_FILE_SIZE) {
            await ctx.reply(
                '⚠️ Размер файла превышает 5 МБ. Пожалуйста, сожмите фото и попробуйте снова.',
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Загрузить другое фото', 'retry_photo')],
                    [Markup.button.callback('📝 Как уменьшить размер?', 'size_reduce_help')]
                ])
            );
            return;
        }

        // Создаем временную директорию
        const tempDir = path.join(__dirname, '../../../../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Сохраняем файл временно
        const tempFilePath = path.join(tempDir, `${ctx.from.id}_${Date.now()}.jpg`);
        fs.writeFileSync(tempFilePath, response.data);

        try {
            const updateResult = await laravelService.updateMasterPhoto(
                ctx.from.id,
                tempFilePath
            );

            if (updateResult?.success) {
                await ctx.reply(
                    '✅ Фотография успешно обновлена!\n\nВаш профиль теперь выглядит более профессионально.',
                    Markup.inlineKeyboard([
                        [Markup.button.callback('👀 Посмотреть мой профиль', 'view_profile')],
                        [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
                    ])
                );
            } else {
                throw new Error('Не удалось обновить фотографию');
            }
        } finally {
            // Удаляем временный файл
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }

    } catch (error) {
        logger.error('Error updating photo:', error);
        await ctx.reply(
            '❌ Произошла ошибка при обновлении фотографии.\n\nПожалуйста, попробуйте позже или обратитесь в поддержку.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Попробовать снова', 'retry_photo')],
                [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
            ])
        );
    }
});

// Обработчики действий
changePhotoScene.action('retry_photo', async (ctx) => {
    await ctx.answerCbQuery('🔄 Загрузите новое фото');
    return ctx.scene.reenter();
});

changePhotoScene.action('cancel_photo', async (ctx) => {
    await ctx.answerCbQuery('❌ Изменение фото отменено');
    return ctx.scene.enter('main');
});

changePhotoScene.action('photo_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        `📸 *Как сделать хорошее фото для профиля:*

1. Используйте нейтральный светлый фон
2. Обеспечьте хорошее освещение (желательно естественное)
3. Расположитесь на расстоянии 1-1.5 метра от камеры
4. Держите камеру на уровне глаз
5. Используйте таймер для стабильного снимка
6. Убедитесь, что фото четкое и не размытое
7. Проверьте, что лицо занимает около 60% кадра

*Как обрезать фото:*
• На iPhone: используйте встроенный редактор
• На Android: используйте Google Фото
• Онлайн: squoosh.app или photopea.com`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
                [Markup.button.callback('👈 Назад', 'back_to_main')]
            ])
        }
    );
});

changePhotoScene.action('size_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        `📏 *Как проверить размер фото:*

1. На телефоне:
• Откройте фото
• В свойствах или информации найдите размеры
• Убедитесь, что размер не менее ${MIN_SIZE}x${MIN_SIZE}

2. Как увеличить размер:
• Сделайте новое фото в высоком качестве
• Используйте основную камеру, не фронтальную
• Отключите компрессию в настройках камеры`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
                [Markup.button.callback('👈 Назад', 'back_to_main')]
            ])
        }
    );
});

changePhotoScene.action('crop_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        `✂️ *Как сделать фото квадратным:*

1. На iPhone:
• Откройте фото в приложении Фото
• Нажмите Изменить
• Выберите инструмент обрезки
• Выберите квадратный формат

2. На Android:
• Откройте фото в Google Фото
• Нажмите кнопку изменения
• Выберите Обрезать
• Выберите формат 1:1

3. Онлайн-сервисы:
• squoosh.app
• photopea.com
• canva.com`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
                [Markup.button.callback('👈 Назад', 'back_to_main')]
            ])
        }
    );
});

changePhotoScene.action('size_reduce_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
        `📉 *Как уменьшить размер фото:*

1. На телефоне:
• Используйте встроенный редактор
• Выберите опцию "Изменить размер" или "Сжать"
• Сохраните в среднем качестве

2. Онлайн-сервисы:
• squoosh.app (рекомендуется)
• tinypng.com
• compressjpeg.com

3. Советы:
• Уменьшите разрешение до 1500x1500
• Используйте JPEG формат
• Выберите качество 80-90%`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
                [Markup.button.callback('👈 Назад', 'back_to_main')]
            ])
        }
    );
});

changePhotoScene.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

changePhotoScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery('👈 Возвращаемся в главное меню');
    return ctx.scene.enter('main');
});

// Обработка всех остальных типов сообщений
changePhotoScene.on('message', async (ctx) => {
    await ctx.reply(
        '⚠️ Пожалуйста, отправьте фотографию или выберите действие из меню ниже:',
        Markup.inlineKeyboard([
            [Markup.button.callback('❓ Помощь по загрузке', 'photo_help')],
            [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
        ])
    );
});