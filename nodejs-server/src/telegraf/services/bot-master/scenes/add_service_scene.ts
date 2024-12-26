import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';

export interface AddServiceState {
    recordId: string;
    phone?: string;
    password?: string;
}

export const addServiceScene = new Scenes.BaseScene<MyContext>('add_service_scene');

// Вход в сцену
addServiceScene.enter(async (ctx: MyContext) => {
    const state = ctx.scene.state as AddServiceState;

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
        ctx.session.addServiceState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };

        // Получаем список доступных услуг
        const services = await laravelService.getMasterServices({
            phone: ctx.session.addServiceState.phone!,
            password: ctx.session.addServiceState.password!
        });

        if (!services?.success || !services.data?.length) {
            return ctx.reply(
                '❌ Нет доступных услуг для добавления',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записи', 'back_to_record')
                ]])
            );
        }

        
        // Создаем кнопки только с названиями услуг
const buttons = services.data.map(service => ([
    Markup.button.callback(
        service.title,
        `add_service_${service.id}`
    )
]));

        // Добавляем кнопку отмены
        buttons.push([
            Markup.button.callback('« Отмена', 'cancel_service_add')
        ]);

        await ctx.reply(
            'Выберите услугу для добавления:',
            Markup.inlineKeyboard(buttons)
        );

    } catch (error) {
        console.error('Error in addServiceScene enter:', error);
        await ctx.reply(
            '❌ Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад к записи', 'back_to_record')
            ]])
        );
    }
});

// Обработка выбора услуги
addServiceScene.action(/^add_service_(\d+)$/, async (ctx) => {
    const state = ctx.session.addServiceState;
    const serviceId = parseInt(ctx.match[1]);

    try {
        if (!state?.recordId || !state.phone || !state.password) {
            throw new Error('Отсутствуют необходимые данные');
        }

        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply('🔄 Добавляем услугу...');

        try {
            // Получаем информацию об услуге
            const services = await laravelService.getMasterServices({
                phone: state.phone,
                password: state.password
            });

            const selectedService = services.data.find(s => s.id === serviceId);
            if (!selectedService) {
                throw new Error('Услуга не найдена');
            }

            const result = await laravelService.updateMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId,
                updateData: {
                    services: {
                        add: [{
                            id: selectedService.id,
                            cost: parseFloat(selectedService.price_min), // Добавляем цену
                            first_cost: parseFloat(selectedService.price_min), // Добавляем начальную цену
                            discount: 0
                        }]
                    }
                }
            });

            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '✅ Услуга успешно добавлена',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« К записи', 'back_to_record')
                ]])
            );

        } catch (error: any) {
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '❌ ' + (error.message || 'Не удалось добавить услугу'),
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад', 'cancel_service_add')
                ]])
            );
        }

    } catch (error) {
        console.error('Error in service addition:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка отмены
addServiceScene.action('cancel_service_add', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const recordId = ctx.session.addServiceState?.recordId;
        
        delete ctx.session.addServiceState;
        
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    } catch (error) {
        console.error('Error in cancel_service_add:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Возврат к записи
addServiceScene.action('back_to_record', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const recordId = ctx.session.addServiceState?.recordId;
        
        delete ctx.session.addServiceState;
        
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    } catch (error) {
        console.error('Error in back_to_record:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

export default addServiceScene;