import { Scenes, Markup } from 'telegraf';
import { MyContext, CancelBookingState } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';

export const cancelBookingScene = new Scenes.BaseScene<MyContext>('cancel_booking_scene');

cancelBookingScene.enter(async (ctx: MyContext) => {
    const state = ctx.scene.state as CancelBookingState;

    try {
        if (!state?.recordId) {
            return ctx.reply(
                '❌ Ошибка: не выбрана запись для отмены',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записям', 'back_to_records')
                ]])
            );
        }

        // Сохраняем состояние в сессии для использования в других обработчиках
        ctx.session.cancelBookingState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };

        await ctx.reply(
            'Вы уверены, что хотите отменить эту запись?\n\n' +
            '⚠️ Это действие нельзя отменить!',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('Да, отменить', 'confirm_cancel'),
                    Markup.button.callback('Нет, вернуться', 'back_to_record')
                ]
            ])
        );

    } catch (error) {
        console.error('Error in cancelBookingScene enter:', error);
        await ctx.reply(
            '❌ Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад', 'back_to_records')
            ]])
        );
    }
});

// Обработка подтверждения отмены
cancelBookingScene.action('confirm_cancel', async (ctx) => {
    const state = ctx.session.cancelBookingState;
    
    try {
        if (!state?.recordId || !state.phone || !state.password) {
            throw new Error('Отсутствуют необходимые данные для отмены записи');
        }

        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply('🔄 Отменяем запись...');

        try {
            const result = await laravelService.cancelMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId
            });

            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '✅ Запись успешно отменена',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« К списку записей', 'back_to_records')
                ]])
            );

        } catch (error: any) {
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '❌ ' + (error.message || 'Не удалось отменить запись'),
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад', 'back_to_record')
                ]])
            );
        }

    } catch (error) {
        console.error('Error in confirm_cancel handler:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Возврат к деталям записи
cancelBookingScene.action('back_to_record', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('clients_management_scene', {
        action: 'show_record',
        recordId: ctx.session.cancelBookingState?.recordId
    });
});

// Возврат к списку записей
cancelBookingScene.action('back_to_records', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем состояние
    delete ctx.session.cancelBookingState;
    return ctx.scene.enter('clients_management_scene');
});

export default cancelBookingScene;