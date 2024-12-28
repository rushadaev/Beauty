import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from '../../../../services/laravelService';

export const warehouseNotificationsListScene = new Scenes.BaseScene<MyContext>('warehouse_notifications_list');

warehouseNotificationsListScene.enter(async (ctx) => {
    try {

        const branchId = parseInt(ctx.session.selectedBranchId, 10);
        
        // Добавляем логирование
        logger.info('Fetching warehouse notifications:', {
            telegramId: ctx.from.id,
            branchId: branchId
        });
        // Получаем все активные уведомления
        const response = await LaravelService.getWarehouseNotifications(
            ctx.from.id,
            branchId
        );

        // Добавляем проверку ответа
        logger.info('Notifications response:', response);

        if (!response?.success || !response?.data?.data?.length) {
            await ctx.reply(
                'Нет активных уведомлений об остатках',
                Markup.inlineKeyboard([
                    [Markup.button.callback('👈 Назад', 'back_to_warehouse')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        const notifications = response.data.data;

        const buttons = notifications.map(notification => [
            Markup.button.callback(
                `${notification.product.title} | ${notification.company?.title || 'Неизвестный филиал'} (мин: ${notification.min_amount})`,
                `notification_${notification.id}`
            )
        ]);

        buttons.push([
            Markup.button.callback('👈 Назад', 'back_to_warehouse'),
            Markup.button.callback('🏠 Главное меню', 'mainmenu')
        ]);

        const messageText = 'Выберите товар чтобы изменить или удалить отслеживание:';

        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(messageText, Markup.inlineKeyboard(buttons));
        } else {
            await ctx.reply(messageText, Markup.inlineKeyboard(buttons));
        }
    } catch (error) {
        logger.error('Error in warehouseNotificationsListScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке уведомлений');
    }
});

warehouseNotificationsListScene.action(/^notification_(\d+)$/, async (ctx) => {
    try {
        const notificationId = parseInt(ctx.match[1], 10);
        
        // Добавим логирование
        logger.info('Fetching single notification:', { notificationId });
        
        // Вызываем специальный метод для получения одного уведомления
        const response = await LaravelService.getWarehouseNotification(notificationId); // Изменим метод

        if (!response?.success || !response?.data) {
            throw new Error('Notification not found');
        }

        const notification = response.data;
        ctx.session.selectedNotificationId = notificationId;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Изменить мин. кол-во', 'edit_amount')],
            [Markup.button.callback('🗑 Удалить уведомление', 'delete_notification')],
            [Markup.button.callback('👈 Назад', 'back_to_list')],
            [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);

        await ctx.editMessageText(
            `[${notification.product.title}]\n` +
            `Фактическое кол-во на складе: ${notification.current_amount}\n` +
            `Мин. кол-во для уведомления: ${notification.min_amount}`,
            keyboard
        );
    } catch (error) {
        logger.error('Error displaying notification:', error);
        await ctx.reply('Произошла ошибка при загрузке информации об уведомлении');
    }
});

// Обработчики действий
warehouseNotificationsListScene.action('edit_amount', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Введите новое минимальное количество для уведомления:');
    ctx.session.isEditing = true; // Устанавливаем флаг редактирования
});

// Добавляем обработчик текстовых сообщений
// В обработчике текстовых сообщений
warehouseNotificationsListScene.on('text', async (ctx) => {
    if (ctx.session.isEditing) {
        try {
            const newAmount = parseInt(ctx.message.text, 10);
            
            if (isNaN(newAmount) || newAmount < 0) {
                await ctx.reply('Пожалуйста, введите корректное положительное число');
                return;
            }

            const notificationId = ctx.session.selectedNotificationId;

            // Добавим проверку наличия ID уведомления
            if (!notificationId) {
                throw new Error('ID уведомления не найден');
            }
            
            // Добавим логирование
            logger.info('Updating notification:', {
                notificationId,
                newAmount
            });

            // Обновляем уведомление
            const response = await LaravelService.updateWarehouseNotification(
                notificationId,
                { min_amount: newAmount }
            );

            logger.info('Update response:', response);

            if (!response?.success) {
                throw new Error(response?.message || 'Не удалось обновить уведомление');
            }

            // Получаем обновлённое уведомление
            const updatedNotification = await LaravelService.getWarehouseNotification(notificationId);

            if (!updatedNotification?.success) {
                throw new Error('Не удалось получить обновленное уведомление');
            }

            // Возвращаем к просмотру уведомления
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Изменить мин. кол-во', 'edit_amount')],
                [Markup.button.callback('🗑 Удалить уведомление', 'delete_notification')],
                [Markup.button.callback('👈 Назад', 'back_to_list')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]);

            await ctx.reply(
                `✅ Минимальное количество обновлено!\n\n` +
                `[${updatedNotification.data.product.title}]\n` +
                `Фактическое кол-во на складе: ${updatedNotification.data.current_amount}\n` +
                `Мин. кол-во для уведомления: ${newAmount}`,
                keyboard
            );

            // Сбрасываем флаг редактирования
            ctx.session.isEditing = false;

        } catch (error) {
            logger.error('Error updating notification amount:', error);
            await ctx.reply('Произошла ошибка при обновлении минимального количества: ' + error.message);
            ctx.session.isEditing = false;
        }
    }
});

warehouseNotificationsListScene.action('delete_notification', async (ctx) => {
    await ctx.answerCbQuery();
    // Показываем подтверждение удаления
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Да, удалить', 'confirm_delete'),
            Markup.button.callback('❌ Отмена', 'cancel_delete')
        ]
    ]);

    await ctx.editMessageText(
        'Вы уверены, что хотите удалить это уведомление?',
        keyboard
    );
});

warehouseNotificationsListScene.action('confirm_delete', async (ctx) => {
    try {
        const notificationId = ctx.session.selectedNotificationId;
        await LaravelService.deleteWarehouseNotification(notificationId);

        await ctx.editMessageText(
            'Товар удален из отслеживания.',
            Markup.inlineKeyboard([
                [Markup.button.callback('📋 Все уведомления', 'back_to_list')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    } catch (error) {
        logger.error('Error deleting notification:', error);
        await ctx.reply('Произошла ошибка при удалении уведомления');
    }
});

warehouseNotificationsListScene.action('cancel_delete', async (ctx) => {
    await ctx.answerCbQuery('Отменено');
    return ctx.scene.reenter();
});

warehouseNotificationsListScene.action('back_to_warehouse', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse');
});

warehouseNotificationsListScene.action('back_to_list', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

warehouseNotificationsListScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});

export default warehouseNotificationsListScene;