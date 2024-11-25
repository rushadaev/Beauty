import {Markup} from "telegraf";
import {MyContext} from "../../../types/MyContext";
import LaravelService from "../../../../services/laravelService";
import logger from "../../../../utils/logger/loggerTelegram";

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
        const productData = await LaravelService.getUsersByTelegramId(ctx.from.id, page, perPage);

        console.log('productData', productData);

        if (!productData || productData.tasks.length === 0) {
            await ctx.reply('Нет доступных сотрудников', Markup.inlineKeyboard([
                [Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }

        const { tasks, currentPage, totalPages } = productData;


        // Generate buttons for products
        const buttons = tasks.map(task => {
            return [
                Markup.button.callback(task.name, `user_${task.id}`)
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

        const message = `[управление персоналом]
В этом блоке вы можете увидеть всех мастеров

[списком в кнопках выводи карточки персонала]`;
        const keyboard = Markup.inlineKeyboard(buttons);

        try {
            await ctx.editMessageText(message, {
                ...keyboard, // Spread the keyboard markup
                link_preview_options: {
                    is_disabled: true
                },
            });
            await ctx.answerCbQuery('Персонал');
        } catch (error) {
            logger.error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }

        await ctx.answerCbQuery();
    } catch (error) {
        logger.error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке персонала', Markup.inlineKeyboard([
            [Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
}

export const userBlockHandler = async (ctx: MyContext) => {
    const user_id = ctx.scene.session.user_id;
    const userOne = await LaravelService.getUserById(ctx.from.id, user_id);
    const user = userOne[0];
    const message = `[карточка персонала]
    
Имя: ${user.name}
Телефон: ${user.phone}
Email: ${user.email}
`;

    const keyboard = Markup.inlineKeyboard([
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
        await ctx.answerCbQuery('Персонал');
    } catch (error) {
        logger.error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
}