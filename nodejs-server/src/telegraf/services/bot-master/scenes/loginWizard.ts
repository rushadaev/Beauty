import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from "../../../../services/laravelService";

// Step 1: Initial menu display
const showMainMenu = async (ctx: MyContext) => {
    const messageText = `Первый экран бота`;

    const mainMenuKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('трудоустройство', 'registration'),
        ],
        [
            Markup.button.callback('авторизация', 'authorization'),
        ],
    ]);

    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        } catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    } else {
        await ctx.reply(messageText, mainMenuKeyboard);
    }

    return ctx.wizard.next(); // Move to the next step
};

// Step 2: Handle registration action
const handleRegistration = new Composer<MyContext>();
handleRegistration.action('registration', async (ctx) => {
    const message = `Трудоустройство`;
    await ctx.scene.enter('registration_wizard');
    return;
});

// Step 3: Handle authorization (phone input)
const handleAuthorization = new Composer<MyContext>();
handleAuthorization.action('authorization', async (ctx) => {
    const message = `Введите номер телефона для авторизации в личном кабинете:`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.next(); // Move to the phone input step
});

const handlePhoneInput = new Composer<MyContext>();
handlePhoneInput.on('text', async (ctx) => {
    const phone = ctx.message.text;
    ctx.scene.session.phone = phone;

    await ctx.reply('Введите пароль от личного кабинета:');

    return ctx.wizard.next();
});

const handlePasswordInput = new Composer<MyContext>();
handlePasswordInput.on('text', async (ctx) => {
    const password = ctx.message.text;
    ctx.scene.session.password = password;

    try {
        const response = await laravelService.auth(ctx.scene.session.phone, ctx.scene.session.password, ctx.from.id);
        console.log('response', response);
    } catch (error) {
        await ctx.reply('Ошибка авторизации. Попробуйте еще раз');
        return ctx.scene.reenter();
    }

    await ctx.reply('Авторизация успешна!');

    return ctx.scene.leave();
});


const handleAction = new Composer<MyContext>();
handleAction.use(handleRegistration);
handleAction.use(handleAuthorization);


// Define the wizard scene
export const loginWizard = new Scenes.WizardScene<MyContext>(
    'login_wizard',
    showMainMenu,
    handleAction,
    handlePhoneInput,
    handlePasswordInput,
);


