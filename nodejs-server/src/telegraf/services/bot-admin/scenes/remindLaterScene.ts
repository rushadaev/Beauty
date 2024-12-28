import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from '../../../../services/laravelService';
import moment from 'moment'; // Изменен импорт
import 'moment-timezone';

export const remindLaterScene = new Scenes.BaseScene<MyContext & { scene: { state: RemindLaterSceneState } }>('remind_later_scene');


interface NotificationResponse {
    success: boolean;
    message?: string;
    data?: any;
}

interface RemindLaterSceneState {
    notificationId: string;
}

// Обработчик входа в сцену
remindLaterScene.enter(async (ctx) => {
    try {
        const { state } = ctx.scene;
        const notificationId = state?.notificationId;
        
        logger.info('Entering remind later scene:', {
            state,
            notificationId,
            scene_state: ctx.scene.state
        });
        
        if (!notificationId) {
            logger.error('No notification ID provided');
            await ctx.reply('❌ Произошла ошибка. Попробуйте снова.');
            await ctx.scene.leave();
            return;
        }

        await ctx.reply(
            '⏰ Выберите время для повторного напоминания:',
            Markup.inlineKeyboard([
                [Markup.button.callback('🕐 Через 15 минут', `remind_15_${notificationId}`)],
                [Markup.button.callback('🕐 Через час', `remind_60_${notificationId}`)],
                [Markup.button.callback('📅 Завтра в это же время', `remind_tomorrow_${notificationId}`)],
                [Markup.button.callback('❌ Отмена', 'cancel_remind')]
            ])
        );
    } catch (error) {
        logger.error('Error in remind later scene enter:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте снова.');
        await ctx.scene.leave();
    }
});

// Обработчик для напоминания через 15 минут
remindLaterScene.action(/remind_15_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const notificationId = ctx.match[1];
    await handleReschedule(ctx, notificationId, 15, 'minutes');
});

// Обработчик для напоминания через час
remindLaterScene.action(/remind_60_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const notificationId = ctx.match[1];
    await handleReschedule(ctx, notificationId, 1, 'hours');
});

// Обработчик для напоминания завтра
remindLaterScene.action(/remind_tomorrow_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const notificationId = ctx.match[1];
    await handleReschedule(ctx, notificationId, 24, 'hours');
});

// Обработчик отмены
remindLaterScene.action('cancel_remind', async (ctx) => {
    await ctx.answerCbQuery('Отменено');
    await ctx.reply('❌ Перенос напоминания отменён');
    await ctx.scene.leave();
});

// Функция для обработки переноса уведомления
async function handleReschedule(
    ctx: MyContext,
    notificationId: string,
    amount: number,
    unit: 'minutes' | 'hours'
) {
    try {
        // Добавляем минуты/часы к текущему UTC времени
        const utcDateTime = moment().utc()
            .add(amount, unit)
            .format('YYYY-MM-DD HH:mm:00');

        // Для отображения конвертируем в московское время
        const mskDisplayTime = moment().utc()
            .add(amount, unit)
            .tz('Europe/Moscow')
            .format('DD.MM.YYYY HH:mm');

        const result = await LaravelService.rescheduleNotification(
            parseInt(notificationId),
            utcDateTime // отправляем время в UTC
        );

        if (result?.success) {
            await ctx.reply(
                `✅ Напоминание перенесено на ${mskDisplayTime}`, // показываем московское время
                Markup.inlineKeyboard([
                    [Markup.button.callback('🏠 Главное меню', 'mainmenu')]
                ])
            );
        } else {
            throw new Error('Failed to reschedule notification');
        }
    } catch (error) {
        logger.error('Error rescheduling notification:', error);
        await ctx.reply('❌ Произошла ошибка при переносе уведомления');
    }
    
    await ctx.scene.leave();
}
    


export default remindLaterScene;