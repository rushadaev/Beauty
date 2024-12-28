import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import LaravelService from '../../../../services/laravelService';

export const salaryScene = new Scenes.BaseScene<MyContext>('salary');

// Обработчик кнопки экспорта
salaryScene.action('export_salary', async (ctx) => {
    try {
        await ctx.answerCbQuery('Генерируем отчет...');
        
        // Получаем файл через сервис
        const excelBuffer = await LaravelService.exportSalaryReport();

        // Создаем временный файл
        const tempDir = path.join(__dirname, '../../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `salary_${Date.now()}.xlsx`);
        fs.writeFileSync(tempFilePath, excelBuffer);

        // Отправляем файл
        await ctx.replyWithDocument({
            source: tempFilePath,
            filename: `salary_report.xlsx`
        });

        // Удаляем временный файл
        fs.unlinkSync(tempFilePath);

    } catch (error) {
        console.error('Error exporting salary:', error);
        await ctx.reply('Произошла ошибка при формировании отчета. Попробуйте позже.');
    }
});

salaryScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

// Входная точка сцены
salaryScene.enter(async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📥 Скачать отчет по зарплате', 'export_salary')],
        [Markup.button.callback('◀️ Назад', 'mainmenu')]
    ]);

    await ctx.reply('💰 Управление зарплатами', keyboard);
});