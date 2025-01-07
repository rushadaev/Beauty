import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import LaravelService from '../../../../services/laravelService';

// Создаем интерфейс для состояния сцены
interface SalarySceneState {
    awaitingStartDate?: boolean;
    awaitingEndDate?: boolean;
}

// Создаем интерфейс для хранения дат
interface DateRange {
    startDate: string;
    endDate: string;
}

export const salaryScene = new Scenes.BaseScene<MyContext>('salary');

// Хранилище состояний пользователей
const userStates = new Map<number, DateRange>();

// Функция для конвертации даты из формата DD.MM.YYYY в YYYY-MM-DD
function convertDateFormat(dateStr: string): string | null {
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[2]}-${match[1]}`;
}

// Обработчик выбора периода
salaryScene.action('select_period', async (ctx) => {
    await ctx.reply('Введите дату начала периода в формате ДД.ММ.ГГГГ (например, 28.12.2024)');
    ctx.scene.state = { awaitingStartDate: true } as SalarySceneState;
});

// Обработчик ввода текста (дат)
salaryScene.on('text', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = ctx.scene.state as SalarySceneState;

    if (state.awaitingStartDate) {
        const startDateInput = ctx.message.text;
        const startDate = convertDateFormat(startDateInput);
        
        if (!startDate) {
            await ctx.reply('Неверный формат даты. Используйте формат ДД.ММ.ГГГГ (например, 28.12.2024)');
            return;
        }

        userStates.set(userId, { startDate, endDate: '' });
        ctx.scene.state = { awaitingEndDate: true } as SalarySceneState;
        await ctx.reply('Теперь введите дату конца периода в формате ДД.ММ.ГГГГ');
        return;
    }

    if (state.awaitingEndDate) {
        const endDateInput = ctx.message.text;
        const endDate = convertDateFormat(endDateInput);
        
        if (!endDate) {
            await ctx.reply('Неверный формат даты. Используйте формат ДД.ММ.ГГГГ (например, 28.12.2024)');
            return;
        }

        const dateRange = userStates.get(userId);
        if (dateRange) {
            dateRange.endDate = endDate;
            userStates.set(userId, dateRange);

            // Преобразуем даты обратно для отображения
            const displayStartDate = dateRange.startDate.split('-').reverse().join('.');
            const displayEndDate = dateRange.endDate.split('-').reverse().join('.');

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('📥 Сформировать отчет', 'export_salary')],
                [Markup.button.callback('🔄 Выбрать другой период', 'select_period')],
                [Markup.button.callback('◀️ Назад', 'mainmenu')]
            ]);

            await ctx.reply(
                `Выбран период: ${displayStartDate} — ${displayEndDate}`,
                keyboard
            );
        }
        ctx.scene.state = {} as SalarySceneState;
    }
});

// Обработчик экспорта
salaryScene.action('export_salary', async (ctx) => {
    try {
        const userId = ctx.from?.id;
        if (!userId) return;

        const dateRange = userStates.get(userId);
        if (!dateRange) {
            await ctx.reply('Пожалуйста, сначала выберите период');
            return;
        }

        await ctx.answerCbQuery('Генерируем отчет...');
        
        const excelBuffer = await LaravelService.exportSalaryReport(
            dateRange.startDate,
            dateRange.endDate
        );

        const tempDir = path.join(__dirname, '../../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Преобразуем даты для имени файла
        const fileStartDate = dateRange.startDate.split('-').reverse().join('.');
        const fileEndDate = dateRange.endDate.split('-').reverse().join('.');
        
        const tempFilePath = path.join(tempDir, `salary_${Date.now()}.xlsx`);
        fs.writeFileSync(tempFilePath, excelBuffer);

        await ctx.replyWithDocument({
            source: tempFilePath,
            filename: `Зарплаты_${fileStartDate}-${fileEndDate}.xlsx`
        });

        fs.unlinkSync(tempFilePath);

    } catch (error) {
        console.error('Error exporting salary:', error);
        await ctx.reply('Произошла ошибка при формировании отчета. Попробуйте позже.');
    }
});

// Возврат в главное меню
salaryScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});

// Входная точка сцены
salaryScene.enter(async (ctx: MyContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📅 Выбрать период', 'select_period')],
        [Markup.button.callback('◀️ Назад', 'mainmenu')]
    ]);

    await ctx.reply('💰 Управление зарплатами', keyboard);
});