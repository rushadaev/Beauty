import {Composer, Markup, Scenes} from 'telegraf';
import {MyContext} from '../../../types/MyContext';

import {
    deleteNotification,
    enterHandler, promptForAction,
    promptForDateTime,
    promptForNotificationType,
    promptForSum,
    sendSuccessMessage
} from "./editNotificationActions";
import {createNotifictationScene} from "./createNotificationScene";
import laravelService, {ProductsPaginatedResponse} from "../../../../services/laravelService";
import LaravelService from "../../../../services/laravelService";

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const handleActionInput = new Composer<MyContext>();



const handleSumInput = new Composer<MyContext>();

handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;
    await sendSuccessMessage(ctx);
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
    'warehouse_edit_notification',
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
    handleActionInput,
    // Step 3: Save sum and prompt to enter date
    handleSumInput,
);

editNotificationScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
editNotificationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});

editNotificationScene.action(/^products_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    ctx.session.page = page;
    return enterHandler(ctx); // Reload the handler with the new page
});

handleActionInput.action(/^edit_warehouse_product_(\d+)$/, async (ctx) => {
    const notification_id = parseInt(ctx.match[1], 10);
    ctx.scene.session.notificationForm.notification_id = notification_id;
    const productData = await LaravelService.getNotificationsByTelegramId(ctx.from.id, 1, 1, 'product_balance', notification_id);

    const notification = productData.data.find(notification => notification.id === notification_id);
    if(notification.settings.product_name) {
        ctx.scene.session.notificationForm.product_name = notification.settings.product_name;
    }

    if(notification.settings.sum) {
        ctx.scene.session.notificationForm.sum = notification.settings.sum;
    }

    if(notification.settings.product_id) {
        ctx.scene.session.notificationForm.product_id = notification.settings.product_id;
    }

    if(notification.settings.type) {
        ctx.scene.session.notificationForm.type = notification.settings.type;
    }


    await promptForAction(ctx);
});

handleActionInput.action('change_minimal_sum', async (ctx) => {
    await promptForSum(ctx);
    return ctx.wizard.next();
});

// delete
handleActionInput.action('delete_notification', async (ctx) => {
    await deleteNotification(ctx);
});