import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import LaravelService from '../../../../services/laravelService';
import logger from '../../../../utils/logger/loggerTelegram';

export const productsScene = new Scenes.BaseScene<MyContext>('products_scene');

productsScene.enter(async (ctx) => {
    try {
        // Читаем из общей сессии
        const branchId = parseInt(ctx.session.selectedBranchId, 10);
        
        console.log('Products scene enter:', {
            sessionBranchId: ctx.session.selectedBranchId,
            parsedBranchId: branchId
        });
        
        if (!branchId || isNaN(branchId)) {
            await ctx.reply('Филиал не выбран');
            return ctx.scene.enter('select_branch_scene');
        }

        // Получаем товары филиала
        const response = await LaravelService.getProducts(branchId);
        
        if (!response?.success || !response?.data) {
            await ctx.reply('В этом филиале нет товаров');
            return ctx.scene.enter('select_branch_scene');
        }

        const products = response.data;
        const buttons = [];
        
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            buttons.push([
                Markup.button.callback(
                    `${product.title} (${product.actual_amounts?.[0]?.amount || 0} шт)`, 
                    `product_${product.good_id}`
                )
            ]);
        }

        buttons.push([
            Markup.button.callback('👈 Назад к филиалам', 'back_to_branches'),
            Markup.button.callback('🏠 Главное меню', 'mainmenu')
        ]);

        const messageText = 'Выберите товар для которого нужно отслеживать остаток:';
        
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(messageText, Markup.inlineKeyboard(buttons));
        } else {
            await ctx.reply(messageText, Markup.inlineKeyboard(buttons));
        }

    } catch (error) {
        console.error('Error in products scene:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров');
        return ctx.scene.enter('select_branch_scene');
    }
});

productsScene.action('back_to_branches', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('select_branch_scene');
});

productsScene.action('warehouse_list', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse_notifications_list');
});

productsScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});

productsScene.action(/^product_(\d+)$/, async (ctx) => {
    try {
        const productId = ctx.match[1];
        
        logger.info('Начало обработки выбора продукта:', {
            productId,
            branch_id: ctx.session.selectedBranchId,
            user_id: ctx.from?.id
        });

        // Сохраняем ID в session (не scene.session!)
        ctx.session.selectedProductId = productId;
        
        logger.info('Переход к сцене создания уведомления', {
            selectedProductId: productId,
            session: ctx.session
        });

        // Сначала делаем переход
        const result = await ctx.scene.enter('create_warehouse_notification_scene');
        
        // Только потом отвечаем на callback
        await ctx.answerCbQuery('Товар выбран ✓');

        logger.info('Переход выполнен', { 
            success: true,
            currentScene: ctx.scene.current?.id
        });

    } catch (error) {
        logger.error('Ошибка при выборе продукта:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            productId: ctx.match?.[1],
            userId: ctx.from?.id
        });
        
        await ctx.answerCbQuery('Произошла ошибка ❌');
        await ctx.reply(
            'Произошла ошибка при выборе товара. Попробуйте еще раз.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Попробовать снова', 'refresh_products')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    }
});

productsScene.action('refresh_products', async (ctx) => {
    await ctx.answerCbQuery('Обновляем список... ⌛');
    await ctx.scene.reenter();
});