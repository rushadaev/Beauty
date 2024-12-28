import {Composer, Markup, Scenes} from 'telegraf';
import {MyContext} from '../../../types/MyContext';

import {
    enterHandler,
    promptForDateTime,
    promptForNotificationType,
    promptForSum,
    sendSuccessMessage
} from "./editNotificationActions";

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


//notification_skip_name
handleNameInput.action('notification_skip_name', async (ctx) => {
    await promptForSum(ctx);
});

handleSumInput.action('notification_skip_sum', async (ctx) => {
    await promptForDateTime(ctx);
});





const handleDateTimeInput = new Composer<MyContext>();
handleDateTimeInput.on('text', async (ctx) => {
    ctx.scene.session.notificationForm.dateTime = ctx.message.text;
    await promptForNotificationType(ctx);
});

//notification_skip_date
handleDateTimeInput.action('notification_skip_date', async (ctx) => {
    await promptForNotificationType(ctx);
});



const handleNotificationTypeInput = new Composer<MyContext>();
handleNotificationTypeInput.action('notification_one_time', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'one_time';
    await sendSuccessMessage(ctx);
});

//notification_skip_type
handleNotificationTypeInput.action('notification_skip_type', async (ctx) => {
    await sendSuccessMessage(ctx);
});


handleNotificationTypeInput.action('notification_constant', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'constant';
    await sendSuccessMessage(ctx);
});

export const editNotificationScene = new Scenes.WizardScene<MyContext>(
    'edit_notification',
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

editNotificationScene.command('start', async (ctx) => {
    await ctx.scene.enter('admin_main');
});
editNotificationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
});
