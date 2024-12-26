import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext, MySession } from '../../../types/MyContext';
import laravelService from "../../../../services/laravelService";

interface AdminSessionData {
    phone?: string;
    password?: string;
    apiToken?: string;
    user?: any;
}

// Утилиты для работы с телефоном
const formatPhone = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('8')) {
        cleaned = '7' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('7')) {
        cleaned = '7' + cleaned;
    }
    return cleaned;
};

const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return /^[78]\d{10}$/.test(cleaned);
};

// Шаг 1: Начальное меню
const showMainMenu = async (ctx: MyContext) => {
    const messageText = `👋 Добро пожаловать в панель управления CherryTown!\n\n`
        + `🎯 Здесь вы сможете:\n`
        + `• Управлять персоналом\n`
        + `• Контролировать записи\n`
        + `• Работать со складом\n`
        + `• Следить за уведомлениями\n`
        + `• И многое другое!\n\n`
        + `🔐 Для начала работы необходимо авторизоваться:`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Авторизация', 'admin_authorization')],
    ]);

    if (ctx.callbackQuery?.message) {
        try {
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        } catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    } else {
        await ctx.reply(messageText, mainMenuKeyboard);
    }

    return ctx.wizard.next();
};

// Обработка авторизации и ввода телефона
const handleAdminAuthorization = new Composer<MyContext>();
handleAdminAuthorization.action('admin_authorization', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `📱 Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_admin_menu')],
    ]);

    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.next();
});

// Обработка ввода телефона
const handlePhoneInput = new Composer<MyContext>();
handlePhoneInput.action('back_to_admin_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

handlePhoneInput.on('text', async (ctx) => {
    const phone = formatPhone(ctx.message.text);

    if (!isValidPhone(phone)) {
        await ctx.reply(
            '❌ Неверный формат номера. Пожалуйста, введите номер в формате:\n+7XXXXXXXXXX',
            Markup.inlineKeyboard([
                [Markup.button.callback('👈 Назад', 'back_to_admin_menu')]
            ])
        );
        return;
    }

    ctx.scene.session.phone = phone;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_admin_phone')] // Обновляем название action
    ]);

    await ctx.reply('🔑 Введите пароль от личного кабинета YClients:', keyboard);
    return ctx.wizard.next();
});

// Утилита для задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Обработка ввода пароля
const handlePasswordInput = new Composer<MyContext>();

handlePasswordInput.action('back_to_admin_phone', async (ctx) => { // Обновляем название action
    await ctx.answerCbQuery();
    const message = `📱 Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_admin_menu')], // Обновляем название action
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.back();
});

handlePasswordInput.on('text', async (ctx) => {
    const password = ctx.message.text;
    const phone = ctx.scene.session.phone;

    try {
        await ctx.reply('⏳ Проверяем данные...');
        const response = await laravelService.authAdmin(phone, password, ctx.from.id);
        
        if (response?.success) {
            // Проверяем роль пользователя
            const userRole = response.user?.user_role_slug;
            if (!['owner', 'administrator'].includes(userRole)) {
                const errorMessage = await ctx.reply('❌ Доступ запрещен: недостаточно прав.\n\nЭтот бот доступен только для владельцев и администраторов.');
                await delay(2000);
                const errorKeyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')]
                ]);
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    errorMessage.message_id,
                    undefined,
                    '❌ Доступ запрещен: недостаточно прав.\n\nЭтот бот доступен только для владельцев и администраторов.',
                    { reply_markup: errorKeyboard.reply_markup }
                );
                return;
            }

            if (ctx.session) {
                const sessionData: AdminSessionData = {
                    phone,
                    password,
                    apiToken: response.token,
                    user: response.user
                };
                Object.assign(ctx.session, sessionData);
            }

            try {
                const messagesToDelete = ctx.message.message_id;
                for (let i = 0; i < 3; i++) {
                    try {
                        await ctx.deleteMessage(messagesToDelete - i);
                    } catch (e) {
                        // Игнорируем ошибки удаления
                    }
                }
            } catch (e) {
                console.log('Could not delete messages:', e);
            }

            // Очищаем временные данные
            delete ctx.scene.session.phone;
            delete ctx.scene.session.password;

            const successMsg = await ctx.reply('🔄 Авторизация...');
            await delay(700);
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                successMsg.message_id,
                undefined,
                '✨ Проверяем данные...'
            );
            await delay(700);
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                successMsg.message_id,
                undefined,
                '🎉 Успешно! Добро пожаловать в панель управления.'
            );

            await delay(1000);
            return ctx.scene.enter('admin_main');
        }

        const errorMsg = response?.message || 'Ошибка авторизации';
        const errorMessage = await ctx.reply('❌ ' + errorMsg);
        await delay(500);

        const errorKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Попробовать снова', 'retry_admin_auth')], // Обновляем название action
            [Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')] // Обновляем название action
        ]);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            errorMessage.message_id,
            undefined,
            '❌ ' + errorMsg,
            { reply_markup: errorKeyboard.reply_markup }
        );

    } catch (error) {
        console.error('Ошибка авторизации:', error);
        
        let errorMessage = 'Ошибка авторизации. ';
        if (error.response?.data?.message) {
            errorMessage += error.response.data.message;
        } else {
            errorMessage += 'Проверьте введенные данные и попробуйте снова.';
        }

        const errorMsg = await ctx.reply('⚠️ Обработка...');
        await delay(500);

        const errorKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Попробовать снова', 'retry_admin_auth')], // Обновляем название action
            [Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')] // Обновляем название action
        ]);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            errorMsg.message_id,
            undefined,
            '❌ ' + errorMessage,
            { reply_markup: errorKeyboard.reply_markup }
        );
    }
});

// Добавляем обработчики для кнопок после ошибки
// Исправим обработчик retry_admin_auth
handlePasswordInput.action('retry_admin_auth', async (ctx) => {
    try {
        await ctx.answerCbQuery(); // Сразу отвечаем на callback
        await ctx.scene.reenter(); // Перезапускаем сцену
    } catch (error) {
        console.error('Error in retry_admin_auth:', error);
        // В случае ошибки просто пробуем перезапустить сцену
        await ctx.scene.reenter();
    }
});

// Исправим обработчик back_to_admin_menu
handlePasswordInput.action('back_to_admin_menu', async (ctx) => {
    try {
        await ctx.answerCbQuery(); // Сразу отвечаем на callback
        await ctx.scene.reenter(); // Перезапускаем сцену
    } catch (error) {
        console.error('Error in back_to_admin_menu:', error);
        // В случае ошибки просто пробуем перезапустить сцену
        await ctx.scene.reenter();
    }
});



// Создаем сцену wizard с новым именем
export const adminLoginWizard = new Scenes.WizardScene<MyContext>(
    'admin_login_wizard', // Обновляем название сцены
    showMainMenu,
    handleAdminAuthorization,
    handlePhoneInput,
    handlePasswordInput
);

// Добавляем middleware для обработки ошибок
adminLoginWizard.use(async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        console.error('Ошибка в admin login wizard:', error);
        await ctx.reply(
            'Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.',
            Markup.inlineKeyboard([
                [Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')]
            ])
        );
    }
});

