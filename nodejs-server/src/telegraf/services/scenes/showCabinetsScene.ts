import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext, AutoBookingState } from '../../types/MyContext';
import logger from '../../../utils/logger/loggerTelegram';
import LaravelService from "../../../services/laravelService";
import {
    sendDraftSelection,
    sendWarehouseSelection,
    sendCoefficientSelection,
    sendBoxTypeSelection,
    sendDateSelection,
    sendOrderConfirmation,
    sendFinalConfirmation,
    sendErrorMessage, sendCustomDatePrompt, sendPalletCountPrompt, sendSearchSlotMessage,
} from './actions/autoBookingActions';
import {bold, fmt} from "telegraf/format";
import {cabinetGate} from "../../utils/cabinetGate";
import {getDraftsForUser} from "../../../services/wildberriesService";

// Default buttons with Back and Main Menu
const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'back')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsAuth = [
    [Markup.button.callback('🔐 Авторизация', 'auth')],
    [Markup.button.callback('👈 Назад', 'back')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const sendListCabinets = async (ctx: MyContext) => {

    let user = null;
    let state = ctx.scene.state as AutoBookingState;
    user = state.user;

    const cabinets = user.cabinets;

    const cabinetsButtons = cabinets.map((cabinet) => {
        const cabinetStatus = cabinet.settings.is_active ? '🟢' : '🔴';
        return [Markup.button.callback(`${cabinetStatus} ${cabinet.name}`, `select_cabinet_${cabinet.id}`)];
    });

    const keyboard = Markup.inlineKeyboard(
        [...cabinetsButtons,
            [Markup.button.callback('➕ Добавить кабинет', 'create_cabinet')],
            ...defaultButtonsMenuOnly]
    );

    try {
        await ctx.editMessageText('🫡 Список ваших кабинетов', keyboard);
    } catch (error) {
        logger.error('Error showing cabinets:', error);
        await ctx.reply('🫡 Список ваших кабинетов', keyboard);
        return;
    }
};

const showCabinet = async (ctx: MyContext, cabinetId: string) => {
    const state = ctx.scene.state as AutoBookingState;

    ctx.scene.session.selectedCabinetId = cabinetId;

    const user = state.user;
    const cabinet = user.cabinets.find(cabinet => cabinet.id == cabinetId);

    if (!cabinet) {
        await sendErrorMessage(ctx, 'Кабинет не найден');
        return;
    }

    let actionButton = [];
    if(cabinet.settings.is_active) {
        actionButton = [Markup.button.callback('🔍 Проверить подключение', 'check_connection_' + cabinet.id)]
    } else {
        actionButton = [Markup.button.callback('🔐 Авторизация', 'auth')]
    }
    const keyboard = Markup.inlineKeyboard([
        actionButton,
        [Markup.button.callback('❌ Удалить', 'delete_cabinet_' + cabinet.id)],
        [Markup.button.callback('👈 Назад', 'back')],
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);



    const message = fmt`🫡 ${bold(`Ваш кабинет`)}
    
📝Название кабинета — ${cabinet.name}
Статус — ${cabinet.settings.is_active ? '🟢 Активен' : '🔴 Не активен'}
`;


    try {
        await ctx.editMessageText(message, keyboard);
    } catch (error) {
        logger.error('Error showing cabinet:', error);
        await ctx.reply(message, keyboard);
        return;
    }
};

const handleCabinetSelection = new Composer<MyContext>();
handleCabinetSelection.action(/select_cabinet_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];
    await showCabinet(ctx, cabinetId);
    return ctx.wizard.next();
});

// Define the wizard scene
const showCabinetsScene = new Scenes.WizardScene<MyContext>(
    'showCabinetsScene',
    async (ctx) => {
        await sendListCabinets(ctx);
        return ctx.wizard.next();
    },
    handleCabinetSelection,
);

// Handle actions outside the wizard
showCabinetsScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});

showCabinetsScene.action('back', async (ctx) => {

    const state = ctx.scene.state as AutoBookingState;

    // Так как у нас есть дополнительный шаг - ввод кастомной даты
    ctx.wizard.back();

    await ctx.answerCbQuery('👈 Назад');

    // Determine the new current step
    const currentStep = ctx.wizard.cursor;

    logger.info(`Navigated back to step ${currentStep}`);

    // Call the appropriate send function based on the current step
    switch (currentStep) {
        case 1:
            // Initial step: sendListCabinets
            await sendListCabinets(ctx);
            break;
        default:
            logger.warn(`Unhandled step ${currentStep} in back action`);
            await sendErrorMessage(ctx, 'Неизвестный шаг. Пожалуйста, попробуйте снова.');
            break;
    }
});

showCabinetsScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});

showCabinetsScene.action('create_cabinet', async (ctx) => {
    await ctx.scene.enter('createCabinetWizzard');
});

showCabinetsScene.action(/delete_cabinet_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];

    try {
        await LaravelService.deleteCabinetByTelegramId(ctx.from.id, cabinetId);
        await ctx.answerCbQuery('Кабинет удален', {
            show_alert: true,
        });
        await ctx.scene.enter('main');
        // await cabinetGate(ctx, 'showCabinetsScene');
    } catch (error) {
        await sendErrorMessage(ctx, '❌ Ошибка удаления кабинета');
        return;
    }
    return;
})

showCabinetsScene.action(/check_connection_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];

    const cabinetIdDb = ctx.scene.session.selectedCabinetId;

    try {
        const response = await getDraftsForUser(cabinetId);
        await ctx.answerCbQuery(`Подключение успешно. \nОбнаружено ${response.length} черновиков`, {
            show_alert: true,
        });
    } catch (error) {
        try {
            const state = ctx.scene.state as AutoBookingState;

            const cabinet = state.user.cabinets.find(cabinet => cabinet.id == cabinetIdDb);
            cabinet.settings.state_path = null;
            cabinet.settings.is_active = false;

            await LaravelService.updateCabinetByTelegramId(ctx.from.id, cabinetIdDb, {name: cabinet.name, settings: cabinet.settings});
        } catch (error) {
            console.log('Error updating cabinet:', error);
            await sendErrorMessage(ctx, '❌ Ошибка обновления кабинета');
            return;
        }

        const errorMsg = '❌ Ошибка подключения, пожалуйста, авторизуйтесь заново.';
        const keyboard = Markup.inlineKeyboard([...defaultButtonsAuth]);

        try {
            await ctx.editMessageText(errorMsg, {
                ...keyboard,
                link_preview_options: {
                    is_disabled: true
                },
            });
        } catch (error) {
            logger.error('Error sending error message:', error);
            await ctx.reply(errorMsg, keyboard);
        }
        return;
    }

    return;
});

showCabinetsScene.action('auth', async (ctx) => {
    const state = ctx.scene.state as AutoBookingState;
    const cabinetId = ctx.scene.session.selectedCabinetId;
    const cabinet = state.user.cabinets.find(cabinet => cabinet.id == cabinetId);

    await ctx.scene.enter('reauthCabinetWizzard', {cabinet});
});

export default showCabinetsScene;