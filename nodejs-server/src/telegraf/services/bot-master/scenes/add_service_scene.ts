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

        // Сохраняем в сессии данные для дальнейших шагов
        ctx.session.addServiceState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };

        // 1) Запрашиваем категории, доступные мастеру
        const categoriesResponse = await laravelService.getMasterCategoriesForTimeChange({
            phone: ctx.session.addServiceState.phone!,
            password: ctx.session.addServiceState.password!
        });

        if (!categoriesResponse?.success || !categoriesResponse.data?.length) {
            return ctx.reply(
                '❌ Нет доступных категорий для добавления услуг',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записи', 'back_to_record')
                ]])
            );
        }

        // 2) Формируем кнопки для категорий
        const buttons = categoriesResponse.data.map((cat: any) => ([
            Markup.button.callback(
                cat.title,
                `select_category_${cat.id}`
            )
        ]));

        // Кнопка отмены
        buttons.push([
            Markup.button.callback('« Отмена', 'cancel_service_add')
        ]);

        await ctx.reply(
            'Выберите категорию услуг:',
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

// Обработка выбора категории
addServiceScene.action(/^select_category_(\d+)$/, async (ctx) => {
    try {
        const categoryId = Number(ctx.match[1]);
        const state = ctx.session.addServiceState;
        if (!state || !state.phone || !state.password) {
            throw new Error('Нет данных авторизации или записи');
        }

        await ctx.answerCbQuery(); // Закрыть "часики" на кнопке

        // 1) Показываем "загрузка услуг"
        const waitMsg = await ctx.reply('⏳ Загрузка услуг...');

        // 2) Запрашиваем услуги мастера в конкретной категории
        const servicesResponse = await laravelService.getMasterServicesForTimeChange({
            phone: state.phone,
            password: state.password,
            category_id: categoryId
        });

        // Удаляем сообщение "загрузка"
        await ctx.telegram.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});

        if (!servicesResponse?.success || !servicesResponse.data?.length) {
            await ctx.reply(
                '❌ Нет доступных услуг в этой категории',
                Markup.inlineKeyboard([
                    [Markup.button.callback('« Выбрать другую категорию', 'back_to_categories')],
                    [Markup.button.callback('« Отмена', 'cancel_service_add')]
                ])
            );
            return;
        }

        // 3) Формируем кнопки услуг
        const buttons = servicesResponse.data.map((service: any) => ([
            Markup.button.callback(
                service.title,
                `add_service_${service.id}`
            )
        ]));

        // Добавляем кнопки "назад к категориям" и "отмена"
        buttons.push([
            Markup.button.callback('« Выбрать другую категорию', 'back_to_categories'),
            Markup.button.callback('« Отмена', 'cancel_service_add')
        ]);

        await ctx.reply(
            'Выберите услугу для добавления:',
            Markup.inlineKeyboard(buttons)
        );

    } catch (error) {
        console.error('Error in select_category:', error);
        await ctx.reply(
            '❌ Произошла ошибка при загрузке услуг. Попробуйте позже.',
            Markup.inlineKeyboard([
                [Markup.button.callback('« Назад', 'cancel_service_add')]
            ])
        );
    }
});

// Кнопка вернуться к категориям (просто перезаходим в сцену)
addServiceScene.action('back_to_categories', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter(); // Заново вызовется enter, покажет категории
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