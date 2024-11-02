// ./scenes/autoBookingWizard.ts

import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext, AutoBookingState } from '../../types/MyContext';
import logger from '../../../utils/logger/loggerTelegram';
import LaravelService from "../../../services/laravelService";
import CacheService from '../../../utils/redis/Cache/Cache';
import { getDraftsForUser } from "../../../services/wildberriesService";
import { searchRequestsScene } from "./searchRequestsScene";
import { BOX_TYPES, COEFFICIENTS, DATES, WAREHOUSES } from "../../../utils/wildberries/consts";
import {
    sendCabinetSelection,
    sendDraftSelection,
    sendWarehouseSelection,
    sendCoefficientSelection,
    sendBoxTypeSelection,
    sendDateSelection,
    sendOrderConfirmation,
    sendFinalConfirmation,
    sendErrorMessage, sendCustomDatePrompt, sendPalletCountPrompt, sendInstructions,
} from './actions/autoBookingActions';
import {fmt} from "telegraf/format";

// Default buttons with Back and Main Menu
const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'back')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

// Composer instances for each step
const handleCabinetSelection = new Composer<MyContext>();
handleCabinetSelection.action(/select_cabinet_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];
    ctx.session.autobookingForm.cabinetId = cabinetId;
    try {
        await sendInstructions(ctx);
        return ctx.wizard.next();
    }
    catch (error) {
        logger.error('Error sending draft selection:', error);
        return ;
    }
});

const handleDraftSelection = new Composer<MyContext>();
handleDraftSelection.action(/select_draft_(.+)/, async (ctx) => {
    const draftId = ctx.match[1];
    ctx.session.autobookingForm.draftId = draftId;
    await sendWarehouseSelection(ctx);
    return ctx.wizard.next();
});

const handleWarehouseSelection = new Composer<MyContext>();
handleWarehouseSelection.action(/select_warehouse_(.+)/, async (ctx) => {
    const warehouseId = ctx.match[1];
    ctx.session.autobookingForm.warehouseId = warehouseId;
    await sendCoefficientSelection(ctx);
    return ctx.wizard.next();
});

const handleCoefficientSelection = new Composer<MyContext>();
handleCoefficientSelection.action(/wh_coefficient_set_(.+)/, async (ctx) => {
    const coefficient = ctx.match[1];
    ctx.session.autobookingForm.coefficient = coefficient;
    await sendBoxTypeSelection(ctx);
    return ctx.wizard.next();
});

const handleBoxTypeSelection = new Composer<MyContext>();
handleBoxTypeSelection.action(/wh_box_type_set_(.+)/, async (ctx) => {
    const boxType = ctx.match[1];
    ctx.session.autobookingForm.boxTypeId = boxType;

    // If boxType === 5 (Monopallet), then prompt for pallet count
    if (boxType === '5') {
        await sendPalletCountPrompt(ctx);
        return ctx.wizard.next();
    }

    await sendDateSelection(ctx);
    return ctx.wizard.selectStep(ctx.wizard.cursor + 2);
});

const handlePalletCount = new Composer<MyContext>();
handlePalletCount.on('text', async (ctx) => {
    const text = ctx.message.text;
    const count = parseInt(text, 10);

    if (isNaN(count) || count < 1) {
        await ctx.reply('❌ Некорректное количество паллет. Пожалуйста, введите число больше 0.');
        return;
    }

    ctx.session.autobookingForm.monopalletCount = count;
    await sendDateSelection(ctx);
    return ctx.wizard.next();
});

const handleDateSelection = new Composer<MyContext>();
handleDateSelection.action(/wh_date_set_(.+)/, async (ctx) => {
    const date = ctx.match[1];
    if (date === 'customdates') {
        await sendCustomDatePrompt(ctx); // Send prompt for custom dates
        return ctx.wizard.next(); // Move to handleCustomDateInput step
    } else {
        await sendOrderConfirmation(ctx, date);
        return ctx.wizard.selectStep(ctx.wizard.cursor + 2); // Skip custom date input step
    }
});

const handleCustomDateInput = new Composer<MyContext>();
handleCustomDateInput.on('text', async (ctx) => {
    const input = ctx.message.text;
    const dates = input.split(',').map(date => date.trim());

    // Regular expression to match DD.MM.YYYY format
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;

    // Find dates that do not match the regex
    const invalidFormatDates = dates.filter(date => !dateRegex.test(date));

    if (invalidFormatDates.length > 0) {
        const errorMessage = fmt`❌ Некорректный формат даты: ${invalidFormatDates.join(', ')}.
Пожалуйста, введите даты в формате ДД.ММ.ГГГГ, разделяя их запятыми. Например:
• 10.08.2025, 12.08.2025`;

        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, {
            ...Markup.inlineKeyboard([...defaultButtons]),
            link_preview_options: {
                is_disabled: true
            },
        });

        return; // Stay on the current step
    }

    // Optional: Further validate if the dates are actual calendar dates
    const invalidDates = [];
    const validDates = [];

    dates.forEach(dateStr => {
        const [day, month, year] = dateStr.split('.').map(Number);
        const dateObj = new Date(year, month - 1, day);
        if (
            dateObj.getFullYear() === year &&
            dateObj.getMonth() === month - 1 &&
            dateObj.getDate() === day
        ) {
            validDates.push(dateStr);
        } else {
            invalidDates.push(dateStr);
        }
    });

    if (invalidDates.length > 0) {
        const errorMessage = fmt`❌ Некорректные даты: ${invalidDates.join(', ')}.
Пожалуйста, убедитесь, что введённые даты существуют и находятся в формате ДД.ММ.ГГГГ.`;

        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, {
            ...Markup.inlineKeyboard([...defaultButtons]),
            link_preview_options: {
                is_disabled: true
            },
        });

        return; // Stay on the current step
    }

    // If all dates are valid, save them to the session
    ctx.session.autobookingForm.dates = validDates;

    // Proceed to order confirmation
    await sendOrderConfirmation(ctx, 'customdates');
    return ctx.wizard.next();
});

const handleOrderConfirmation = new Composer<MyContext>();
handleOrderConfirmation.action('confirm_order', async (ctx) => {
    try {
        await sendFinalConfirmation(ctx);
        return ctx.scene.leave();
    } catch {
        return;
    }
});

// Define the wizard scene
const autoBookingWizard = new Scenes.WizardScene<MyContext>(
    'autoBookingWizard',
    async (ctx) => {
        ctx.session.page = 1;
        ctx.session.autobookingForm = {
            draftId: null,
            cabinetId: null,
            warehouseId: null,
            coefficient: null,
            dates: [],
            checkUntilDate: null,
            boxTypeId: null,
            monopalletCount: null,
            isBooking: true,
        };

        let user = null;
        let state = ctx.scene.state as AutoBookingState;
        user = state.user;

        const cabinets = user.cabinets;
        await sendCabinetSelection(ctx, cabinets);
        return ctx.wizard.next();
    },
    handleCabinetSelection,
    async (ctx) => {
        try {
            await sendDraftSelection(ctx);
            return ctx.wizard.next();
        }
        catch (error) {
            logger.error('Error sending draft selection:', error);
            return ;
        }
    },

    handleDraftSelection,
    handleWarehouseSelection,
    handleCoefficientSelection,
    handleBoxTypeSelection,
    handlePalletCount,
    handleDateSelection,
    handleCustomDateInput,
    handleOrderConfirmation,
);

// Handle actions outside the wizard
autoBookingWizard.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});

autoBookingWizard.action('back', async (ctx) => {

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
            // Initial step: sendCabinetSelection
            await sendCabinetSelection(ctx, state.user.cabinets);
            break;
        case 2:
            // After Cabinet Selection: sendInstructions
            await sendInstructions(ctx);
            break;
        case 3:
            // After Instructions: sendDraftSelection
            await sendDraftSelection(ctx);
            break;
        case 4:
            // After Draft Selection: sendWarehouseSelection
            await sendWarehouseSelection(ctx);
            break;
        case 5:
            // After Warehouse Selection: sendCoefficientSelection
            await sendCoefficientSelection(ctx);
            break;
        case 6:
            // After Coefficient Selection: sendBoxTypeSelection
            await sendBoxTypeSelection(ctx);
            break;
        case 7:
            if (ctx.session.autobookingForm.boxTypeId === '5') {
                // After Monopallet Count: sendPalletCountPrompt
                await sendPalletCountPrompt(ctx);
            } else {
                ctx.wizard.selectStep(6);
                await sendBoxTypeSelection(ctx);
            }
            break;
        case 8:
            // After Box Type Selection: sendDateSelection
            await sendDateSelection(ctx);
            break;
        case 9:
            // After Date Selection (either standard or custom): sendDateSelection
            // currentStep is 7 because of the custom date input step, but we want to skip it to let user re-enter dates
            ctx.wizard.selectStep(8);
            await sendDateSelection(ctx);
            break;
        case 10:
            // After Date Selection: sendOrderConfirmation
            await sendOrderConfirmation(ctx, ctx.session.autobookingForm.checkUntilDate || 'customdates');
            break;
        default:
            logger.warn(`Unhandled step ${currentStep} in back action`);
            await sendErrorMessage(ctx, 'Неизвестный шаг. Пожалуйста, попробуйте снова.');
            break;
    }
});

autoBookingWizard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});

autoBookingWizard.action('warehouses_next', async (ctx: MyContext) => {
    if (ctx.session.page) {
        logger.info('Incrementing page number');
        ctx.session.page += 1;
        await sendWarehouseSelection(ctx);
    } else {
        logger.warn('Page number not set');
        ctx.session.page = 1;
        await ctx.scene.reenter();
    }
});

autoBookingWizard.action('warehouses_prev', async (ctx: MyContext) => {
    if (ctx.session.page && ctx.session.page > 1) {
        ctx.session.page -= 1;
        await sendWarehouseSelection(ctx);
    } else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});

autoBookingWizard.action('create_cabinet', async (ctx: MyContext) => {
    await ctx.scene.enter('createCabinetWizzard');
});
// Export the scene
export default autoBookingWizard;