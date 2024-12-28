import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import LaravelService from "../../../../services/laravelService";
import { fmt, bold } from 'telegraf/format';

// Дополнительные типы для сцены
interface TasksState {
    page: number;
    filter: 'active' | 'completed' | 'all';
}

interface SceneState {
    tasksState: TasksState;
}

type TasksSceneContext = MyContext & {
    scene: Scenes.SceneContextScene<MyContext> & {
        state: SceneState;
    };
};

export const tasksScene = new Scenes.BaseScene<TasksSceneContext>('tasks');

// Инициализация состояния при входе в сцену
tasksScene.enter(async (ctx) => {
    if (!ctx.scene.state) {
        ctx.scene.state = {
            tasksState: {
                page: 1,
                filter: 'active' as const
            }
        };
    } else {
        ctx.scene.state.tasksState = {
            page: 1,
            filter: 'active' as const
        };
    }
    
    await showTasks(ctx);
});

async function showTasks(ctx: TasksSceneContext) {
    try {
        const state = ctx.scene.state.tasksState;
        
        const response = await LaravelService.getTasks({
            page: state.page,
            per_page: 5,
            filter: state.filter
        });

        const tasks = response?.data?.data || [];
        const total = response?.data?.total || 0;
        const totalPages = Math.ceil(total / 5) || 1;

        // Проверяем валидность текущей страницы
        if (state.page > totalPages) {
            state.page = totalPages;
        }

        // Если нет задач
        if (!tasks.length) {
            const message = state.filter === 'completed' 
                ? '📋 Нет выполненных задач' 
                : '📋 Список задач пуст';

            if (ctx.callbackQuery) {
                try {
                    await ctx.editMessageText(message, buildMainMenuKeyboard());
                } catch (error) {
                    if (!error.message?.includes('message is not modified')) {
                        await ctx.reply(message, buildMainMenuKeyboard());
                    }
                }
            } else {
                await ctx.reply(message, buildMainMenuKeyboard());
            }
            return;
        }

        // Формируем заголовок
        const headerText = [
            '📋 Задачи',
            '',
            `Всего задач: ${total}`,
            `Страница: ${state.page}/${totalPages}`,
            '',
            'Выберите задачу для просмотра:'
        ].join('\n');

        // Формируем клавиатуру
        const keyboard = [
            // Задачи
            ...tasks.map(task => ([
                Markup.button.callback(
                    `${getStatusEmoji(task.status)} ${task.title.substring(0, 35)}${task.title.length > 35 ? '...' : ''}`,
                    `view_task_${task.id}`
                )
            ])),

            // Навигация (показываем только если есть больше одной страницы)
            ...(totalPages > 1 ? [[
                ...(state.page > 1 ? [Markup.button.callback('⬅️ Назад', 'prev_page')] : []),
                ...(state.page < totalPages ? [Markup.button.callback('➡️ Вперёд', 'next_page')] : [])
            ]] : []),

            // Фильтры
            [
                Markup.button.callback(
                    state.filter === 'active' ? '🔵 Активные' : '⚪️ Активные',
                    'filter_active'
                ),
                Markup.button.callback(
                    state.filter === 'completed' ? '🔵 Выполненные' : '⚪️ Выполненные',
                    'filter_completed'
                )
            ],

            // Кнопка возврата в меню
            [Markup.button.callback('👈 Вернуться в меню', 'mainmenu')]
        ].filter(row => row.length > 0); // Убираем пустые ряды

        const markup = Markup.inlineKeyboard(keyboard);

        // Отправляем или обновляем сообщение
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(headerText, markup);
            } catch (error) {
                if (!error.message?.includes('message is not modified')) {
                    console.error('Error updating message:', error);
                    // Если не удалось обновить, отправляем новое
                    await ctx.reply(headerText, markup);
                }
            }
        } else {
            await ctx.reply(headerText, markup);
        }

    } catch (error) {
        logger.error('Error in showTasks:', error);
        const errorMessage = '❌ Произошла ошибка при загрузке задач';
        
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(errorMessage, buildMainMenuKeyboard());
            } catch {
                await ctx.reply(errorMessage, buildMainMenuKeyboard());
            }
        } else {
            await ctx.reply(errorMessage, buildMainMenuKeyboard());
        }
    }
}

// Добавим новый обработчик
tasksScene.action(/^get_master_photo_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const task = await LaravelService.getTaskById(taskId);

        if (!task?.data) {
            await ctx.answerCbQuery('❌ Задача не найдена');
            return;
        }

        await ctx.answerCbQuery('🔍 Получаем фото...');

        const photoResult = await LaravelService.getMasterPhoto(task.data.master_phone);

        if (!photoResult.success) {
            await ctx.reply(
                '❌ ' + (photoResult.message || 'Ошибка получения фото мастера'),
                Markup.inlineKeyboard([[
                    Markup.button.callback('👈 Вернуться к задаче', `view_task_${taskId}`)
                ]])
            );
            return;
        }

        const messageText = `
🖼 Актуальное фото мастера:
👤 ${task.data.master_name}
📱 ${task.data.master_phone}

${photoResult.data.photo_url}
`.trim();

        await ctx.reply(messageText, Markup.inlineKeyboard([[
            Markup.button.callback('👈 Вернуться к задаче', `view_task_${taskId}`)
        ]]));

    } catch (error) {
        logger.error('Error in get_master_photo handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});

// Просмотр задачи
tasksScene.action(/^view_task_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const response = await LaravelService.getTaskById(taskId);

        if (!response?.data) {
            await ctx.answerCbQuery('❌ Задача не найдена');
            return;
        }

        const task = response.data;

        // Форматируем сообщение в виде строки, а не массива
        const messageText = `
📋 Задача #${task.id}

📝 Название: ${task.title}
👤 Мастер: ${task.master_name || 'Не указан'}
${task.master_phone ? `📱 Телефон: ${task.master_phone}` : ''}
🔄 Статус: ${getStatusText(task.status)}
⏰ Создано: ${formatDate(task.created_at)}
${task.deadline ? `⚠️ Дедлайн: ${formatDate(task.deadline)}` : ''}
${task.completed_at ? `✅ Выполнено: ${formatDate(task.completed_at)}` : ''}

${task.description ? `📄 Описание: ${task.description}` : ''}
`.trim();

        const keyboard = [];
        
        if (task.status !== 'completed') {
            keyboard.push([
                Markup.button.callback('✅ Отметить выполненной', `complete_task_${task.id}`)
            ]);
            if (task.status === 'pending') {
                keyboard.push([
                    Markup.button.callback('🔄 Взять в работу', `progress_task_${task.id}`)
                ]);
            }
        }

        if (task.type === 'photo_update') {
            keyboard.push([
                Markup.button.callback('🖼 Получить фото мастера', `get_master_photo_${task.id}`)
            ]);
        }

        keyboard.push([Markup.button.callback('👈 Назад к списку', 'back_to_tasks')]);
        keyboard.push([Markup.button.callback('🏠 В главное меню', 'mainmenu')]);

        await ctx.editMessageText(messageText, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(keyboard)
        });

    } catch (error) {
        logger.error('Error in view_task handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка при загрузке задачи');
    }
});

// Обработчики действий с задачами
tasksScene.action(/^complete_task_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const result = await LaravelService.completeTask(taskId);

        if (result?.success) {
            await ctx.answerCbQuery('✅ Задача отмечена как выполненная');
            await showTasks(ctx);
        } else {
            await ctx.answerCbQuery('❌ Не удалось обновить статус задачи');
        }
    } catch (error) {
        logger.error('Error in complete_task handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});

tasksScene.action(/^progress_task_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const result = await LaravelService.updateTaskStatus(taskId, 'in_progress');

        if (result?.success) {
            await ctx.answerCbQuery('✅ Задача взята в работу');
            await showTasks(ctx);
        } else {
            await ctx.answerCbQuery('❌ Не удалось обновить статус задачи');
        }
    } catch (error) {
        logger.error('Error in progress_task handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});

// Навигация и фильтры
tasksScene.action('prev_page', async (ctx) => {
    if (ctx.scene.state.tasksState.page > 1) {
        ctx.scene.state.tasksState.page--;
    }
    await ctx.answerCbQuery();
    await showTasks(ctx);
});

tasksScene.action('next_page', async (ctx) => {
    ctx.scene.state.tasksState.page++;
    await ctx.answerCbQuery();
    await showTasks(ctx);
});

tasksScene.action('filter_active', async (ctx) => {
    ctx.scene.state.tasksState.filter = 'active';
    ctx.scene.state.tasksState.page = 1;
    await ctx.answerCbQuery('🔵 Показаны активные задачи');
    await showTasks(ctx);
});

tasksScene.action('filter_completed', async (ctx) => {
    ctx.scene.state.tasksState.filter = 'completed';
    ctx.scene.state.tasksState.page = 1;
    await ctx.answerCbQuery('🔵 Показаны выполненные задачи');
    await showTasks(ctx);
});

tasksScene.action('back_to_tasks', async (ctx) => {
    await ctx.answerCbQuery();
    await showTasks(ctx);
});

tasksScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});

// Вспомогательные функции
function getStatusEmoji(status: string): string {
    return {
        'pending': '⏳',
        'in_progress': '🔄',
        'completed': '✅'
    }[status] || '❓';
}

function getStatusText(status: string): string {
    return {
        'pending': 'Ожидает выполнения',
        'in_progress': 'В процессе',
        'completed': 'Выполнена'
    }[status] || 'Неизвестно';
}

function formatDate(date: string): string {
    return new Date(date).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function buildMainMenuKeyboard() {
    return Markup.inlineKeyboard([[
        Markup.button.callback('👈 Вернуться в меню', 'mainmenu')
    ]]);
}

export default tasksScene;