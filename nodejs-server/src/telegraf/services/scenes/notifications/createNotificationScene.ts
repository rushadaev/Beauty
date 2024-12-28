import {Composer, Markup, Scenes} from 'telegraf';
import {MyContext} from '../../../types/MyContext';

import {
    enterHandler,
    promptForDateTime,
    promptForNotificationType,
    promptForSum,
    sendSuccessMessage
} from "./createNotificationActions";
import {fmt} from "telegraf/format";
import {sendOrderConfirmation} from "../actions/autoBookingActions";

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const handleNameInput = new Composer<MyContext>();

handleNameInput.on('text', async (ctx) => {
    const name = ctx.message.text;
    ctx.scene.session.notificationForm.name = name;

    await promptForSum(ctx);
});

const handleSumInput = new Composer<MyContext>();

handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;
    await promptForDateTime(ctx);
});

handleSumInput.action('notification_skip_sum', async (ctx) => {
    ctx.scene.session.notificationForm.sum = null;
    await promptForDateTime(ctx);
});

const handleDateTimeInput = new Composer<MyContext>();

handleDateTimeInput.on('text', async (ctx) => {
    //date in format dd.mm.yyyy hh:mm
    const input = ctx.message.text;

    // Regular expression to match dd.mm.yyyy hh:mm
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;

    // Find dates that do not match the regex
    const invalidFormatDate = !dateRegex.test(input);

    if (invalidFormatDate) {
        const errorMessage = fmt`❌ Некорректный формат даты: ${invalidFormatDate}.
Пожалуйста, введите дату в формате ГГГГ.ММ.ДД. Например:
• 2025.08.10 12:00`;

        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, {
            ...Markup.inlineKeyboard(noKeyboard),
            link_preview_options: {
                is_disabled: true
            },
        });

        return; // Stay on the current step
    }

    // If all dates are valid, save them to the session
    ctx.scene.session.notificationForm.dateTime = ctx.message.text;
    await promptForNotificationType(ctx);
});


const handleNotificationTypeInput = new Composer<MyContext>();
handleNotificationTypeInput.action('notification_one_time', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'one_time';
    await sendSuccessMessage(ctx);
});
handleNotificationTypeInput.action('notification_constant', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'constant';
    await sendSuccessMessage(ctx);
});

export const createNotifictationScene = new Scenes.WizardScene<MyContext>(
    'create_notification',
    // Step 1: Prompt to enter name
    async (ctx) => {
        ctx.scene.session.notificationForm = {
            name: null,
            sum: null,
            dateTime: null,
            type: null,
        }
       await enterHandler(ctx);
    },
    // Step 2: Save name and prompt to enter sum
    handleNameInput,
    // Step 3: Save sum and prompt to enter date
    handleSumInput,
    // Step 4: Save date and prompt to enter type
    handleDateTimeInput,
    // Step 5: Save type and sucecss
    handleNotificationTypeInput,
);

createNotifictationScene.command('start', async (ctx) => {
    await ctx.scene.enter('admin_main');
});
createNotifictationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
});
