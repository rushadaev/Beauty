import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';


export const clientsManagementScene = new Scenes.BaseScene<MyContext>('clients_management_scene');

interface RecordData {
    id: string;
    date: string;
    client?: {
        name?: string;
        phone?: string;
    };
    services?: Array<{
        id: number;
        title: string;
        cost: number;
    }>;
}

const DAYS_PER_PAGE = 7;

// Добавим интерфейс для пагинации в сессию
interface SessionData {
    currentPage?: number;
    recordsByDate?: Record<string, RecordData[]>;
}

// Вспомогательные функции для работы с датами
const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    
    return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day);
};

const formatTime = (date: string) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Вход в сцену
clientsManagementScene.enter(async (ctx: MyContext) => {
    try {
        // Проверяем авторизацию
        if (!ctx.session.phone || !ctx.session.password) {
            await ctx.reply(
                '⚠️ Необходимо авторизоваться для просмотра записей.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('Войти в аккаунт', 'start_login')
                ]])
            );
            return;
        }

        const loadingMessage = await ctx.reply('🔄 Загружаем ваши записи...');

        try {
            // Получаем записи через Laravel Service
            const response = await laravelService.getMasterRecords({
                phone: ctx.session.phone,
                password: ctx.session.password,
                params: {
                    start_date: formatDate(new Date()),
                    end_date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                }
            }) as { success: boolean; data: RecordData[] };

            // Удаляем сообщение о загрузке
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id).catch(() => {});

            if (!response?.success || !response.data?.length) {
                return await ctx.reply(
                    '📅 У вас нет предстоящих записей на ближайший месяц.',
                    Markup.inlineKeyboard([[
                        Markup.button.callback('« Вернуться в меню', 'mainmenu')
                    ]])
                );
            }

            // Группируем записи по дням
            const recordsByDate = response.data.reduce((acc, record) => {
                const date = new Date(record.date);
                const dateKey = formatDate(date, 'DD.MM.YYYY');
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(record);
                return acc;
            }, {} as Record<string, RecordData[]>);

            // Сохраняем группированные записи в сессии
            ctx.scene.session.recordsByDate = recordsByDate;
            ctx.scene.session.currentPage = ctx.scene.session.currentPage || 1;

            await showRecordsPage(ctx);

            

        } catch (error: any) {
            // Удаляем сообщение о загрузке
            await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id).catch(() => {});

            console.error('Error loading records:', error);

            let errorMessage = '❌ Произошла ошибка при загрузке записей.';
            
            if (error?.response?.status === 401) {
                errorMessage = '🔒 Ошибка авторизации. Пожалуйста, войдите в систему заново.';
                return ctx.scene.enter('login_wizard');
            }
            
            await ctx.reply(
                errorMessage,
                Markup.inlineKeyboard([[
                    Markup.button.callback('« Вернуться в меню', 'mainmenu')
                ]])
            );
        }

    } catch (error) {
        console.error('Error in clientsManagementScene:', error);
        await ctx.reply(
            '❌ Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Вернуться в меню', 'mainmenu')
            ]])
        );
    }
});

async function showRecordsPage(ctx: MyContext) {
    const recordsByDate = ctx.scene.session.recordsByDate;
    const currentPage = ctx.scene.session.currentPage || 1;
    
    if (!recordsByDate) {
        return ctx.reply('Ошибка: данные не найдены');
    }

    const dates = Object.keys(recordsByDate).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
    });

    const totalPages = Math.ceil(dates.length / DAYS_PER_PAGE);
    const startIdx = (currentPage - 1) * DAYS_PER_PAGE;
    const endIdx = startIdx + DAYS_PER_PAGE;
    const currentDates = dates.slice(startIdx, endIdx);

    const buttons: any[] = [];
    
    currentDates.forEach(date => {
        buttons.push([Markup.button.callback(`📅 ${date}`, 'noop')]);
        
        recordsByDate[date]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .forEach(record => {
                const time = formatTime(record.date);
                const clientName = record.client?.name || 'Клиент';
                const services = record.services
                    ?.map(s => s.title)
                    .slice(0, 2)
                    .join(', ');
                
                const buttonText = `${time} | ${clientName}${services ? ` - ${services}` : ''}`;
                buttons.push([
                    Markup.button.callback(
                        buttonText.length > 60 ? buttonText.slice(0, 57) + '...' : buttonText,
                        `record_${record.id}`
                    )
                ]);
            });
    });

    // Добавляем кнопки навигации
    const navButtons = [];
    if (currentPage > 1) {
        navButtons.push(Markup.button.callback('⬅️ Назад', 'prev_page'));
    }
    if (currentPage < totalPages) {
        navButtons.push(Markup.button.callback('Вперёд ➡️', 'next_page'));
    }
    if (navButtons.length > 0) {
        buttons.push(navButtons);
    }

    // Добавляем информацию о странице и кнопку возврата в меню
    buttons.push([
        Markup.button.callback(
            `📄 ${currentPage}/${totalPages}`,
            'page_info'
        )
    ]);
    buttons.push([Markup.button.callback('« Вернуться в меню', 'mainmenu')]);

    await ctx.editMessageText(
        'Выберите запись для управления:',
        Markup.inlineKeyboard(buttons)
    ).catch(async () => {
        await ctx.reply(
            'Выберите запись для управления:',
            Markup.inlineKeyboard(buttons)
        );
    });
}

// Добавляем обработчики для кнопок пагинации
clientsManagementScene.action('prev_page', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.scene.session.currentPage && ctx.scene.session.currentPage > 1) {
        ctx.scene.session.currentPage--;
        await showRecordsPage(ctx);
    }
});

clientsManagementScene.action('next_page', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.scene.session.recordsByDate) {
        const totalPages = Math.ceil(Object.keys(ctx.scene.session.recordsByDate).length / DAYS_PER_PAGE);
        if (ctx.scene.session.currentPage && ctx.scene.session.currentPage < totalPages) {
            ctx.scene.session.currentPage++;
            await showRecordsPage(ctx);
        }
    }
});

clientsManagementScene.action('page_info', async (ctx) => {
    await ctx.answerCbQuery('Текущая страница записей').catch(() => {});
});

// Заглушка для кнопок-заголовков дат
clientsManagementScene.action('noop', async (ctx) => {
    await ctx.answerCbQuery('Это заголовок даты').catch(() => {});
});

// Обработка выбора конкретной записи
clientsManagementScene.action(/^record_(\d+)$/, async (ctx: MyContext) => {
    try {
        const recordId = ctx.match[1];
        
        // Сохраняем ID записи в сессии
        ctx.scene.session.selectedRecordId = recordId;
        
        // Получаем детали записи
        const response = await laravelService.getMasterRecordDetails({
            phone: ctx.session.phone!,
            password: ctx.session.password!,
            recordId: recordId
        });

        if (!response?.success) {
            throw new Error('Не удалось получить информацию о записи');
        }

        const record = response.data;
        const date = new Date(record.date);
        
        // Формируем детальную информацию о записи
        const recordInfo = [
            `📅 Дата: ${formatDate(date, 'DD.MM.YYYY')}`,
            `🕒 Время: ${formatTime(record.date)}`,
            `👤 Клиент: ${record.client?.name || 'Не указан'}`,
            `📱 Телефон: ${record.client?.phone || 'Не указан'}`,
            `💅 Услуги:\n${record.services?.map(s => `• ${s.title}`).join('\n') || 'Нет услуг'}`
        ].join('\n');

        const managementKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('⏱ Изменить время', 'change_service_time'),
                Markup.button.callback('❌ Удалить услугу', 'delete_service_from_order'),
            ],
            [
                Markup.button.callback('➕ Добавить услугу', 'add_service_to_order'),
            ],
            [
                Markup.button.callback('📞 Изменить телефон', 'change_phone_number'),
            ],
            [
                Markup.button.callback('🚫 Отменить запись', 'cancel_client_booking'),
            ],
            [
                Markup.button.callback('« К списку записей', 'back_to_records'),
                Markup.button.callback('« В меню', 'mainmenu'),
            ]
        ]);

        await ctx.editMessageText(recordInfo, managementKeyboard);

    } catch (error) {
        console.error('Error in record selection:', error);
        await ctx.answerCbQuery('❌ Ошибка при загрузке информации о записи').catch(() => {});
        
        await ctx.reply(
            'Не удалось загрузить информацию о записи. Попробуйте позже.',
            Markup.inlineKeyboard([[
                Markup.button.callback('« Назад к записям', 'back_to_records')
            ]])
        );
    }
});

// Возврат к списку записей
clientsManagementScene.action('back_to_records', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем выбранную запись
    delete ctx.scene.session.selectedRecordId;
    return ctx.scene.reenter();
});

// Обработчики действий с записью
clientsManagementScene.action('change_service_time', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }
    
    await ctx.answerCbQuery();
    return ctx.scene.enter('change_service_time_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});

clientsManagementScene.action('delete_service_from_order', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }

    await ctx.answerCbQuery();
    return ctx.scene.enter('delete_service_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});

clientsManagementScene.action('add_service_to_order', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }

    await ctx.answerCbQuery();
    return ctx.scene.enter('add_service_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});

clientsManagementScene.action('change_phone_number', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }

    await ctx.answerCbQuery();
    return ctx.scene.enter('change_phone_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});



clientsManagementScene.action('cancel_client_booking', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }

    await ctx.answerCbQuery();
    return ctx.scene.enter('cancel_booking_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});

// Возврат в главное меню
clientsManagementScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем данные сцены
    delete ctx.scene.session.selectedRecordId;
    return ctx.scene.enter('main');
});

export default clientsManagementScene;