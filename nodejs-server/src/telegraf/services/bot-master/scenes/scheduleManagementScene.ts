import { Scenes, Markup } from 'telegraf';
import { MyContext, ScheduleUpdateData } from '../../../types/MyContext';
import { StaffMemberWithSchedule } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';

export const scheduleManagementScene = new Scenes.BaseScene<MyContext>('schedule_management');

// Форматирование даты для API
const formatDateForApi = (date: string): string => {
    const [day, month, year] = date.split('.');
    return `${year}-${month}-${day}`;
};

// Форматирование даты для отображения
const formatDateForDisplay = (date: string): string => {
    const [year, month, day] = date.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return `${day}.${month} (${days[dateObj.getDay()]})`;
};

// Проверка формата даты
const isValidDateFormat = (date: string): boolean => {
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    return dateRegex.test(date);
};

// Проверка корректности даты
const isValidDate = (dateStr: string): boolean => {
    if (!isValidDateFormat(dateStr)) return false;
    
    const [day, month, year] = dateStr.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year;
};

// Проверка что дата не в прошлом
const isDateInFuture = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [day, month, year] = dateStr.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date >= today;
};

// Вход в сцену
scheduleManagementScene.enter(async (ctx: MyContext) => {
    try {
        ctx.session.scheduleState = {
            step: 'select_period'
        };

        await ctx.reply(
            'Для изменения графика работы сначала выберите период:\n\n' +
            '⚠️ Убедитесь, что замена согласована с заменяющим мастером.',
            Markup.inlineKeyboard([
                [Markup.button.callback('Один день', 'period_single')],
                [Markup.button.callback('Период дат', 'period_range')],
                [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
            ])
        );
    } catch (error) {
        console.error('Error in scheduleManagementScene.enter:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка выбора периода
scheduleManagementScene.action(/^period_(single|range)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const periodType = ctx.match[1] as 'single' | 'range';
        
        ctx.session.scheduleState = {
            step: 'enter_date',
            periodType
        };

        if (periodType === 'single') {
            await ctx.editMessageText(
                'Введите дату для замены в формате ДД.ММ.ГГГГ (например, 25.03.2024):',
                Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_period')]])
            );
        } else {
            await ctx.editMessageText(
                'Введите начальную дату периода в формате ДД.ММ.ГГГГ:',
                Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_period')]])
            );
        }
    } catch (error) {
        console.error('Error in period selection:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка ввода даты/дат
scheduleManagementScene.on('text', async (ctx) => {
    try {
        if (!ctx.session.scheduleState) return;
        const state = ctx.session.scheduleState;
        const text = ctx.message.text;

        if (state.step === 'enter_date') {
            if (!isValidDate(text)) {
                await ctx.reply(
                    'Неверный формат даты. Пожалуйста, используйте формат ДД.ММ.ГГГГ:',
                    Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_period')]])
                );
                return;
            }

            if (!isDateInFuture(text)) {
                await ctx.reply(
                    'Нельзя выбрать дату в прошлом. Пожалуйста, введите будущую дату:',
                    Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_period')]])
                );
                return;
            }

            if (state.periodType === 'single') {
                state.startDate = formatDateForApi(text);
                state.endDate = state.startDate;
                await showMastersList(ctx);
            } else {
                if (!state.startDate) {
                    state.startDate = formatDateForApi(text);
                    await ctx.reply(
                        'Теперь введите конечную дату периода в формате ДД.ММ.ГГГГ:',
                        Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_period')]])
                    );
                } else {
                    const endDate = formatDateForApi(text);
                    if (endDate < state.startDate) {
                        await ctx.reply(
                            'Конечная дата не может быть раньше начальной. Введите конечную дату снова:',
                            Markup.inlineKeyboard([[Markup.button.callback('👈 Назад', 'back_to_period')]])
                        );
                        return;
                    }
                    state.endDate = endDate;
                    await showMastersList(ctx);
                }
            }
        }
    } catch (error) {
        console.error('Error in text handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});



async function showMastersList(ctx: MyContext) {
    try {
        if (!ctx.session.scheduleState?.startDate || !ctx.session.scheduleState?.endDate) {
            await ctx.reply('Ошибка: не выбраны даты');
            return;
        }

        // Показываем начало загрузки
        const loadingMessage = await ctx.reply(
            '⌛ Подбираем доступных мастеров...',
            Markup.inlineKeyboard([[
                Markup.button.callback('Отменить', 'back_to_period')
            ]])
        );

        // Получаем данные текущего мастера
        const masterInfo = await laravelService.getStaffSchedule(
            ctx.from.id,
            ctx.session.scheduleState.startDate,
            ctx.session.scheduleState.endDate,
            true
        );

        if (!masterInfo?.data?.[0]) {
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id);
            await ctx.reply('Не удалось получить информацию о мастере');
            return;
        }

        // Получаем список мастеров филиала
        const allMastersResponse = await laravelService.getFilialStaff(
            ctx.from.id,
            ctx.session.scheduleState.startDate,
            ctx.session.scheduleState.endDate,
            true
        );

        // Удаляем сообщение о загрузке
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id);

        if (!allMastersResponse?.success || !allMastersResponse.data) {
            await ctx.reply(
                'Не удалось получить список мастеров',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад', 'back_to_period')
                ]])
            );
            return;
        }

        const currentMasterId = masterInfo.data[0].staff_id;

        // Фильтруем список - исключаем текущего мастера
        const availableMasters = allMastersResponse.data.filter(master => 
            master.id !== currentMasterId
        );

        if (!availableMasters.length) {
            await ctx.reply('Нет доступных мастеров для замены в филиале');
            return;
        }

        // Создаем кнопки выбора мастеров
        const buttons = availableMasters.map(master => {
            const buttonText = master.name 
                ? `${master.name}${master.specialization ? ` (${master.specialization})` : ''}`
                : `Мастер ${master.id}`;

            return [
                Markup.button.callback(
                    buttonText,
                    `select_master_${master.id}`
                )
            ];
        });

        buttons.push([Markup.button.callback('👈 Назад', 'back_to_period')]);

        const dateRange = ctx.session.scheduleState.periodType === 'single'
            ? formatDateForDisplay(ctx.session.scheduleState.startDate)
            : `${formatDateForDisplay(ctx.session.scheduleState.startDate)} - ${formatDateForDisplay(ctx.session.scheduleState.endDate)}`;

        ctx.session.scheduleState = {
            ...ctx.session.scheduleState,
            step: 'select_master',
            masters: availableMasters,
            currentMasterId: currentMasterId
        };

        await ctx.reply(
            `Выберите мастера для замены на ${dateRange}:`,
            Markup.inlineKeyboard(buttons)
        );

    } catch (error) {
        console.error('Error in showMastersList:', error);
        await ctx.reply(
            '😕 Что-то пошло не так, попробуйте еще раз',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад', 'back_to_period')
            ]])
        );
    }
}

// Обработка выбора мастера
scheduleManagementScene.action(/^select_master_(\d+)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        if (!ctx.session.scheduleState?.startDate || 
            !ctx.session.scheduleState?.endDate || 
            !ctx.session.scheduleState?.currentMasterId) {
            await ctx.reply('Ошибка: недостаточно данных для замены');
            return;
        }
 
        const replacementMasterId = parseInt(ctx.match[1]);
        const currentMasterId = ctx.session.scheduleState.currentMasterId;
 
        // Показываем начало процесса
        await ctx.editMessageText(
            '⌛ Подготавливаем данные для замены...',
            Markup.inlineKeyboard([[
                Markup.button.callback('Отменить', 'back_to_period')
            ]])
        );
 
        // Получаем расписание текущего мастера для текущего дня
        const currentMasterSchedule = await laravelService.getStaffSchedule(
            ctx.from.id,
            ctx.session.scheduleState.startDate,
            ctx.session.scheduleState.startDate,
            true
        );
        
        let masterScheduleData = null;
        if (currentMasterSchedule?.data) {
            masterScheduleData = currentMasterSchedule.data.find(
                schedule => schedule.staff_id === currentMasterId
            );
        }
 
        // Проверяем существование slots
        if (!masterScheduleData?.slots || !Array.isArray(masterScheduleData.slots) || masterScheduleData.slots.length === 0) {
            await ctx.editMessageText(
                '🤔 Не нашли график работы на выбранную дату',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад', 'back_to_period')
                ]])
            );
            return;
        }
 
        // Готовим данные для обновления
        const scheduleData: ScheduleUpdateData = {
            schedules_to_set: [],
            schedules_to_delete: []
        };
 
        // Создаем массив всех дат диапазона
        const start = new Date(ctx.session.scheduleState.startDate);
        const end = new Date(ctx.session.scheduleState.endDate);
 
        // Обновляем статус для периода дат
        if (start.getTime() !== end.getTime()) {
            await ctx.editMessageText(
                '⌛ Проверяем графики за выбранный период...',
                Markup.inlineKeyboard([[
                    Markup.button.callback('Отменить', 'back_to_period')
                ]])
            );
        }
 
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split('T')[0];
            
            const daySchedule = await laravelService.getStaffSchedule(
                ctx.from.id,
                date,
                date,
                true
            );
 
            const masterDaySchedule = daySchedule?.data?.find(
                schedule => schedule.staff_id === currentMasterId
            );
 
            if (masterDaySchedule?.slots?.length) {
                scheduleData.schedules_to_set.push({
                    staff_id: replacementMasterId,
                    date,
                    slots: masterDaySchedule.slots
                });
                
                scheduleData.schedules_to_delete.push({
                    staff_id: currentMasterId,
                    date
                });
            }
        }
 
        // Проверяем наличие слотов в готовых данных
        if (!scheduleData.schedules_to_set[0]?.slots?.length) {
            await ctx.editMessageText(
                '😕 Не нашли рабочих смен в выбранные дни',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад', 'back_to_period')
                ]])
            );
            return;
        }
 
        const selectedMaster = ctx.session.scheduleState.masters?.find(
            m => m.id === replacementMasterId
        );
        
        if (!selectedMaster?.name) {
            await ctx.editMessageText(
                '😕 Не удалось найти информацию о выбранном мастере',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад', 'back_to_period')
                ]])
            );
            return;
        }
 
        const dateRange = ctx.session.scheduleState.periodType === 'single'
            ? formatDateForDisplay(ctx.session.scheduleState.startDate)
            : `${formatDateForDisplay(ctx.session.scheduleState.startDate)} - ${formatDateForDisplay(ctx.session.scheduleState.endDate)}`;
 
        ctx.session.scheduleState = {
            ...ctx.session.scheduleState,
            updateData: scheduleData
        };
 
        await ctx.editMessageText(
            `📋 Подтвердите замену:\n\n` +
            `🗓 Период: ${dateRange}\n` +
            `👤 Заменяющий мастер: ${selectedMaster.name}\n\n` +
            `⚠️ Вы действительно хотите передать свой график работы этому мастеру?`,
            Markup.inlineKeyboard([
                [Markup.button.callback('✅ Да, подтверждаю', `confirm_replacement_${replacementMasterId}`)],
                [Markup.button.callback('❌ Отмена', 'back_to_period')]
            ])
        );
 
    } catch (error) {
        console.error('Error in master selection:', error);
        await ctx.editMessageText(
            '😕 Что-то пошло не так\n' +
            'Попробуйте выбрать другой период или мастера',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад', 'back_to_period')
            ]])
        );
    }
 });

// Обработчик подтверждения замены
scheduleManagementScene.action(/^confirm_replacement_(\d+)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
 
        const scheduleState = ctx.session.scheduleState;
        if (!scheduleState?.updateData) {
            await ctx.editMessageText(
                '😕 Что-то пошло не так, попробуйте начать сначала',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад', 'back_to_period')
                ]])
            );
            return;
        }
 
        // Показываем статус обновления
        await ctx.editMessageText(
            '⌛ Обновляем график работы...',
            Markup.inlineKeyboard([[
                Markup.button.callback('Отменить', 'back_to_period')
            ]])
        );
 
        // Форматируем данные для API
        const formattedData = {
            schedules_to_set: scheduleState.updateData.schedules_to_set.map(schedule => {
                if ('dates' in schedule) {
                    const dates = (schedule as any).dates;
                    return {
                        staff_id: schedule.staff_id,
                        date: dates[0].date,
                        slots: dates[0].slots
                    };
                }
                return schedule;
            }),
            schedules_to_delete: scheduleState.updateData.schedules_to_delete.map(schedule => {
                if ('dates' in schedule) {
                    const dates = (schedule as any).dates;
                    return {
                        staff_id: schedule.staff_id,
                        date: dates[0]
                    };
                }
                return schedule;
            })
        };
 
        // Отправляем запрос на обновление
        const result = await laravelService.updateStaffSchedule(
            ctx.from.id,
            scheduleState.startDate!,
            formattedData,
            true
        );
 
        if (result?.success) {
            const dateRange = ctx.session.scheduleState.periodType === 'single'
                ? formatDateForDisplay(ctx.session.scheduleState.startDate)
                : `${formatDateForDisplay(ctx.session.scheduleState.startDate)} - ${formatDateForDisplay(ctx.session.scheduleState.endDate)}`;
 
            // Показываем успешное завершение
            await ctx.editMessageText(
                `✨ Отлично! Замена оформлена\n\n` +
                `🗓 Период: ${dateRange}\n\n` +
                `График работы успешно передан заменяющему мастеру`,
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Вернуться в меню', 'mainmenu')
                ]])
            );
        } else {
            throw new Error('Failed to update schedule');
        }
    } catch (error) {
        console.error('Error in replacement confirmation:', error);
        await ctx.editMessageText(
            '😕 Не удалось обновить график\n' +
            'Возможно, выбранный мастер уже работает в это время',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Попробовать снова', 'back_to_period')
            ]])
        );
    }
 });

// Обработка кнопки "Назад"
scheduleManagementScene.action('back_to_period', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        ctx.session.scheduleState = {
            step: 'select_period'
        };

        await ctx.editMessageText(
            'Для изменения графика работы сначала выберите период:\n\n' +
            '⚠️ Убедитесь, что замена согласована с заменяющим мастером.',
            Markup.inlineKeyboard([
                [Markup.button.callback('Один день', 'period_single')],
                [Markup.button.callback('Период дат', 'period_range')],
                [Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
            ])
        );
    } catch (error) {
        console.error('Error in back_to_period:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Возврат в главное меню
scheduleManagementScene.action('mainmenu', async (ctx) => {
    try {
        await ctx.answerCbQuery('🏠 Главное меню');
        return ctx.scene.enter('main');
    } catch (error) {
        console.error('Error in mainmenu:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

export default scheduleManagementScene;