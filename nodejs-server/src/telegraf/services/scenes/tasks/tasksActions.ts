import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";
import LaravelService from "../../../../services/laravelService";
import logger from "../../../../utils/logger/loggerTelegram";
import {code, fmt} from "telegraf/format";

const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'reenter')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const enterHandler = async (ctx: MyContext) => {

    const page = ctx.session.page || 1; // Store page in session for navigation
    const perPage = 10; // Adjust perPage if needed

    try {
        const productData = await LaravelService.getTaskByTelegramId(ctx.from.id, page, perPage);

        console.log('productData', productData);

        if (!productData || productData.tasks.length === 0) {
            await ctx.reply('Нет доступных товаров.', Markup.inlineKeyboard([
                [Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }

        const { tasks, currentPage, totalPages } = productData;


        // Generate buttons for products
        const buttons = tasks.map(task => {
            const statusEmoji = task.status == 'open' ? '🟡' : '🟢';
            return [
            Markup.button.callback(statusEmoji + ' ' + task.name, `task_${task.id}`)
        ]
        });

        // Add navigation buttons
        const navigationButtons = [];
        if (currentPage > 1) {
            navigationButtons.push(Markup.button.callback('← Назад', `tasks_page_${currentPage - 1}`));
        }
        if (currentPage < totalPages) {
            navigationButtons.push(Markup.button.callback('Вперед →', `tasks_page_${currentPage + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }

        buttons.push(...defaultButtonsMenuOnly);

        const message = `[задачи]

В этом блоке будут все задачи

[списком в кнопках выводи задачи]`;
        const keyboard = Markup.inlineKeyboard(buttons);

        try {
            await ctx.editMessageText(message, {
                ...keyboard, // Spread the keyboard markup
                link_preview_options: {
                    is_disabled: true
                },
            });
            await ctx.answerCbQuery('Введите сумму для оплаты');
        } catch (error) {
            logger.error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }

        await ctx.answerCbQuery();
    } catch (error) {
        logger.error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров.', Markup.inlineKeyboard([
            [Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
}

export const taskBlockHandler = async (ctx: MyContext) => {
    const task_id = ctx.scene.session.task_id;

    try {
        const tasks = await LaravelService.getTaskById(ctx.from.id, task_id);
        const task = tasks[0];
        const message = fmt`
        [задача]
Название: ${code(task.name)}
Описание: ${code(task.description)}
Описание: ${code(task.description)}
Номер задачи: ${code(task.task_number)}
Ответственный: ${code(task.responsible)}
Срок: ${code(task.deadline)}
Дата назначения: ${code(task.assigned_date)}
Статус: ${code(task.status)}
`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('Закрыть задачу', 'close_task')],
            [Markup.button.callback('👈 Назад', 'reenter')],
            [Markup.button.callback('👌 Главное меню', 'mainmenu')],
        ]);

        try {
            await ctx.editMessageText(message, {
                ...keyboard, // Spread the keyboard markup
                link_preview_options: {
                    is_disabled: true
                },
            });
            await ctx.answerCbQuery('Загрузка товаров');
        } catch (error) {
            logger.error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }

    } catch (error) {
        logger.error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке задач', Markup.inlineKeyboard([
            [Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
}