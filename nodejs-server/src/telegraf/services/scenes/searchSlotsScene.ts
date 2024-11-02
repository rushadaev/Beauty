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
import {fmt} from "telegraf/format";
import {cabinetGate} from "../../utils/cabinetGate";

// Default buttons with Back and Main Menu
const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'back')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

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

    await sendDateSelection(ctx);
    return ctx.wizard.next();
});

const handleDateSelection = new Composer<MyContext>();
handleDateSelection.action(/wh_date_set_(.+)/, async (ctx) => {
    const date = ctx.match[1];
    console.log('date', date);
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

    // Regular expression to match YYYY.MM.DD format
    const dateRegex = /^\d{4}\.\d{2}\.\d{2}$/;

    // Find dates that do not match the regex
    const invalidFormatDates = dates.filter(date => !dateRegex.test(date));

    if (invalidFormatDates.length > 0) {
        const errorMessage = fmt`❌ Некорректный формат даты: ${invalidFormatDates.join(', ')}.
Пожалуйста, введите даты в формате ГГГГ.ММ.ДД, разделяя их запятыми. Например:
• 2025.08.10, 2025.08.12`;

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
        const [year, month, day] = dateStr.split('.').map(Number);
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
Пожалуйста, убедитесь, что введённые даты существуют и находятся в формате ГГГГ.ММ.ДД.`;

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
    await sendFinalConfirmation(ctx);
    return;
});

// Define the wizard scene
const searchSlotsWizard = new Scenes.WizardScene<MyContext>(
    'searchSlotsWizard',
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
            isBooking: false,
        };


        await sendSearchSlotMessage(ctx);
        return ctx.wizard.next();
    },
    async (ctx) => {
       await sendWarehouseSelection(ctx);
       return ctx.wizard.next();
    },
    handleWarehouseSelection,
    handleCoefficientSelection,
    handleBoxTypeSelection,
    handleDateSelection,
    handleCustomDateInput,
    handleOrderConfirmation,
);

// Handle actions outside the wizard
searchSlotsWizard.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});

searchSlotsWizard.action('back', async (ctx) => {

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
            // Initial step: sendSearchSlotMessage
            await sendSearchSlotMessage(ctx);
            break;
        case 2:
            // After Draft Selection: sendWarehouseSelection
            await sendWarehouseSelection(ctx);
            break;
        case 3:
            // After Warehouse Selection: sendCoefficientSelection
            await sendCoefficientSelection(ctx);
            break;
        case 4:
            // After Coefficient Selection: sendBoxTypeSelection
            await sendBoxTypeSelection(ctx);
            break;
        case 5:
            // After Box Type Selection: sendDateSelection
            await sendDateSelection(ctx);
            break;
        case 6:
            // After Date Selection (either standard or custom): sendDateSelection
            // currentStep is 7 because of the custom date input step, but we want to skip it to let user re-enter dates
            ctx.wizard.selectStep(5);
            await sendDateSelection(ctx);
            break;
        case 7:
            // After Date Selection: sendOrderConfirmation
            await sendOrderConfirmation(ctx, ctx.session.autobookingForm.checkUntilDate || 'customdates');
            break;
        default:
            logger.warn(`Unhandled step ${currentStep} in back action`);
            await sendErrorMessage(ctx, 'Неизвестный шаг. Пожалуйста, попробуйте снова.');
            break;
    }
});

searchSlotsWizard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});

searchSlotsWizard.action('warehouses_next', async (ctx: MyContext) => {
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

searchSlotsWizard.action('warehouses_prev', async (ctx: MyContext) => {
    if (ctx.session.page && ctx.session.page > 1) {
        ctx.session.page -= 1;
        await sendWarehouseSelection(ctx);
    } else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});

searchSlotsWizard.command('autobooking', async (ctx: MyContext) => {
    await cabinetGate(ctx, 'autoBookingWizard');
});

// Export the scene
export default searchSlotsWizard;