import { Scenes, Markup } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from '../../../../services/laravelService';
import { openAIService } from '../../../../services/openaiService';


export const changeDescriptionScene = new Scenes.WizardScene<MyContext>(
    'change_description_scene',
    // Шаг 1: Запрос описания
    async (ctx) => {
        ctx.session.descriptionForm = {};
        ctx.session.isEditing = false;

        console.log('Session state at description start:', {
            sessionPhone: ctx.session?.phone,
            sessionPassword: ctx.session?.password ? '[PRESENT]' : '[MISSING]',
            sessionUser: ctx.session?.user ? '[PRESENT]' : '[MISSING]'
        });
        
        await ctx.reply(
            'Давайте подготовим ваше описание! Напишите пожалуйста своё имя и пару слов про себя, а искусственный интеллект сделает магию!',
            Markup.inlineKeyboard([[Markup.button.callback('❌ Отменить', 'cancel')]])
        );
        
        return ctx.wizard.next();
    },

    // Шаг 2: Генерация и предварительный просмотр
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Пожалуйста, отправьте текстовое сообщение.');
            return;
        }

        try {
            const userInput = ctx.message.text;
            const processingMessage = await ctx.reply('⏳ Генерируем описание...');

            if (!ctx.session.descriptionForm) {
                ctx.session.descriptionForm = {};
            }
            ctx.session.descriptionForm.tempDescription = userInput;

            const newDescription = await openAIService.generateDescription(
                
                userInput
            );

            ctx.session.descriptionForm.generatedDescription = newDescription;
            await ctx.telegram.deleteMessage(ctx.chat!.id, processingMessage.message_id).catch(() => {});

            await ctx.reply(
                '✨ Вот ваше новое описание:\n\n' + 
                newDescription + '\n\n' +
                'Что бы вы хотели сделать с этим описанием?',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Подтвердить и опубликовать', 'confirm_description')],
                    [Markup.button.callback('✏️ Отредактировать', 'edit_description')],
                    [Markup.button.callback('🔄 Сгенерировать заново', 'regenerate')],
                    [Markup.button.callback('❌ Отменить', 'cancel')]
                ])
            );
            
            return ctx.wizard.next();
        } catch (error: any) {
            console.error('Error in description generation:', {
                error: error.message,
                sessionState: {
                    phone: ctx.session?.phone,
                    hasPassword: !!ctx.session?.password
                }
            });

            await ctx.reply(
                'Произошла ошибка при генерации описания. Пожалуйста, попробуйте позже.',
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Попробовать снова', 'retry_description')],
                    [Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
                ])
            );
        }
    },

    // Шаг 3: Обработка редактирования
    async (ctx) => {
        console.log('Step 3: Processing message, isEditing:', ctx.session.isEditing);
        
        // Если это не режим редактирования, игнорируем сообщение
        if (!ctx.session.isEditing) {
            console.log('Step 3: Not in editing mode, skipping');
            return;
        }

        if (!ctx.message || !('text' in ctx.message)) {
            console.log('Step 3: No text in message');
            await ctx.reply('Пожалуйста, отправьте текстовое сообщение.');
            return;
        }

        try {
            console.log('Step 3: Processing edited description');
            const editedDescription = ctx.message.text;
            
            if (editedDescription.length > 300) {
                console.log('Step 3: Description too long');
                await ctx.reply(
                    '❌ Описание не должно превышать 300 символов. Сейчас длина: ' + editedDescription.length + ' символов.\n' +
                    'Пожалуйста, сократите текст и отправьте снова.',
                    Markup.inlineKeyboard([[Markup.button.callback('❌ Отменить', 'cancel')]])
                );
                return;
            }
            
            if (!ctx.session.descriptionForm) {
                ctx.session.descriptionForm = {};
            }
            ctx.session.descriptionForm.generatedDescription = editedDescription;
            ctx.session.isEditing = false;
            await ctx.reply(
                '📝 Проверьте отредактированное описание:\n\n' +
                editedDescription + '\n\n' +
                'Что бы вы хотели сделать с этим описанием?',
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Подтвердить и опубликовать', 'confirm_description')],
                    [Markup.button.callback('✏️ Отредактировать ещё раз', 'edit_description')],
                    [Markup.button.callback('🔄 Сгенерировать заново', 'regenerate')],
                    [Markup.button.callback('❌ Отменить', 'cancel')]
                ])
            );

            
            console.log('Step 3: Description updated successfully');
        } catch (error) {
            console.error('Step 3: Error processing description:', error);
            await ctx.reply(
                '❌ Произошла ошибка при обработке описания.',
                Markup.inlineKeyboard([[
                    Markup.button.callback('🔄 Попробовать снова', 'edit_description')
                ]])
            );
        }
    }
);

// Обработчики действий
changeDescriptionScene.action('confirm_description', async (ctx) => {
    await ctx.answerCbQuery();
    const description = ctx.session.descriptionForm?.generatedDescription;

    if (!description) {
        await ctx.reply('Ошибка: описание не найдено. Попробуйте начать заново.');
        return ctx.scene.reenter();
    }

    const processingMessage = await ctx.reply('⏳ Обновляем ваш профиль...');

    try {
        const updated = await laravelService.updateMasterDescription(
            ctx.session.phone!,
            ctx.session.password!,
            description
        );

        if (!updated) {
            throw new Error('Не удалось обновить описание');
        }

        await ctx.telegram.deleteMessage(ctx.chat!.id, processingMessage.message_id).catch(() => {});
        await ctx.reply(
            '✅ Описание успешно обновлено!\n\n' +
            '💫 Новое описание уже доступно в вашем профиле.',
            Markup.inlineKeyboard([[Markup.button.callback('🏠 В главное меню', 'back_to_menu')]])
        );

        return ctx.scene.enter('main');
    } catch (error) {
        await ctx.telegram.deleteMessage(ctx.chat!.id, processingMessage.message_id).catch(() => {});
        await ctx.reply(
            '❌ Произошла ошибка при обновлении профиля.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Попробовать снова', 'retry_description')],
                [Markup.button.callback('👈 В меню', 'back_to_menu')]
            ])
        );
    }
});

changeDescriptionScene.action('edit_description', async (ctx) => {
    console.log('Edit action triggered');
    await ctx.answerCbQuery();
    
    // Устанавливаем флаг редактирования
    ctx.session.isEditing = true;
    console.log('Set editing mode, isEditing:', ctx.session.isEditing);
    
    await ctx.reply(
        '✏️ Отправьте отредактированный вариант описания:\n\n' +
        ctx.session.descriptionForm?.generatedDescription,
        Markup.inlineKeyboard([[Markup.button.callback('❌ Отменить', 'cancel')]])
    );
});

// Обработчик для "Сгенерировать заново"
changeDescriptionScene.action('regenerate', async (ctx) => {
    await ctx.answerCbQuery();
    
    if (!ctx.session.descriptionForm?.tempDescription) {
        await ctx.reply(
            '❌ Не удалось найти исходный текст. Начнем заново.',
            Markup.inlineKeyboard([[
                Markup.button.callback('🔄 Начать заново', 'retry_description')
            ]])
        );
        return;
    }

    try {
        const processingMessage = await ctx.reply('🤖 Генерируем новое описание...');
        
        const newDescription = await openAIService.generateDescription(
            ctx.session.descriptionForm.tempDescription
        );

        ctx.session.descriptionForm.generatedDescription = newDescription;
        await ctx.telegram.deleteMessage(ctx.chat!.id, processingMessage.message_id).catch(() => {});

        await ctx.reply(
            '✨ Вот новый вариант описания:\n\n' + 
            newDescription + '\n\n' +
            'Что бы вы хотели сделать с этим описанием?',
            Markup.inlineKeyboard([
                [Markup.button.callback('✅ Подтвердить и опубликовать', 'confirm_description')],
                [Markup.button.callback('✏️ Отредактировать', 'edit_description')],
                [Markup.button.callback('🔄 Сгенерировать заново', 'regenerate')],
                [Markup.button.callback('❌ Отменить', 'cancel')]
            ])
        );
    } catch (error) {
        console.error('Error regenerating description:', error);
        await ctx.reply(
            '❌ Произошла ошибка при генерации нового описания.',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Попробовать снова', 'regenerate')],
                [Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
            ])
        );
    }
});

changeDescriptionScene.action('retry_description', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});

changeDescriptionScene.action('cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Операция отменена');
    return ctx.scene.enter('main');
});

changeDescriptionScene.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('main');
});