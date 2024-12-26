import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';

export interface DeleteServiceState {
    recordId: string;
    phone?: string;
    password?: string;
}

export const deleteServiceScene = new Scenes.BaseScene<MyContext>('delete_service_scene');

// Вход в сцену
deleteServiceScene.enter(async (ctx: MyContext) => {
    const state = ctx.scene.state as DeleteServiceState;

    try {
        if (!state?.recordId) {
            return ctx.reply(
                '❌ Ошибка: не выбрана запись',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записям', 'back_to_records')
                ]])
            );
        }

        // Сохраняем состояние
        ctx.session.deleteServiceState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };

        // Получаем детали записи для отображения списка услуг
        const record = await laravelService.getMasterRecordDetails({
            phone: ctx.session.deleteServiceState.phone!,
            password: ctx.session.deleteServiceState.password!,
            recordId: state.recordId
        });

        if (!record?.success || !record.data?.services?.length) {
            return ctx.reply(
                '❌ В записи нет услуг для удаления',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записи', 'back_to_record')
                ]])
            );
        }

        // Создаем кнопки с услугами
        const buttons = record.data.services.map(service => ([
            Markup.button.callback(
                `${service.title} (${service.cost}₽)`,
                `delete_service_${service.id}`
            )
        ]));

        // Добавляем кнопку отмены
        buttons.push([
            Markup.button.callback('« Отмена', 'cancel_service_delete')
        ]);

        await ctx.reply(
            'Выберите услугу для удаления:',
            Markup.inlineKeyboard(buttons)
        );

    } catch (error) {
        console.error('Error in deleteServiceScene enter:', error);
        await ctx.reply(
            '❌ Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад к записи', 'back_to_record')
            ]])
        );
    }
});

// Обработка выбора услуги
deleteServiceScene.action(/^delete_service_(\d+)$/, async (ctx) => {
    const state = ctx.session.deleteServiceState;
    const serviceId = ctx.match[1];

    try {
        if (!state?.recordId || !state.phone || !state.password) {
            throw new Error('Отсутствуют необходимые данные');
        }

        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply('🔄 Удаляем услугу...');

        try {
            const result = await laravelService.updateMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId,
                updateData: {
                    services: {
                        remove: [parseInt(serviceId)]
                    }
                }
            });

            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '✅ Услуга успешно удалена',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« К записи', 'back_to_record')
                ]])
            );

        } catch (error: any) {
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '❌ ' + (error.message || 'Не удалось удалить услугу'),
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад', 'cancel_service_delete')
                ]])
            );
        }

    } catch (error) {
        console.error('Error in service deletion:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка отмены
deleteServiceScene.action('cancel_service_delete', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const recordId = ctx.session.deleteServiceState?.recordId;
        
        // Очищаем состояние
        delete ctx.session.deleteServiceState;
        
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    } catch (error) {
        console.error('Error in cancel_service_delete:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Возврат к записи
deleteServiceScene.action('back_to_record', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const recordId = ctx.session.deleteServiceState?.recordId;
        
        // Очищаем состояние
        delete ctx.session.deleteServiceState;
        
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    } catch (error) {
        console.error('Error in back_to_record:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

export default deleteServiceScene;