import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from "../../../../services/laravelService";

export const changeServiceTimeScene = new Scenes.BaseScene<MyContext>('change_service_time_scene');

// Начальное состояние - показ категорий услуг
changeServiceTimeScene.enter(async (ctx: MyContext) => {
    try {
        // Очищаем временные данные сессии
        ctx.session.selectedCategoryId = undefined;
        ctx.session.selectedServiceId = undefined;
        
        const phone = ctx.session?.phone;
        if (!phone) {
            await ctx.reply('Ошибка: не найден номер телефона. Попробуйте перелогиниться.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        // Получаем категории услуг мастера используя новый метод
        const response = await laravelService.getMasterCategoriesForTimeChange({
            phone,
            password: ctx.session?.password || ''
        });
        
        if (!response.success) {
            await ctx.reply('Не удалось получить категории услуг.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        const categories = response.data;
        
        if (categories.length === 0) {
            await ctx.reply('У вас нет доступных категорий услуг.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        // Создаем клавиатуру с категориями
        const keyboard = categories.map(category => ([
            Markup.button.callback(category.title, `select_category:${category.id}`)
        ]));

        // Добавляем кнопку возврата
        keyboard.push([
            Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
        ]);

        await ctx.reply('Выберите категорию услуг:', 
            Markup.inlineKeyboard(keyboard)
        );

    } catch (error) {
        console.error('Error in changeServiceTimeScene enter:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
            ]])
        );
    }
});

// Обработка выбора категории
changeServiceTimeScene.action(/^select_category:(\d+)$/, async (ctx) => {
    try {
        const categoryId = ctx.match[1];
        ctx.session.selectedCategoryId = categoryId;
        
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;
        if (!phone || !password) {
            await ctx.reply('Ошибка: не найден номер телефона или пароль.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        // Используем новый метод для получения услуг
        const response = await laravelService.getMasterServicesForTimeChange({
            phone,
            password,
            category_id: parseInt(categoryId)
        });
        
        if (!response.success) {
            await ctx.reply('Не удалось получить список услуг.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад к категориям', 'back_to_categories'),
                    Markup.button.callback('В главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        const services = response.data;
        
        if (services.length === 0) {
            await ctx.reply('В данной категории нет услуг.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад к категориям', 'back_to_categories'),
                    Markup.button.callback('В главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        // Создаем клавиатуру с услугами
        const keyboard = [];
        for (const service of services) {
            const currentDuration = Math.floor(service.seance_length / 60);
            keyboard.push([
                Markup.button.callback(
                    `${service.title} (${currentDuration} мин)`,
                    `select_service:${service.id}`
                )
            ]);
        }

        keyboard.push([
            Markup.button.callback('👈 Назад к категориям', 'back_to_categories'),
            Markup.button.callback('В главное меню', 'mainmenu')
        ]);

        await ctx.editMessageText('Выберите услугу для изменения длительности:',
            Markup.inlineKeyboard(keyboard)
        );

    } catch (error) {
        console.error('Error in select_category handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
            ]])
        );
    }
});

// Обработка выбора услуги
changeServiceTimeScene.action(/^select_service:(\d+)$/, async (ctx) => {
    try {
        const serviceId = ctx.match[1];
        ctx.session.selectedServiceId = serviceId;
        
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;
        if (!phone || !password) {
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }

        // Получаем детали услуги
        const serviceDetails = await laravelService.getMasterServicesForTimeChange({
            phone,
            password,
            category_id: ctx.session.selectedCategoryId || 0
        });

        if (!serviceDetails.success) {
            await ctx.reply('Не удалось получить информацию об услуге.');
            return;
        }

        const service = serviceDetails.data.find(s => s.id.toString() === serviceId);
        if (!service) {
            await ctx.reply('Услуга не найдена.');
            return;
        }

        const currentDuration = Math.floor(service.seance_length / 60);
        const hours = Math.floor(currentDuration / 60);
        const minutes = currentDuration % 60;
        const currentTimeFormatted = `${hours}:${minutes.toString().padStart(2, '0')}`;

        await ctx.editMessageText(
            `Выбрана услуга: ${service.title}\n` +
            `Текущая длительность: ${currentTimeFormatted}\n\n` +
            'Введите новую длительность услуги в формате Ч:ММ\n' +
            'Например: 1:30 или 0:45',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                Markup.button.callback('В главное меню', 'mainmenu')
            ]])
        );

        // Устанавливаем флаг ожидания ввода времени
        ctx.session.awaitingServiceDuration = true;
        ctx.session.selectedServiceId = serviceId;

    } catch (error) {
        console.error('Error in select_service handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Добавляем обработчик текстовых сообщений
changeServiceTimeScene.on('text', async (ctx) => {
    if (!ctx.session.awaitingServiceDuration) {
        return;
    }

    const timeInput = ctx.message.text;
    const timeRegex = /^(\d+):([0-5]\d)$/;
    const match = timeInput.match(timeRegex);

    if (!match) {
        await ctx.reply(
            'Неверный формат времени. Пожалуйста, используйте формат Ч:ММ\n' +
            'Например: 1:30 или 0:45',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                Markup.button.callback('В главное меню', 'mainmenu')
            ]])
        );
        return;
    }

    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes < 15 || totalMinutes > 480) {
        await ctx.reply(
            'Длительность услуги должна быть от 15 минут до 8 часов',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                Markup.button.callback('В главное меню', 'mainmenu')
            ]])
        );
        return;
    }

    try {
        const response = await laravelService.updateMasterServiceTime({
            phone: ctx.session.phone!,
            password: ctx.session.password!,
            service_id: parseInt(ctx.session.selectedServiceId!),
            duration: totalMinutes
        });

        if (!response.success) {
            await ctx.reply(
                'Не удалось обновить длительность услуги.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                    Markup.button.callback('В главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        // Сбрасываем флаг ожидания ввода
        ctx.session.awaitingServiceDuration = false;

        await ctx.reply(
            `✅ Длительность услуги успешно обновлена на ${hours}:${minutes.toString().padStart(2, '0')}!`,
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                Markup.button.callback('В главное меню', 'mainmenu')
            ]])
        );

    } catch (error) {
        console.error('Error updating service duration:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка установки длительности
changeServiceTimeScene.action(/^set_duration:(\d+):(\d+)$/, async (ctx) => {
    try {
        const serviceId = ctx.match[1];
        const duration = parseInt(ctx.match[2]);
        
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;
        if (!phone || !password) {
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }

        // Используем новый метод для обновления времени
        const response = await laravelService.updateMasterServiceTime({
            phone,
            password,
            service_id: parseInt(serviceId),
            duration
        });

        if (!response.success) {
            await ctx.reply(
                'Не удалось обновить длительность услуги.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                    Markup.button.callback('В главное меню', 'mainmenu')
                ]])
            );
            return;
        }

        await ctx.editMessageText(
            `✅ Длительность услуги успешно обновлена на ${duration} минут!`,
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Назад к услугам', 'back_to_services'),
                Markup.button.callback('В главное меню', 'mainmenu')
            ]])
        );

    } catch (error) {
        console.error('Error in set_duration handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
            ]])
        );
    }
});

// Обработчики навигации
changeServiceTimeScene.action('back_to_categories', async (ctx) => {
    await ctx.scene.enter('change_service_time_scene');
});

changeServiceTimeScene.action('back_to_services', async (ctx) => {
    // Сохраняем ID категории во временную переменную
    const categoryId = ctx.session.selectedCategoryId;
    
    // Перезаходим в сцену
    await ctx.scene.reenter();
    
    // Если была выбрана категория, сразу показываем её услуги
    if (categoryId) {
        const phone = ctx.session?.phone;
        const password = ctx.session?.password;
        
        if (phone && password) {
            // Получаем услуги напрямую
            const response = await laravelService.getMasterServicesForTimeChange({
                phone,
                password,
                category_id: parseInt(categoryId)
            });
            
            if (response.success && response.data.length > 0) {
                // Создаем клавиатуру с услугами
                const keyboard = [];
                for (const service of response.data) {
                    const currentDuration = Math.floor(service.seance_length / 60);
                    keyboard.push([
                        Markup.button.callback(
                            `${service.title} (${currentDuration} мин)`,
                            `select_service:${service.id}`
                        )
                    ]);
                }

                keyboard.push([
                    Markup.button.callback('👈 Назад к категориям', 'back_to_categories'),
                    Markup.button.callback('В главное меню', 'mainmenu')
                ]);

                await ctx.editMessageText('Выберите услугу для изменения длительности:',
                    Markup.inlineKeyboard(keyboard)
                );
            }
        }
    }
});

changeServiceTimeScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});

export default changeServiceTimeScene;