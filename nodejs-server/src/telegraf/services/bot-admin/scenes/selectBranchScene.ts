// src/services/scenes/warehouse/selectBranchScene.ts
import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import LaravelService from '../../../../services/laravelService';
import logger from '../../../../utils/logger/loggerTelegram';

export const selectBranchScene = new Scenes.BaseScene<MyContext>('select_branch_scene');

selectBranchScene.enter(async (ctx) => {
    try {
        // Получаем компании
        const response = await LaravelService.getCompanies();

        if (!response?.success || !response?.data) {
            await ctx.reply('Нет доступных филиалов');
            return ctx.scene.enter('warehouse');
        }

        const companies = response.data;

        // Создаем кнопки для каждого филиала
        const buttons = companies.map(company => [
            Markup.button.callback(
                company.title, 
                `select_branch_${company.id}`
            )
        ]);

        buttons.push([
        
            Markup.button.callback('🏠 Главное меню', 'mainmenu')
        ]);

        const messageText = 'Выберите филиал для просмотра товаров:';
        
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(messageText, 
                Markup.inlineKeyboard(buttons)
            );
        } else {
            await ctx.reply(messageText, 
                Markup.inlineKeyboard(buttons)
            );
        }
    } catch (error) {
        logger.error('Error in selectBranchScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке списка филиалов');
        return ctx.scene.enter('warehouse');
    }
});

selectBranchScene.action(/^select_branch_(\d+)$/, async (ctx) => {
    try {
        const branchId = ctx.match[1];
        // Сохраняем в общей сессии вместо scene.session
        ctx.session.selectedBranchId = branchId;
        
        console.log('Selected branch ID in selection:', {
            branchId,
            session: ctx.session
        });
        
        await ctx.answerCbQuery('Филиал выбран');
        return ctx.scene.enter('products_scene');
    } catch (error) {
        logger.error('Error in branch selection:', error);
        await ctx.reply('Произошла ошибка при выборе филиала');
        return ctx.scene.enter('select_branch_scene');
    }
});

selectBranchScene.action('back_to_warehouse', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse');  // Теперь возвращаемся в основное меню склада
});

selectBranchScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});