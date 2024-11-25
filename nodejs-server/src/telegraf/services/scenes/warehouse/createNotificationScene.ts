import {Composer, Markup, Scenes} from 'telegraf';
import {MyContext} from '../../../types/MyContext';

import {
    enterHandler,
    promptForSum,
    sendSuccessMessage
} from "./createNotificationActions";
import laravelService, {ProductsPaginatedResponse} from "../../../../services/laravelService";

const noKeyboard = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const handleSumInput = new Composer<MyContext>();

handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;

    console.log('ctx.scene.session.notificationForm', ctx.scene.session.notificationForm);
    await sendSuccessMessage(ctx);
});

export const createNotifictationScene = new Scenes.WizardScene<MyContext>(
    'warehouse_create_notification',
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
    // Step 3: Save sum and prompt to enter date
    handleSumInput,
);

createNotifictationScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
createNotifictationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});


createNotifictationScene.action(/^products_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    ctx.session.page = page;
    return enterHandler(ctx); // Reload the handler with the new page
});


createNotifictationScene.action(/^warehouse_product_(\d+)$/, async (ctx) => {
    console.log('warehouse_product_');
    const product_id = parseInt(ctx.match[1], 10);
    console.log('product_id', product_id);
    ctx.scene.session.notificationForm.product_id = product_id;
    const products: ProductsPaginatedResponse = await laravelService.getProductsByTelegramId(ctx.from.id);

    const product = products.allProducts.find(product => product.good_id === product_id);
    ctx.scene.session.notificationForm.product_name = product.title;
    await promptForSum(ctx);
});
