import { Telegraf, session, Scenes, Markup } from 'telegraf';
import WarehouseBot from '../services/warehouseBot';
import logger from '../../utils/logger/loggerTelegram'; // Ensure correct path
import { Redis as RedisStore } from '@telegraf/session/redis';
import {MyContext, MySession} from "../types/MyContext";

// Import mainScene from the new file
import { mainScene } from '../services/bot-master/scenes/mainScene';
import {cabinetGate} from "../utils/cabinetGate";
import {loginWizard} from "../services/bot-master/scenes/loginWizard";
import {registrationWizard} from "../services/bot-master/scenes/registrationWizard";
import { changeDescriptionScene } from '../services/bot-master/scenes/changeDescriptionScene';
// If you have other scenes like subscriptionScene, consider importing them similarly
import { scheduleManagementScene } from '../services/bot-master/scenes/scheduleManagementScene';
import { changePhotoScene } from '../services/bot-master/scenes/changePhotoScene';
import { clientsManagementScene } from '../services/bot-master/scenes/clientsManagementScene';
import { cancelBookingScene } from '../services/bot-master/scenes/cancel_booking_scene';
import { changePhoneScene } from '../services/bot-master/scenes/change_phone_scene';
import { deleteServiceScene } from '../services/bot-master/scenes/delete_service_scene';
import { addServiceScene } from '../services/bot-master/scenes/add_service_scene';


const botToken: string = process.env.TELEGRAM_BOT_TOKEN_MASTER!;
const botMaster: Telegraf<MyContext> = new Telegraf(botToken);


const store = RedisStore<MySession>({
    url: 'redis://redis:6379/2',
});

// Initialize the stage with imported scenes
const stage = new Scenes.Stage<MyContext>([
    mainScene,
    loginWizard,
    registrationWizard,
    changeDescriptionScene,
    scheduleManagementScene,
    changePhotoScene,
    clientsManagementScene,
    cancelBookingScene,
    changePhoneScene,
    deleteServiceScene,
    addServiceScene,
]);

// Middleware to log incoming updates
botMaster.use(session({ store }));
botMaster.use(stage.middleware());
botMaster.use(async (ctx: MyContext, next: () => Promise<void>) => {
    logger.info('Received update', { update: ctx.update });
    await next();
});

// Handle /start command
botMaster.start(async (ctx: MyContext) => {
    const startPayload = ctx.payload;

    if (startPayload) {
        if(startPayload === 'registration') {
            await ctx.scene.enter('registration_wizard');
            return;
        }
        await cabinetGate(ctx, 'main');
        return;
    } else {
        await cabinetGate(ctx, 'main');
        return;
    }

});

// Handle 'mainmenu' action
botMaster.action('mainmenu', async (ctx: MyContext) => {
    //if user authenticated then show main menu else show login menu
    await cabinetGate(ctx, 'main');

    await ctx.answerCbQuery('🏦Главная');
});

// Handle /ping command
botMaster.command('ping', (ctx: MyContext) => {
    ctx.reply('pong!');
});


botMaster.on('callback_query', async (ctx: MyContext) => {
    await ctx.answerCbQuery('👌');
});



// Export the bot instance
export default botMaster;
