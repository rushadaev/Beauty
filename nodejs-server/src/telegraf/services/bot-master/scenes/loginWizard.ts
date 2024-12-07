import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from "../../../../services/laravelService";

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
    const messageText = `Добро пожаловать в CherryTown! Выберите действие:`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Трудоустройство', 'registration')],
        [Markup.button.callback('Авторизация', 'authorization')],
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

// Шаг 2: Обработка регистрации
const handleRegistration = new Composer<MyContext>();
handleRegistration.action('registration', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('registration_wizard');
    return;
});

// Шаг 3: Обработка авторизации и ввода телефона
const handleAuthorization = new Composer<MyContext>();
handleAuthorization.action('authorization', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_menu')],
    ]);

    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.next();
});

// Обработка ввода телефона
const handlePhoneInput = new Composer<MyContext>();
handlePhoneInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

handlePhoneInput.on('text', async (ctx) => {
    const phone = formatPhone(ctx.message.text);

    if (!isValidPhone(phone)) {
        await ctx.reply(
            'Неверный формат номера. Пожалуйста, введите номер в формате:\n+7XXXXXXXXXX',
            Markup.inlineKeyboard([
                [Markup.button.callback('👈 Назад', 'back_to_menu')]
            ])
        );
        return;
    }

    ctx.scene.session.phone = phone;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_phone')]
    ]);

    await ctx.reply('Введите пароль от личного кабинета YClients:', keyboard);
    return ctx.wizard.next();
});

// Обработка ввода пароля
const handlePasswordInput = new Composer<MyContext>();

handlePasswordInput.action('back_to_phone', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_menu')],
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.back();
});

handlePasswordInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем данные сессии
    if (ctx.session) {
        ctx.session = {};
    }
    return ctx.scene.enter('login_wizard'); // Возвращаемся в начало сцены
});

// Утилита для задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

handlePasswordInput.on('text', async (ctx) => {
    const password = ctx.message.text;
    const phone = ctx.scene.session.phone;

    try {
        await ctx.reply('⏳ Проверяем данные...');
        const response = await laravelService.auth(phone, password, ctx.from.id);
        
        if (response?.success) {
            // Сохраняем данные авторизации в сессию
            ctx.session.phone = phone;
            ctx.session.password = password;
            
            // Также можно сохранить токен, если он нужен
            if (response.token) {
                ctx.session.apiToken = response.token;
            }

            // Сохраняем данные пользователя
            if (response.user) {
                ctx.session.user = response.user;
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

            // Очищаем временные данные из сцены
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
                '🎉 Успешно! Добро пожаловать в личный кабинет.'
            );
            
            // Проверяем сохранение данных
            console.log('Session after auth:', {
                phone: ctx.session.phone,
                hasPassword: !!ctx.session.password,
                hasUser: !!ctx.session.user
            });

            await delay(1000);
            return ctx.scene.enter('main');
        }

        const errorMsg = response?.message || 'Ошибка авторизации';
        const errorMessage = await ctx.reply('❌ ' + errorMsg);
        await delay(500);

        const errorKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Попробовать снова', 'retry_auth')],
            [Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
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
            [Markup.button.callback('🔄 Попробовать снова', 'retry_auth')],
            [Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
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

// Обработчики кнопок
handlePasswordInput.action('retry_auth', async (ctx) => {
    await ctx.answerCbQuery();
    const message = 'Введите ваш номер телефона в формате:\n+7XXXXXXXXXX';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👈 Назад', 'back_to_menu')]
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.selectStep(2); // Возврат к вводу телефона
});

handlePasswordInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.scene.session) {
        ctx.scene.session = {};
    }
    return ctx.scene.enter('login_wizard');
});

// Финальный шаг после успешной авторизации
const handlePostLogin = new Composer<MyContext>();
handlePostLogin.action('goto_master_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('master_menu_scene');
});

handlePostLogin.action('retry_auth', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

handlePostLogin.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

// Объединяем обработчики действий
const handleAction = new Composer<MyContext>();
handleAction.use(handleRegistration);
handleAction.use(handleAuthorization);

// Создаем сцену wizard
export const loginWizard = new Scenes.WizardScene<MyContext>(
    'login_wizard',
    showMainMenu,
    handleAction,
    handlePhoneInput,
    handlePasswordInput,
    handlePostLogin
);

// Добавляем middleware для обработки ошибок
loginWizard.use(async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        console.error('Ошибка в login wizard:', error);
        await ctx.reply(
            'Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.',
            Markup.inlineKeyboard([
                [Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
            ])
        );
    }
});