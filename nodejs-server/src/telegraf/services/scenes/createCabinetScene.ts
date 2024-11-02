import {Scenes, Markup, Composer} from 'telegraf';
import { MyContext } from '../../types/MyContext';
import logger from '../../../utils/logger/loggerTelegram';
import {fmt, link} from "telegraf/format";
import {getDraftsForUser} from "../../../services/wildberriesService";
import CacheService from '../../../utils/redis/Cache/Cache';
import LaravelService from "../../../services/laravelService";
import {authenticateUserService} from "../../../services/authService";
import {sendDateSelection} from "./actions/autoBookingActions";
import { v4 as uuidv4 } from 'uuid';
import {cabinetGate} from "../../utils/cabinetGate";
import bot from "../../controllers/telegramController";

const nameHandler = new Composer<MyContext>();
const phoneHandler = new Composer<MyContext>();
nameHandler.on('text', async (ctx) => {
    const name = ctx.message.text;
    ctx.scene.session.cabinetForm.name = name;
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('👌 Главное меню', 'mainmenu'),
    ]);
    const message = "👇🏻Введите номер телефона";


    await ctx.reply(message, keyboard);

    return ctx.wizard.next();
})

phoneHandler.on('text', async (ctx) => {
    const input = ctx.message.text;

    // Step 1: Extract all digits from the input
    const digits = input.replace(/\D/g, '');

    // Step 2: Validate the number of digits
    if (digits.length < 10) {
        await ctx.reply('❌ Пожалуйста, введите действительный номер телефона с 10 цифрами.');
        return;
    }

    // Step 3: Extract the last 10 digits
    const phoneNumber = digits.slice(-10);

    // Step 4: Save the validated phone number
    ctx.scene.session.cabinetForm.phoneNumber = phoneNumber;

    // Proceed with the next step
    await createCabinetSend(ctx);
});



const createCabinetSend = async (ctx: any) => { // Replace 'any' with the correct type
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('👌 Главное меню', 'mainmenu'),
    ]);

    try {
        const credentials = {
            phone: ctx.scene.session.cabinetForm.phoneNumber as string,
            name: ctx.scene.session.cabinetForm.name as string,
        };

        const user_id = uuidv4();
        const telegram_id = ctx.from.id as string;

        // Enqueue the authentication job
        const authResult = await authenticateUserService({ userId: user_id, telegramId: telegram_id, credentials });

        if (!authResult.success) {
            throw new Error(authResult.message);
        }

        await ctx.wizard.next();
        // Inform the user that the job has started
        await ctx.reply('🚀 Мы начали процесс аутентификации. \n Пожалуйста, ожидайте сообщений.');
    } catch (error: any) {
        console.log('Error authenticateUserService:', error.message);
        await ctx.reply('❌ Ошибка создания кабинета', keyboard);
        return ctx.scene.leave();
    }

    return;
};

const codeHandler = new Composer<MyContext>();

codeHandler.on('text', async (ctx) => {
    const text = ctx.message.text;

    if (!/^\d{6}$/.test(text)) {
        await ctx.reply('❌ Некорректный код. Пожалуйста, введите 6 цифр.');
        return;
    }

    const channel = `verification_code_channel_${ctx.from.id}`;
    const message = {
        code: text,
        telegramId: ctx.from.id,
        action: 'collect_verification_code',
    };

    await CacheService.pushToChannel(channel, JSON.stringify(message));
    //Ждем ответа от сервиса
    return;
});


const cabinetWizzard = new Scenes.WizardScene<MyContext>(
    'createCabinetWizzard',
    // Step 1: Show subscription options
    async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]);

        ctx.scene.session.cabinetForm = {
            name: null,
            phoneNumber: null,
        }

        const message = fmt`🫡 Введите название кабинета`

        try {
            await ctx.editMessageText(message, {
                ...keyboard, // Spread the keyboard markup
                link_preview_options: {
                    is_disabled: true
                },
            });
            await ctx.answerCbQuery('🚀 Создайте кабинет');
        } catch (error) {
            logger.error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }

        return ctx.wizard.next();
    },
    nameHandler,
    phoneHandler,
    codeHandler,
);


cabinetWizzard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});

// Export the scene
export default cabinetWizzard;
