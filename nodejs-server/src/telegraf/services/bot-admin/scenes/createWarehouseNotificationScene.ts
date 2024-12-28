import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import { code, fmt } from "telegraf/format";
import logger from "../../../../utils/logger/loggerTelegram";
import LaravelService from "../../../../services/laravelService";

// Кнопки по умолчанию
const defaultButtons = [
   [Markup.button.callback('👈 Назад', 'back_to_products')],
   [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
];

const defaultButtonsMenuOnly = [
   [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
];

// Создаем WizardScene
export const createWarehouseNotificationScene = new Scenes.WizardScene<MyContext>(
    'create_warehouse_notification_scene',
    // Шаг 1
    async (ctx) => {
        logger.info('Первый шаг создания уведомления', {
            selectedProductId: ctx.session.selectedProductId,
            scene: ctx.scene.current?.id
        });

        try {
            if (!ctx.session?.selectedProductId) {
                throw new Error('Продукт не выбран');
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('Отмена', 'back_to_products')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]);

            await ctx.reply('Введите минимальное количество товара, при достижении которого нужно отправить уведомление:', keyboard);
            
            return ctx.wizard.next();
        } catch (error) {
            logger.error('Ошибка в первом шаге:', error);
            await ctx.reply('Произошла ошибка. Возвращаемся к выбору продукта.');
            return ctx.scene.enter('products_scene');
        }
    },
   // Шаг 2: Подтверждение
   // Шаг 2: Подтверждение
async (ctx) => {
    logger.info('Вход во второй шаг', {
        message: ctx.message,
        session: ctx.scene.session,
        wizard_state: ctx.wizard?.state
    });

    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Пожалуйста, введите число.');
        return;
    }

    const amount = parseInt(ctx.message.text, 10);
    if (isNaN(amount) || amount < 0) {
        await ctx.reply('Пожалуйста, введите положительное число.');
        return;
    }

    try {
        // Инициализируем объект, если его нет
        if (!ctx.session.warehouseForm) {
            ctx.session.warehouseForm = {
                productId: ctx.session.selectedProductId,
                minAmount: null,
                type: 'warehouse'
            };
        }

        // Теперь безопасно устанавливаем значение
        ctx.session.warehouseForm.minAmount = amount;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✅ Подтвердить', 'confirm_warehouse_notification')],
            [Markup.button.callback('❌ Отмена', 'back_to_products')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);

        const message = fmt`Проверьте настройки уведомления:

${code('Минимальное количество')}: ${amount}

Подтвердите создание уведомления.`;

        await ctx.reply(message, keyboard);

        logger.info('Подтверждение настроек отправлено', {
            amount,
            form: ctx.session.warehouseForm
        });

    } catch (error) {
        logger.error('Ошибка во втором шаге:', error);
        await ctx.reply('Произошла ошибка при обработке данных. Попробуйте еще раз.');
        return ctx.scene.enter('products_scene');
    }
}
);

// Добавляем обработчики действий
createWarehouseNotificationScene.action('confirm_warehouse_notification', async (ctx) => {
    try {
        // Берем form из ctx.session вместо ctx.scene.session
        const form = ctx.session.warehouseForm;
        
        logger.info('Попытка создания уведомления', {
            form,
            user_id: ctx.from?.id
        });
        
        if (!form || !form.productId || !form.minAmount) {
            throw new Error('Неполные данные формы');
        }

        const result = await LaravelService.createWarehouseNotification(
            ctx.from.id,
            {
                productId: form.productId,
                minAmount: form.minAmount,
                type: 'warehouse',
                branchId: ctx.session.selectedBranchId // Добавляем из сессии
            }
        );

        if (!result) {
            throw new Error('Failed to create notification');
        }

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📝 Создать еще', 'back_to_products')],
            [Markup.button.callback('📋 Все уведомления', 'warehouse_list')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);

        const message = fmt`✅ Уведомление создано

Когда количество товара достигнет ${code(form.minAmount.toString())} единиц, 
вы получите уведомление.`;

        await ctx.reply(message, keyboard);
        await ctx.answerCbQuery('Уведомление создано');

        logger.info('Уведомление успешно создано', {
            form,
            user_id: ctx.from?.id
        });

    } catch (error) {
        logger.error('Error creating notification:', error);
        await ctx.reply(
            'Произошла ошибка при создании уведомления. Попробуйте позже.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    }
});

createWarehouseNotificationScene.action('back_to_products', async (ctx) => {
    logger.info('Возврат к списку продуктов');
    await ctx.answerCbQuery();
    return ctx.scene.enter('products_scene');
});

createWarehouseNotificationScene.action('warehouse_list', async (ctx) => {
    logger.info('Переход к списку уведомлений');
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse_notifications_list');
});

createWarehouseNotificationScene.action('mainmenu', async (ctx) => {
   logger.info('Возврат в главное меню');
   await ctx.answerCbQuery();
   return ctx.scene.enter('admin_main');
});

// Обработка необработанных callback-запросов
// Обработка необработанных callback-запросов




// Обработка текстовых сообщений вне шагов
createWarehouseNotificationScene.on('text', async (ctx, next) => {
   logger.info('Получено текстовое сообщение', {
       step: ctx.wizard?.cursor,
       text: ctx.message.text
   });
   
   if (ctx.wizard?.cursor === 0 || ctx.wizard?.cursor === 1) {
       return next();
   }
   
   await ctx.reply('Пожалуйста, используйте доступные команды.');
});

export default createWarehouseNotificationScene;