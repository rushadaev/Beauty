import {Scenes, Markup, Composer} from 'telegraf';
import {MyContext, ReauthState} from '../../types/MyContext';
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


const cabinetReauthWizzard = new Scenes.WizardScene<MyContext>(
    'reauthCabinetWizzard',
    // Step 1: Show subscription options
    async (ctx) => {
        const state = ctx.scene.state as ReauthState;
        const cabinet = state.cabinet;
        const keyboard = Markup.inlineKeyboard([
            Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]);

        try {
            const credentials = {
                phone: cabinet.settings.phone_number as string,
                name: cabinet.name as string,
            };

            // Save the credentials to the cache so we can update cabinet later
            await CacheService.set(`reauth_cabinet_${ctx.from.id}`, JSON.stringify({cabinet}));

            const user_id = uuidv4();
            const telegram_id = ctx.from.id as unknown as string;

            // Enqueue the authentication job
            const authResult = await authenticateUserService({ userId: user_id, telegramId: telegram_id, credentials });

            if (!authResult.success) {
                throw new Error(authResult.message);
            }

            // Inform the user that the job has started
            await ctx.reply('🚀 Мы получили вашу информацию и начали процесс аутентификации. Пожалуйста, ожидайте сообщений.', keyboard);
            await ctx.answerCbQuery('🚀 Создание кабинета началось');
        } catch (error: any) {
            console.log('Error authenticateUserService:', error.message);
            await ctx.reply('❌ Ошибка создания кабинета', keyboard);
            return ctx.scene.leave();
        }

        return ctx.wizard.next();
    },
    codeHandler,
);


cabinetReauthWizzard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});

// Export the scene
export default cabinetReauthWizzard;
