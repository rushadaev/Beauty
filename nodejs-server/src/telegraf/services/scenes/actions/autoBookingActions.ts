// ./scenes/autoBookingActions.ts

import { Markup } from 'telegraf';
import {bold, code, fmt, link} from "telegraf/format";
import { MyContext } from '../../../types/MyContext';
import logger from '../../../../utils/logger/loggerTelegram';
import WarehouseService from "../../../../services/WarehouseService";
import {createOrderRequest, getDraftsForUser} from "../../../../services/wildberriesService";
import CacheService from '../../../../utils/redis/Cache/Cache';
import { COEFFICIENTS, BOX_TYPES, DATES, WAREHOUSES, COEFFICIENTS_TEXT_ONLY, BOX_TYPES_TEXT_ONLY } from "../../../../utils/wildberries/consts";
import {formatDateDDMMYYYY} from "../../../../utils/dateUtils";
import LaravelService from "../../../../services/laravelService";

// Default buttons with Back and Main Menu
const defaultButtons = [
    [Markup.button.callback('👈 Назад', 'back')],
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

const defaultButtonsMenuOnly = [
    [Markup.button.callback('👌 Главное меню', 'mainmenu')],
];

export const sendSearchSlotMessage = async (ctx: MyContext) => {
    const message = fmt`🫡 Поиск слотов
    
Поиск слотов — запуск отслеживания по вашим параметрам без автоматического бронирования. Как только нужный слот будет найден, вы получите уведомление.

Рекомендуем воспользоваться автобронирование поставки - /autobooking`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Приступить', 'search_slot')],
        ...defaultButtonsMenuOnly
    ]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('🔍 Поиск слотов');
    } catch (error) {
        logger.error('Error sending search slot message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the cabinet selection message with available cabinets.
 */
export const sendCabinetSelection = async (ctx: MyContext, cabinets: any[]) => {

    const activeCabinets = cabinets.filter(cab => cab?.settings?.cabinet_id && cab?.settings?.is_active);

    let cabinetsButtons = [];
    if(activeCabinets.length > 0) {
        cabinetsButtons = activeCabinets.map((cabinet) => {
            return [Markup.button.callback(`📦 ${cabinet.name}`, `select_cabinet_${cabinet.settings.cabinet_id}`)];
        });
    } else{
        cabinetsButtons = [
            [Markup.button.callback('➕ Добавить кабинет', 'create_cabinet')],
        ];
    }

    const keyboard = Markup.inlineKeyboard(
        [...cabinetsButtons, ...defaultButtonsMenuOnly]
    );

    const message = fmt`🫡 Выберите нужный кабинет`;

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('📦 Автобронирование');
    } catch (error) {
        logger.error('Error sending cabinet selection message:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends the draft selection message with available drafts.
 */
export const sendDraftSelection = async (ctx: MyContext) => {
    try {
        await ctx.answerCbQuery('😎 Ищем черновики');
    } catch (error) {
        logger.error('Error answering callback query:', error);
    }

    logger.info('Entered draft selection');
    try {
        const cacheKey = `drafts_data_${ctx.from.id}`;
        const selectedCabinetId = ctx.session.autobookingForm.cabinetId;
        const drafts = await CacheService.rememberCacheValue(
            cacheKey,
            () => getDraftsForUser(selectedCabinetId),
            10 // Cache expiration set to 2 hours
        );

        if (!drafts || drafts.length === 0) {
            await ctx.answerCbQuery('У вас нет доступных черновиков', {
                show_alert: true,
            });
            return;
        }

        const draftButtons = drafts.map((draft) => {
            const date = new Date(draft.createdAt).toLocaleDateString('ru-RU');
            const goodQuantity = draft.goodQuantity;
            const title = `${date} – кол-во товаров – ${goodQuantity} шт.`;

            return [Markup.button.callback(`· ${title}`, `select_draft_${draft.draftId}`)];
        });

        const keyboard = Markup.inlineKeyboard([...draftButtons, ...defaultButtons]);

        const message = "🫡 Выберите необходимый черновик с заполненными товарами 👇";

        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
    } catch (error) {
        logger.error('Error getting drafts:', error);
        await ctx.reply('Произошла ошибка при получении черновиков. Пожалуйста, попробуйте позже.', Markup.inlineKeyboard(defaultButtonsMenuOnly));
        throw error;
    }
};

/**
 * Sends the warehouse selection message with available warehouses.
 */
export const sendWarehouseSelection = async (ctx: MyContext) => {
    logger.info('Entered warehouse selection');
    try {
        const warehouses = await WarehouseService.getWarehouses(ctx.session.page);
        const warehouseButtons = warehouses.keyboard.map((row) => row.map((button) => {
            return Markup.button.callback(button.text, button.callback_data);
        }));

        const keyboard = Markup.inlineKeyboard([...warehouseButtons, ...defaultButtons]);

        const message = fmt`🫡 Выберите необходимый склад`;

        try {
            await ctx.answerCbQuery('😎 Выберите склад');
            await ctx.editMessageText(message, {
                ...keyboard,
                link_preview_options: {
                    is_disabled: true
                },
            });
        } catch (error) {
            logger.error('Error sending warehouse selection message:', error);
            await ctx.reply(message, keyboard);
        }
    } catch (error) {
        logger.error('Error sending warehouse selection message:', error);
        await ctx.reply('Произошла ошибка при получении складов. Пожалуйста, попробуйте позже.', Markup.inlineKeyboard(defaultButtons));
    }
};

/**
 * Sends the coefficient selection message with available coefficients.
 */
export const sendCoefficientSelection = async (ctx: MyContext) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;

    const message = fmt`🫡 Выберите нужный коэффициент

Например, если вы выберете до ${code(`x2`)}, бот будет искать варианты с коэффициентом до ${code(`x2`)}, включая бесплатные, ${code(`x1`)} и ${code(`x2`)}.

${bold(`Данные по заявке`)}: 

${bold(`Склад`)} — ${code(WAREHOUSES[warehouseId])}`;

    let coefficientsButtons = [];

    // Add the first button as a separate row
    coefficientsButtons.push([
        Markup.button.callback(COEFFICIENTS[0], `wh_coefficient_set_0`)
    ]);

    // Add the remaining buttons in pairs
    for (let i = 1; i < 7; i += 2) {
        let row = [
            Markup.button.callback(COEFFICIENTS[i], `wh_coefficient_set_${i}`)
        ];

        if (i + 1 < 7) {
            row.push(Markup.button.callback(COEFFICIENTS[i + 1], `wh_coefficient_set_${i + 1}`));
        }

        coefficientsButtons.push(row);
    }

    const keyboard = Markup.inlineKeyboard([...coefficientsButtons, ...defaultButtons]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('😎 Выберите коэффициент');
    } catch (error) {
        logger.error('Error sending coefficient selection message:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends the box type selection message with available box types.
 */
export const sendBoxTypeSelection = async (ctx: MyContext) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;

    const message = fmt`🫡 Выберите тип упаковки

${bold(`Данные по заявке`)}: 

${bold(`Склад`)} — ${code(WAREHOUSES[warehouseId])}
${bold(`Коэффицент`)} — ${code(COEFFICIENTS_TEXT_ONLY[coefficient])}`;

    const boxTypes = [];
    for (const key in BOX_TYPES) {
        boxTypes.push([Markup.button.callback(BOX_TYPES[key], `wh_box_type_set_${key}`)]);
    }

    const keyboard = Markup.inlineKeyboard([...boxTypes, ...defaultButtons]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('😎 Выберите тип упаковки');
    } catch (error) {
        logger.error('Error sending box type selection message:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends the date selection message with available date options.
 */
export const sendDateSelection = async (ctx: MyContext) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;

    const message = fmt`🫡 Выберите подходящую дату

Если выбрана опция "неделя" или "месяц", вы задаёте период, и бот найдёт ближайшую доступную дату в этом диапазоне.

${bold(`Данные по заявке`)}: 

${bold(`Склад`)} — ${code(WAREHOUSES[warehouseId])}
${bold(`Коэффицент`)} — ${code(COEFFICIENTS_TEXT_ONLY[coefficient])}
${bold(`Тип упаковки`)} — ${code(BOX_TYPES_TEXT_ONLY[boxTypeId])}
${boxTypeId === '5' && ctx.session.autobookingForm.monopalletCount ? fmt`${bold('Кол-во монопаллетов')}: ${code(ctx.session.autobookingForm.monopalletCount)}` : ''}
`;

    const dates = [];

    for (const key in DATES) {
        dates.push([Markup.button.callback(DATES[key], `wh_date_set_${key}`)]);
    }

    const keyboard = Markup.inlineKeyboard([
        ...dates,
        ...defaultButtons
    ]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('😎 Выберите дату');
    } catch (error) {
        logger.error('Error sending date selection message:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends the order confirmation message.
 */
export const sendOrderConfirmation = async (ctx: MyContext, selectedDate: string) => {
    let datesText: string = '';
    if (selectedDate === 'customdates') {
        datesText = ctx.session.autobookingForm.dates.join(', ');
    } else {
        const checkUntilDate = new Date();

        const todayDate = formatDateDDMMYYYY(new Date());
        let prefix = '';
        switch (selectedDate) {
            case 'today':
                checkUntilDate.setHours(23, 59, 59, 999);
                break;
            case 'tomorrow':
                checkUntilDate.setDate(checkUntilDate.getDate() + 1);
                checkUntilDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                checkUntilDate.setDate(checkUntilDate.getDate() + 7);
                checkUntilDate.setHours(23, 59, 59, 999);
                prefix = `${todayDate} - `;
                break;
            case 'month':
                checkUntilDate.setMonth(checkUntilDate.getMonth() + 1);
                checkUntilDate.setHours(23, 59, 59, 999);
                prefix = `${todayDate} - `;
                break;
        }

        ctx.session.autobookingForm.checkUntilDate = formatDateDDMMYYYY(checkUntilDate);

        datesText = `${prefix}${ctx.session.autobookingForm.checkUntilDate}`;
    }

    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;


    const message = fmt`
${bold(`🫡 Ваша заявка`)}: 

${bold(`Склад`)} — ${code(WAREHOUSES[warehouseId])}
${bold(`Коэффицент`)} — ${code(COEFFICIENTS_TEXT_ONLY[coefficient])}
${bold(`Тип упаковки`)} — ${code(BOX_TYPES_TEXT_ONLY[boxTypeId])}
${boxTypeId === '5' && ctx.session.autobookingForm.monopalletCount ? fmt`${bold('Кол-во монопаллетов')}: ${code(ctx.session.autobookingForm.monopalletCount)}` : ''}
${bold(`Дата`)} — ${code(datesText)}

`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Подтвердить', 'confirm_order')],
        ...defaultButtons
    ]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('😎 Подтвердите заказ');
    } catch (error) {
        logger.error('Error sending order confirmation message:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends the final confirmation message after the order is confirmed.
 */
export const sendFinalConfirmation = async (ctx: MyContext) => {
    let datesText: string = '';
    if (ctx.session.autobookingForm.dates.length > 0) {
        datesText = ctx.session.autobookingForm.dates.join(', ');
    } else {
        datesText = ctx.session.autobookingForm.checkUntilDate;
    }

   if(ctx.session.autobookingForm.isBooking) {
       //creating order in wb
       try {
           let userId = ctx.session.autobookingForm.cabinetId;
           let draftId = ctx.session.autobookingForm.draftId;
           let warehouseId = ctx.session.autobookingForm.warehouseId;
           let boxTypeMask = ctx.session.autobookingForm.boxTypeId;

           const response = await createOrderRequest(userId, draftId, warehouseId, boxTypeMask);
           ctx.session.autobookingForm.preorderId = response.preorderID;
       } catch (error) {
           logger.error('Error creating order:', error
           );
           await ctx.reply('Произошла ошибка при создании заказа. Пожалуйста, попробуйте позже.', Markup.inlineKeyboard(defaultButtonsMenuOnly));
           throw error;
       }
   }

    try {
        await LaravelService.createNotificationByTelegramId(ctx.from.id, ctx.session.autobookingForm);
    } catch (error) {
        logger.error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', Markup.inlineKeyboard(defaultButtonsMenuOnly));
        throw error;
    }

    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;

    const message = fmt`🫡 Ваша заявка готова 

Мы уже ищем тайм-слот для вашей поставки, как только найдем наша система автоматически забронирует поставку. Каждые 3 часа мы будем присылать статус заявки 🫶

${bold(`Данные по заявке`)}: 

${bold(`Склад`)} — ${code(WAREHOUSES[warehouseId])}
${bold(`Коэффицент`)} — ${code(COEFFICIENTS_TEXT_ONLY[coefficient])}
${bold(`Тип упаковки`)} — ${code(BOX_TYPES_TEXT_ONLY[boxTypeId])}
${boxTypeId === '5' && ctx.session.autobookingForm.monopalletCount ? fmt`${bold('Кол-во монопаллетов')}: ${code(ctx.session.autobookingForm.monopalletCount)}` : ''}
${bold(`Дата`)} — ${code(datesText)}
`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
    } catch (error) {
        logger.error('Error sending final confirmation message:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends a prompt asking the user to input custom dates.
 */
export const sendCustomDatePrompt = async (ctx: MyContext) => {
    const message = fmt`🫡 Введите несколько нужных дат через запятую в формате ДД.ММ.ГГГГ, например:
• ${code('10.08.2025, 12.08.2025')}

На каждую дату будет создана отдельная заявка.`;

    const keyboard = Markup.inlineKeyboard([...defaultButtons]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('📝 Введите ваши даты');
    } catch (error) {
        logger.error('Error sending custom date prompt:', error);
        await ctx.reply(message, keyboard);
    }
};

/**
 * Sends a pallet count input prompt.
 */
export const sendPalletCountPrompt = async (ctx: MyContext) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;

    const message = fmt`🫡 Введите кол-во монопаллетов
    
${bold(`Данные по заявке`)}:
${bold(`Склад`)} — ${code(WAREHOUSES[warehouseId])}
${bold(`Коэффицент`)} — ${code(COEFFICIENTS_TEXT_ONLY[coefficient])}
${bold(`Тип упаковки`)} — ${code(BOX_TYPES_TEXT_ONLY[boxTypeId])}
    `;

    const keyboard = Markup.inlineKeyboard([...defaultButtons]);

    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('📝 Введите количество монопаллетов');
    } catch (error) {
        logger.error('Error sending pallet count prompt:', error);
        await ctx.reply(message, keyboard);
    }
}

/**
 * Sends an error message with a standard keyboard.
 */
export const sendErrorMessage = async (ctx: MyContext, errorMsg: string) => {
    const keyboard = Markup.inlineKeyboard([...defaultButtons]);

    try {
        await ctx.editMessageText(errorMsg, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
    } catch (error) {
        logger.error('Error sending error message:', error);
        await ctx.reply(errorMsg, keyboard);
    }
};

export const sendInstructions = async (ctx: MyContext) => {
    const message = fmt`Создайте в кабинете черновик поставки не выбирая дату и склад поставки и сохраните черновик.
Инструкции — ${link(`тут.`, 'https://telegra.ph/Instrukciya-po-avtobronirovaniyu-08-10')}`;

    const buttonCreate = [Markup.button.callback('🤞 Создать поставку из черновика', 'start_autobooking')];
    const keyboard = Markup.inlineKeyboard([buttonCreate, ...defaultButtons]);


    try {
        await ctx.editMessageText(message, {
            ...keyboard,
            link_preview_options: {
                is_disabled: true
            },
        });
        await ctx.answerCbQuery('📝 Инструкции');
    } catch (error) {
        logger.error('Error sending instructions:', error);
        await ctx.reply(message, keyboard);
    }

}

