import { Scenes, Markup } from 'telegraf';
import { MyContext, ChangePhoneState } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';

export const changePhoneScene = new Scenes.BaseScene<MyContext>('change_phone_scene');

// Вход в сцену
changePhoneScene.enter(async (ctx: MyContext) => {
    const state = ctx.scene.state as ChangePhoneState;

    try {
        if (!state?.recordId) {
            return ctx.reply(
                '❌ Ошибка: не выбрана запись',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записям', 'back_to_records')
                ]])
            );
        }

        // Сохраняем состояние до удаления ctx.scene.state
        const recordId = state.recordId;
        
        // Сохраняем состояние в сессии
        ctx.session.changePhoneState = {
            recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };

        await ctx.reply(
            'Введите новый номер телефона клиента в формате 79XXXXXXXXX:',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Отмена', 'cancel_phone_change')
            ]])
        );

    } catch (error) {
        console.error('Error in changePhoneScene enter:', error);
        await ctx.reply(
            '❌ Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад к записям', 'back_to_records')
            ]])
        );
    }
});

// Обработка введенного телефона
changePhoneScene.on('text', async (ctx) => {
    const state = ctx.session.changePhoneState;
    
    try {
        if (!state || !state.recordId || !state.phone || !state.password) {
            return ctx.reply(
                '❌ Ошибка: недостаточно данных. Попробуйте заново.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад к записям', 'back_to_records')
                ]])
            );
        }

        const newPhone = ctx.message.text.trim();

        // Проверяем формат телефона
        if (!/^7\d{10}$/.test(newPhone)) {
            return ctx.reply(
                '❌ Неверный формат номера телефона. Введите номер в формате 79XXXXXXXXX:',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Отмена', 'cancel_phone_change')
                ]])
            );
        }

        const loadingMsg = await ctx.reply('🔄 Обновляем номер телефона...');

        try {
            // Сохраняем recordId перед обновлением
            const recordId = state.recordId;
            
            const result = await laravelService.updateMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId,
                updateData: {
                    client: {
                        phone: newPhone
                    }
                }
            });

            // Удаляем сообщение о загрузке
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '✅ Номер телефона успешно обновлен',
                Markup.inlineKeyboard([[
                    Markup.button.callback('« К записи', 'back_to_record')
                ]])
            );

            // Сохраняем обновленное состояние
            ctx.session.changePhoneState = {
                ...state,
                newPhone
            };

        } catch (error: any) {
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {});

            await ctx.reply(
                '❌ ' + (error.message || 'Не удалось обновить номер телефона'),
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Назад', 'cancel_phone_change')
                ]])
            );
        }

    } catch (error) {
        console.error('Error handling phone number:', error);
        await ctx.reply(
            '❌ Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад к записям', 'back_to_records')
            ]])
        );
    }
});

// Отмена изменения телефона
changePhoneScene.action('cancel_phone_change', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const recordId = ctx.session.changePhoneState?.recordId;
        
        // Очищаем состояние до перехода на другую сцену
        delete ctx.session.changePhoneState;
        
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    } catch (error) {
        console.error('Error in cancel_phone_change:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Возврат к записи
changePhoneScene.action('back_to_record', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const recordId = ctx.session.changePhoneState?.recordId;
        
        // Очищаем состояние до перехода на другую сцену
        delete ctx.session.changePhoneState;
        
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    } catch (error) {
        console.error('Error in back_to_record:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});

export default changePhoneScene;