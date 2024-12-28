import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from '../../../../services/laravelService';
import { PaginatedNotifications, Notification } from '../../../types/Notification';
import { formatInTimeZone } from 'date-fns-tz';


interface LaravelApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export const notificationsListScene = new Scenes.BaseScene<MyContext>('notifications_list_scene');

// Вход в сцену - показываем список уведомлений
notificationsListScene.enter(async (ctx) => {
    try {
        const response = await LaravelService.getAdminNotifications(ctx.from.id) as unknown as LaravelApiResponse<PaginatedNotifications>;

        if (!response?.success || !response?.data) {
            await ctx.reply(
                '❌ Ошибка при загрузке уведомлений',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        let notificationsArray: Notification[] = [];

        // Response.data теперь точно содержит PaginatedNotifications
        if (response.data.data) {
            notificationsArray = response.data.data;
        }

        if (notificationsArray.length === 0) {
            await ctx.reply(
                '📝 У вас пока нет активных уведомлений',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        if (notificationsArray.length === 0) {
            await ctx.reply(
                '📝 У вас пока нет активных уведомлений',
                Markup.inlineKeyboard([
                    [Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
            return;
        }

        await ctx.reply(
            '📋 Список ваших уведомлений:\n\n' +
            notificationsArray.map((notif, index) => {
                let formattedTime = notif.notification_datetime;
                if (notif.notification_datetime && typeof notif.notification_datetime === 'string') {
                    try {
                        formattedTime = formatInTimeZone(new Date(notif.notification_datetime), 'Europe/Moscow', 'dd.MM.yyyy HH:mm');
                    } catch (e) {
                        logger.error('Error formatting notification time', { error: e, notification: notif });
                    }
                }
                return `${index + 1}. 📝 ${notif.name}\n` +
                    `💰 Сумма: ${notif.sum ? `${notif.sum} руб.` : 'не указана'}\n` +
                    `🕐 Время: ${formattedTime}\n` +
                    `🔄 Тип: ${notif.type === 'single' ? 'разовое' : 'повторяющееся'}\n`;
            }).join('\n'),
            Markup.inlineKeyboard([
                ...notificationsArray.map(notif => [
                    Markup.button.callback(`✏️ ${notif.name}`, `edit_${notif.id}`)
                ]),
                [Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    } catch (error) {
        logger.error('Error in notifications list scene:', error);
        await ctx.reply('❌ Произошла ошибка при загрузке уведомлений');
    }
});

// Обработка нажатия на уведомление для редактирования
notificationsListScene.action(/edit_(\d+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const notificationId = ctx.match[1];

        const response = await LaravelService.getAdminNotification(parseInt(notificationId)) as LaravelApiResponse<Notification>;
        
        if (!response?.success || !response?.data) {
            await ctx.reply('❌ Уведомление не найдено');
            return;
        }

        const notification = response.data;
        let formattedTime = 'не указано';
        
        if (notification.notification_datetime) {
            try {
                formattedTime = formatInTimeZone(
                    new Date(notification.notification_datetime),
                    'Europe/Moscow',
                    'dd.MM.yyyy HH:mm'
                );
            } catch (error) {
                logger.error('Ошибка форматирования даты', { error, date: notification.notification_datetime });
            }
        }

        ctx.session.selectedNotificationId = parseInt(notificationId);

        await ctx.reply(
            `Выберите, что хотите изменить:\n\n` +
            `📝 Название: ${notification.name || 'не указано'}\n` +
            `💰 Сумма: ${notification.sum ? `${notification.sum} руб.` : 'не указана'}\n` +
            `🕐 Время: ${formattedTime}`,
            Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Название', 'edit_name')],
                [Markup.button.callback('💰 Сумму', 'edit_sum')],
                [Markup.button.callback('🕐 Дату', 'edit_date')],
                [Markup.button.callback('❌ Удалить', 'delete_notification')],
                [Markup.button.callback('👈 Назад', 'back_to_list')],
                [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ])
        );
    } catch (error) {
        logger.error('Ошибка в действии редактирования уведомления:', error);
        await ctx.reply('❌ Произошла ошибка');
    }
});

// Обработчики редактирования
notificationsListScene.action('edit_name', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = 'name';
    await ctx.reply('Введите новое название уведомления:');
});

notificationsListScene.action('edit_sum', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = 'sum';
    await ctx.reply('Введите новую сумму (или 0, если сумма не требуется):');
});

notificationsListScene.action('edit_date', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = 'date';
    await ctx.reply(
        'Введите новую дату и время:\n\n' +
        'Формат: ДД.ММ.ГГГГ ЧЧ:ММ\n' +
        'Например: 25.12.2024 15:00'
    );
});

// Обработка текстовых сообщений для редактирования
// Обработка текстовых сообщений для редактирования
notificationsListScene.on('text', async (ctx) => {
    if (!ctx.session.editField || !ctx.session.selectedNotificationId) {
        return;
    }

    try {
        let updateData: any = {};
        const value = ctx.message.text;

        // Получаем текущее уведомление для проверки его типа
        const currentNotification = await LaravelService.getAdminNotification(ctx.session.selectedNotificationId) as LaravelApiResponse<Notification>;
        
        if (!currentNotification?.success || !currentNotification?.data) {
            throw new Error('Failed to get current notification');
        }

        // Особая обработка для даты
        if (ctx.session.editField === 'date') {
            try {
                // Парсим введённую дату в формате ДД.ММ.ГГГГ ЧЧ:ММ
                const [datePart, timePart] = value.split(' ');
                if (!datePart || !timePart) {
                    throw new Error('Invalid date format');
                }

                const [day, month, year] = datePart.split('.');
                const [hours, minutes] = timePart.split(':');

                // Проверяем все компоненты даты
                if (!day || !month || !year || !hours || !minutes) {
                    throw new Error('Invalid date components');
                }

                // Создаём дату в московском часовом поясе
                const moscowDate = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hours),
                    parseInt(minutes)
                );

                if (isNaN(moscowDate.getTime())) {
                    throw new Error('Invalid date');
                }

                // Преобразуем в UTC для сохранения
                const utcDate = formatInTimeZone(moscowDate, 'Europe/Moscow', "yyyy-MM-dd HH:mm:ss");
                updateData.notification_datetime = utcDate;

                // Для повторяющихся уведомлений сбрасываем дату последней отправки
                if (currentNotification.data.type === 'recurring') {
                    updateData.last_notification_sent_at = null;
                }
            } catch (error) {
                logger.error('Error parsing date:', error);
                await ctx.reply(
                    '❌ Неверный формат даты. Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ\n' +
                    'Например: 25.12.2024 15:00'
                );
                return;
            }
        } else {
            // Для остальных полей просто передаём значение
            updateData[ctx.session.editField] = value;
        }

        const result = await LaravelService.updateAdminNotification(
            ctx.session.selectedNotificationId,
            updateData
        );

        if (result?.success) {
            await ctx.reply(
                '✅ Уведомление успешно обновлено',
                Markup.inlineKeyboard([
                    [Markup.button.callback('👈 К списку уведомлений', 'back_to_list')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
        } else {
            throw new Error('Failed to update notification');
        }

    } catch (error) {
        logger.error('Error updating notification:', error);
        await ctx.reply('❌ Произошла ошибка при обновлении');
    }

    ctx.session.editField = undefined;
});

// Удаление уведомления
notificationsListScene.action('delete_notification', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        if (!ctx.session.selectedNotificationId) {
            throw new Error('No notification selected');
        }

        const success = await LaravelService.deleteAdminNotification(ctx.session.selectedNotificationId);

        if (success) {
            await ctx.reply(
                '✅ Уведомление удалено',
                Markup.inlineKeyboard([
                    [Markup.button.callback('👈 К списку уведомлений', 'back_to_list')],
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
        } else {
            throw new Error('Failed to delete notification');
        }

    } catch (error) {
        logger.error('Error deleting notification:', error);
        await ctx.reply('❌ Произошла ошибка при удалении уведомления');
    }
});

// Навигация
notificationsListScene.action('back_to_list', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = undefined;
    ctx.session.selectedNotificationId = undefined;
    await ctx.scene.reenter();
});

notificationsListScene.action('create_notification', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_create_scene');
});

notificationsListScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

export default notificationsListScene;