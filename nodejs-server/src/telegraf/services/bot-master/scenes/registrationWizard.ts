import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from "../../../../services/laravelService";
import { CallbackQuery } from 'telegraf/types';

// Session interface to store user data
interface RegistrationSession {
    fullName?: string;
    birthDate?: string;
    passport?: string;
    issuedBy?: string;
    issueDate?: string;
    divisionCode?: string;
    registrationAddress?: string;
    inn?: string;
    accountNumber?: string;
    bankName?: string;
    bik?: string;
    corrAccount?: string;
    bankInn?: string;
    bankKpp?: string;
    phone?: string;
    email?: string;
    hasMedBook?: boolean;
    medBookExpiry?: string;
    hasEducationCert?: boolean;
    educationCertPhoto?: string;
    isSelfEmployed?: boolean;
    masterPrice: number;  // Убираем ? чтобы сделать поле обязательным
}

// Validation formats
const ValidationFormats = {
    FULL_NAME: /^[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s[А-ЯЁ][а-яё]+(?:\s[А-ЯЁ][а-яё]+)?$/,
    BIRTH_DATE: /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/,
    PASSPORT: /^\d{4}\s\d{6}$/,
    DIVISION_CODE: /^\d{3}-\d{3}$/,
    INN: /^\d{12}$/,
    ACCOUNT_NUMBER: /^\d{20}$/,
    BIK: /^\d{9}$/,
    CORR_ACCOUNT: /^\d{20}$/,
    BANK_INN: /^\d{10}$/,
    BANK_KPP: /^\d{9}$/,
    PHONE: /^\+7\d{10}$/,
    EMAIL: /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,61}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/,
    ISSUE_DATE: /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/,
    MED_BOOK_EXPIRY: /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/
};

// Validation messages
const ValidationMessages = {
    FULL_NAME: {
        prompt: 'Напишите, пожалуйста, свое ФИО\n\nПример: Иванов Иван Иванович',
        error: 'Неверный формат ФИО. ФИО должно содержать только русские буквы, пробелы и дефис.\n\nВведите, пожалуйста, корректное ФИО\nПример: Иванов Иван Иванович'
    },
    BIRTH_DATE: {
        prompt: 'Напишите, пожалуйста, дату рождения\n\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.1990',
        error: 'Неверный формат даты рождения.\n\nВведите дату в правильном формате\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.1990'
    },
    PASSPORT: {
        prompt: 'Введите серию и номер паспорта\n\nФормат: СССС НННННН\nПример: 4444 555666',
        error: 'Неверный формат паспортных данных.\n\nВведите серию и номер паспорта в правильном формате\nФормат: СССС НННННН\nПример: 4444 555666'
    },
    ISSUED_BY: {
        prompt: 'Кем выдан паспорт?\n\nПример: ГУ МВД РОССИИ ПО МОСКОВСКОЙ ОБЛАСТИ',
        error: 'Слишком короткое или длинное название органа.\n\nВведите корректное название органа, выдавшего паспорт\nПример: ГУ МВД РОССИИ ПО МОСКОВСКОЙ ОБЛАСТИ'
    },
    ISSUE_DATE: {
        prompt: 'Дата выдачи паспорта\n\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2020',
        error: 'Неверный формат даты выдачи.\n\nВведите дату в правильном формате\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2020'
    },
    DIVISION_CODE: {
        prompt: 'Код подразделения\n\nФормат: XXX-XXX\nПример: 770-001',
        error: 'Неверный формат кода подразделения.\n\nВведите код в правильном формате\nФормат: XXX-XXX\nПример: 770-001'
    },
    ADDRESS: {
        prompt: 'Адрес регистрации\n\nПример: г. Москва, ул. Ленина, д. 1, кв. 1',
        error: 'Слишком короткий или длинный адрес.\n\nВведите корректный адрес регистрации\nПример: г. Москва, ул. Ленина, д. 1, кв. 1'
    },
    INN: {
        prompt: 'ИНН\n\nПример: 123456789012 (12 цифр)',
        error: 'Неверный формат ИНН.\n\nВведите ИНН в правильном формате\nПример: 123456789012 (12 цифр)'
    },
    ACCOUNT_NUMBER: {
        prompt: 'Номер счета\n\nПример: 40817810099910004312 (20 цифр)',
        error: 'Неверный формат номера счета.\n\nВведите правильный номер счета\nПример: 40817810099910004312 (20 цифр)'
    },
    BANK_NAME: {
        prompt: 'Банк получателя\n\nПример: ПАО СБЕРБАНК',
        error: 'Некорректное название банка.\n\nВведите правильное название банка\nПример: ПАО СБЕРБАНК'
    },
    BIK: {
        prompt: 'БИК\n\nПример: 044525225 (9 цифр)',
        error: 'Неверный формат БИК.\n\nВведите БИК в правильном формате\nПример: 044525225 (9 цифр)'
    },
    CORR_ACCOUNT: {
        prompt: 'Корреспондентский счет\n\nПример: 30101810400000000225 (20 цифр)',
        error: 'Неверный формат корр. счета.\n\nВведите правильный Корреспондентский счет\nПример: 30101810400000000225 (20 цифр)'
    },
    BANK_INN: {
        prompt: 'ИНН банка\n\nПример: 7707083893 (10 цифр)',
        error: 'Неверный формат ИНН банка.\n\nВведите правильный ИНН банка\nПример: 7707083893 (10 цифр)'
    },
    BANK_KPP: {
        prompt: 'КПП банка\n\nПример: 773601001 (9 цифр)',
        error: 'Неверный формат КПП банка.\n\nВведите правильный КПП банка\nПример: 773601001 (9 цифр)'
    },
    PHONE: {
        prompt: 'Ваш номер телефона\n\nФормат: +7XXXXXXXXXX\nПример: +79001234567',
        error: 'Неверный формат номера телефона.\n\nВведите номер в правильном формате\nФормат: +7XXXXXXXXXX\nПример: +79001234567'
    },
    EMAIL: {
        prompt: 'Ваша электронная почта\n\nПример: example@mail.ru',
        error: 'Неверный формат email.\n\nВведите корректный email адрес\nПример: example@mail.ru'
    },
    MED_BOOK_EXPIRY: {
        prompt: 'Дата окончания действия медицинской книжки\n\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2025',
        error: 'Неверный формат даты.\n\nВведите дату окончания медицинской книжки\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2025'
    },
    MASTER_PRICE: {
        prompt: '📝 Укажите процент ставки, согласованный с управляющим\n\n⚠️ Максимальная ставка 50%\n\nВведите число от 1 до 50',
        error: '❌ Некорректный процент ставки\n\nПожалуйста, введите число от 1 до 50'
    }
};

// Validation helper functions
const validateField = (value: string, type: keyof typeof ValidationFormats): boolean => {
    const pattern = ValidationFormats[type];
    return pattern.test(value);
};

const validateIssuedBy = (value: string): boolean => {
    return value.length >= 5 && value.length <= 150;
};

const validateAddress = (value: string): boolean => {
    return value.length >= 10 && value.length <= 200;
};

const validateBankName = (value: string): boolean => {
    return value.length >= 3 && value.length <= 100;
};

// Helper function to create back button
const getBackButton = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('« Назад', 'back')]
    ]);
};

// Initial welcome message
const showWelcome = async (ctx: MyContext) => {
    const registrationForm: RegistrationSession = {
        fullName: '',
        birthDate: '',
        passport: '',
        issuedBy: '',
        issueDate: '',
        divisionCode: '',
        registrationAddress: '',
        inn: '',
        accountNumber: '',
        bankName: '',
        bik: '',
        corrAccount: '',
        bankInn: '',
        bankKpp: '',
        phone: '',
        email: '',
        hasMedBook: false,
        medBookExpiry: '',
        hasEducationCert: false,
        educationCertPhoto: '',
        isSelfEmployed: false,
        masterPrice: 0  // Ставим начальное значение вместо undefined
    };
    ctx.scene.session.registrationForm = registrationForm;

    const messageText = 'Давайте вместе устроимся на работу!';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Давайте', 'start_registration')]
    ]);

    if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(messageText, keyboard);
    } else {
        await ctx.reply(messageText, keyboard);
    }
    return ctx.wizard.next();
};

// Check self-employment status
// Type guard для проверки типа callback query
function isDataCallbackQuery(query: CallbackQuery): query is CallbackQuery.DataQuery {
    return 'data' in query;
}

const checkSelfEmployment = async (ctx: MyContext) => {
    // Проверяем наличие callback query и его тип
    if (ctx.callbackQuery && isDataCallbackQuery(ctx.callbackQuery)) {
        // Теперь TypeScript знает, что data существует
        if (ctx.callbackQuery.data === 'start_registration') {
            const messageText = 'Вы являетесь самозанятым?';
            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('Да', 'self_employed_yes'),
                    Markup.button.callback('Нет', 'self_employed_no')
                ]
            ]);
            await ctx.editMessageText(messageText, keyboard);
            // Отвечаем на callback query чтобы убрать "часики"
            await ctx.answerCbQuery();
        }
    }
    return ctx.wizard.next();
};

// Handle self-employment response
const handleSelfEmployment = new Composer<MyContext>();
handleSelfEmployment.action('self_employed_no', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = false;
    const messageText = 'Оформитесь как СМЗ и продолжите трудоустройство';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('Оформиться', 'https://npd.nalog.ru/')],
        [Markup.button.callback('Продолжить', 'continue_registration')]
    ]);
    await ctx.editMessageText(messageText, keyboard);
});

handleSelfEmployment.action('self_employed_yes', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = true;
    return requestFullName(ctx);
});

handleSelfEmployment.action('continue_registration', async (ctx) => {
    return requestFullName(ctx);
});

// Request full name
const requestFullName = async (ctx: MyContext) => {
    await ctx.reply(ValidationMessages.FULL_NAME.prompt);
    return ctx.wizard.next();
};

// Handle full name input
const handleFullName = new Composer<MyContext>();
handleFullName.on('text', async (ctx) => {
    const fullName = ctx.message.text;
    
    if (!validateField(fullName, 'FULL_NAME')) {
        await ctx.reply(ValidationMessages.FULL_NAME.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.fullName = fullName;
    await ctx.reply(ValidationMessages.BIRTH_DATE.prompt);
    return ctx.wizard.next();
});

// Handle birth date
// Обновляем обработчик даты рождения
const handleBirthDate = new Composer<MyContext>();
handleBirthDate.on('text', async (ctx) => {
    const birthDate = ctx.message.text.trim();
    
    if (!validateField(birthDate, 'BIRTH_DATE')) {
        await ctx.reply(ValidationMessages.BIRTH_DATE.error);
        return;
    }
    
    // Добавляем проверку на разумный возраст
    const [day, month, year] = birthDate.split('.').map(Number);
    const birthTimestamp = new Date(year, month - 1, day).getTime();
    const now = new Date().getTime();
    const age = (now - birthTimestamp) / (365.25 * 24 * 60 * 60 * 1000);
    
    if (age < 18 || age > 100) {
        await ctx.reply('Пожалуйста, проверьте правильность введенной даты. Возраст должен быть от 18 до 100 лет.');
        return;
    }
    
    ctx.scene.session.registrationForm.birthDate = birthDate;
    await ctx.reply(ValidationMessages.PASSPORT.prompt);
    return ctx.wizard.next();
});

// Handle passport
const handlePassport = new Composer<MyContext>();
handlePassport.on('text', async (ctx) => {
    const passport = ctx.message.text;
    
    if (!validateField(passport, 'PASSPORT')) {
        await ctx.reply(ValidationMessages.PASSPORT.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.passport = passport;
    await ctx.reply(ValidationMessages.ISSUED_BY.prompt);
    return ctx.wizard.next();
});

// Handle issued by
const handleIssuedBy = new Composer<MyContext>();
handleIssuedBy.on('text', async (ctx) => {
    const issuedBy = ctx.message.text;
    
    if (!validateIssuedBy(issuedBy)) {
        await ctx.reply(ValidationMessages.ISSUED_BY.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.issuedBy = issuedBy;
    await ctx.reply(ValidationMessages.ISSUE_DATE.prompt);
    return ctx.wizard.next();
});

// Handle issue date
const handleIssueDate = new Composer<MyContext>();
handleIssueDate.on('text', async (ctx) => {
    const issueDate = ctx.message.text;
    
    if (!validateField(issueDate, 'ISSUE_DATE')) {
        await ctx.reply(ValidationMessages.ISSUE_DATE.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.issueDate = issueDate;
    await ctx.reply(ValidationMessages.DIVISION_CODE.prompt);
    return ctx.wizard.next();
});

// Handle division code
const handleDivisionCode = new Composer<MyContext>();
handleDivisionCode.on('text', async (ctx) => {
    const divisionCode = ctx.message.text;
    
    if (!validateField(divisionCode, 'DIVISION_CODE')) {
        await ctx.reply(ValidationMessages.DIVISION_CODE.error);
       
        return;
    }
    
    ctx.scene.session.registrationForm.divisionCode = divisionCode;
    await ctx.reply(ValidationMessages.ADDRESS.prompt);
    return ctx.wizard.next();
});

// Handle address
const handleAddress = new Composer<MyContext>();
handleAddress.on('text', async (ctx) => {
    const address = ctx.message.text;
    
    if (!validateAddress(address)) {
        await ctx.reply(ValidationMessages.ADDRESS.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.registrationAddress = address;
    await ctx.reply(ValidationMessages.INN.prompt);
    return ctx.wizard.next();
});

// Handle INN
const handleInn = new Composer<MyContext>();
handleInn.on('text', async (ctx) => {
    const inn = ctx.message.text;
    
    if (!validateField(inn, 'INN')) {
        await ctx.reply(ValidationMessages.INN.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.inn = inn;
    await ctx.reply(ValidationMessages.ACCOUNT_NUMBER.prompt);
    return ctx.wizard.next();
});

// Handle account number
const handleAccountNumber = new Composer<MyContext>();
handleAccountNumber.on('text', async (ctx) => {
    const accountNumber = ctx.message.text;
    
    if (!validateField(accountNumber, 'ACCOUNT_NUMBER')) {
        await ctx.reply(ValidationMessages.ACCOUNT_NUMBER.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.accountNumber = accountNumber;
    await ctx.reply(ValidationMessages.BANK_NAME.prompt);
    return ctx.wizard.next();
});

// Handle bank name
const handleBankName = new Composer<MyContext>();
handleBankName.on('text', async (ctx) => {
    const bankName = ctx.message.text;
    
    if (!validateBankName(bankName)) {
        await ctx.reply(ValidationMessages.BANK_NAME.error);
       
        return;
    }
    
    ctx.scene.session.registrationForm.bankName = bankName;
    await ctx.reply(ValidationMessages.BIK.prompt);
    return ctx.wizard.next();
});

// Handle BIK
const handleBik = new Composer<MyContext>();
handleBik.on('text', async (ctx) => {
    const bik = ctx.message.text;
    
    if (!validateField(bik, 'BIK')) {
        await ctx.reply(ValidationMessages.BIK.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.bik = bik;
    await ctx.reply(ValidationMessages.CORR_ACCOUNT.prompt);
    return ctx.wizard.next();
});

// Handle correspondent account
const handleCorrAccount = new Composer<MyContext>();
handleCorrAccount.on('text', async (ctx) => {
    const corrAccount = ctx.message.text;
    
    if (!validateField(corrAccount, 'CORR_ACCOUNT')) {
        await ctx.reply(ValidationMessages.CORR_ACCOUNT.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.corrAccount = corrAccount;
    await ctx.reply(ValidationMessages.BANK_INN.prompt);
    return ctx.wizard.next();
});

// Handle bank INN
const handleBankInn = new Composer<MyContext>();
handleBankInn.on('text', async (ctx) => {
    const bankInn = ctx.message.text;
    
    if (!validateField(bankInn, 'BANK_INN')) {
        await ctx.reply(ValidationMessages.BANK_INN.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.bankInn = bankInn;
    await ctx.reply(ValidationMessages.BANK_KPP.prompt);
    return ctx.wizard.next();
});

// Handle bank KPP
const handleBankKpp = new Composer<MyContext>();
handleBankKpp.on('text', async (ctx) => {
    const bankKpp = ctx.message.text;
    
    if (!validateField(bankKpp, 'BANK_KPP')) {
        await ctx.reply(ValidationMessages.BANK_KPP.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.bankKpp = bankKpp;
    await ctx.reply(ValidationMessages.PHONE.prompt);
    return ctx.wizard.next();
});

// Handle phone
const handlePhone = new Composer<MyContext>();
handlePhone.on('text', async (ctx) => {
    const phone = ctx.message.text;
    
    if (!validateField(phone, 'PHONE')) {
        await ctx.reply(ValidationMessages.PHONE.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.phone = phone;
    await ctx.reply(ValidationMessages.EMAIL.prompt);
    return ctx.wizard.next();
});

// Handle email
const handleEmail = new Composer<MyContext>();
handleEmail.on('text', async (ctx) => {
    const email = ctx.message.text;
    
    if (!validateField(email, 'EMAIL')) {
        await ctx.reply(ValidationMessages.EMAIL.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.email = email;
    await ctx.reply('У вас есть мед книжка?', Markup.inlineKeyboard([
        [
            Markup.button.callback('Да', 'med_book_yes'),
            Markup.button.callback('Нет', 'med_book_no')
        ]
    ]));
    return ctx.wizard.next();
});

// Handle med book response
const handleMedBook = new Composer<MyContext>();
handleMedBook.action('med_book_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = true;
    await ctx.reply(ValidationMessages.MED_BOOK_EXPIRY.prompt);
    return ctx.wizard.next();
});
handleMedBook.action('med_book_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = false;
    return handleEducationCertQuestion(ctx);
});

// Handle med book expiry
const handleMedBookExpiry = new Composer<MyContext>();
handleMedBookExpiry.on('text', async (ctx) => {
    const medBookExpiry = ctx.message.text;
    
    if (!validateField(medBookExpiry, 'MED_BOOK_EXPIRY')) {
        await ctx.reply(ValidationMessages.MED_BOOK_EXPIRY.error);
        
        return;
    }
    
    ctx.scene.session.registrationForm.medBookExpiry = medBookExpiry;
    return handleEducationCertQuestion(ctx);
});

// Handle education certificate question
const handleEducationCertQuestion = async (ctx: MyContext) => {
    await ctx.reply('У вас есть сертификат об образовании?', Markup.inlineKeyboard([
        [
            Markup.button.callback('Да', 'education_cert_yes'),
            Markup.button.callback('Нет', 'education_cert_no')
        ]
    ]));
    return ctx.wizard.next();
};

// Handle education certificate response
const handleEducationCert = new Composer<MyContext>();
handleEducationCert.action('education_cert_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = true;
    await ctx.reply('Отправьте, пожалуйста, фото сертификата');
    return ctx.wizard.next();
});

handleEducationCert.action('education_cert_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = false;
    await ctx.reply(ValidationMessages.MASTER_PRICE.prompt);
    // Пропускаем шаг handleEducationCertPhoto
    ctx.wizard.selectStep(ctx.wizard.cursor + 2);
    return;
});

// Handle education certificate photo
const handleEducationCertPhoto = new Composer<MyContext>();
handleEducationCertPhoto.on('photo', async (ctx) => {
    // Сначала показываем, что фото получено
    await ctx.reply('✅ Фото сертификата получено');
    
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    ctx.scene.session.registrationForm.educationCertPhoto = photo.file_id;

    // Делаем небольшую паузу перед следующим шагом
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Запрашиваем ставку
    await ctx.reply(ValidationMessages.MASTER_PRICE.prompt);
    return ctx.wizard.next();
});

// Добавляем обработку пропуска фото для тех, у кого нет сертификата
handleEducationCertPhoto.action('skip_photo', async (ctx) => {
    await ctx.reply(ValidationMessages.MASTER_PRICE.prompt);
    return ctx.wizard.next();
});


const handleMasterPrice = new Composer<MyContext>();

// Регистрируем обработчик текстовых сообщений
handleMasterPrice.on('text', async (ctx) => {
    const price = parseInt(ctx.message.text);
    console.log('Received master price:', price);
    
    // Проверяем, является ли введенное значение числом
    if (isNaN(price)) {
        await ctx.reply(ValidationMessages.MASTER_PRICE.error);
        return;
    }

    // Проверяем диапазон
    if (price <= 0 || price > 50) {
        await ctx.reply(ValidationMessages.MASTER_PRICE.error);
        return;
    }

    try {
        ctx.scene.session.registrationForm.masterPrice = price;
        console.log('Saved master price:', ctx.scene.session.registrationForm);

        // Показываем подтверждение
        await ctx.reply(
            `✅ Установлена ставка: ${price}%\n\nПереходим к подготовке документов...`
        );

        // Переходим к финальному шагу
        await handleFinalStep(ctx);
    } catch (error) {
        console.error('Error in handleMasterPrice:', error);
        await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте ввести ставку снова.');
    }
});

// Обрабатываем другие типы сообщений
handleMasterPrice.on('message', async (ctx) => {
    console.log('Received non-text message in master price handler');
    await ctx.reply(ValidationMessages.MASTER_PRICE.error);
});



// Создаем улучшенное хранилище для групп документов
const documentGroups = new Map<string, {
    files: Array<{file_id: string, file_name: string}>,
    timer?: NodeJS.Timeout,
    processed: boolean
}>();

// Функция логирования
function logDebug(message: string, data?: any) {
    console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

const handleSignedDocuments = new Composer<MyContext>();

handleSignedDocuments.on('document', async (ctx) => {
    console.log('DEBUG: Document handler triggered', {
        sessionData: ctx.scene?.session,
        registrationId: ctx.scene?.session?.registrationId
    });
    const message = ctx.message;
    const mediaGroupId = message.media_group_id;
    const document = message.document;

    logDebug('Получен новый документ:', {
        mediaGroupId,
        fileName: document.file_name,
        fileId: document.file_id,
        fileSize: document.file_size,
        registrationId: ctx.scene.session.registrationId
    });

    // Проверяем формат файла
    const fileName = document.file_name?.toLowerCase();
    if (!fileName?.endsWith('.pdf') && !fileName?.endsWith('.docx')) {
        logDebug('Некорректный формат файла:', { fileName });
        await ctx.reply('Пожалуйста, отправляйте документы только в форматах PDF или DOCX');
        return;
    }

    if (!mediaGroupId) {
        logDebug('Документ отправлен не в группе');
        await ctx.reply('Пожалуйста, отправьте все документы одним сообщением, выбрав их все сразу.');
        return;
    }

    // Получаем или создаем группу документов
    let group = documentGroups.get(mediaGroupId);
    if (!group) {
        logDebug('Создаем новую группу документов:', { mediaGroupId });
        group = {
            files: [],
            processed: false
        };
        documentGroups.set(mediaGroupId, group);
    }

    // Добавляем документ в группу
    group.files.push({
        file_id: document.file_id,
        file_name: document.file_name
    });
    logDebug('Добавлен документ в группу:', {
        mediaGroupId,
        totalFiles: group.files.length,
        currentFile: document.file_name
    });

    // Очищаем предыдущий таймер если он есть
    if (group.timer) {
        clearTimeout(group.timer);
    }

    // Устанавливаем новый таймер для обработки группы
    group.timer = setTimeout(async () => {
        logDebug('Запуск обработки группы документов:', {
            mediaGroupId,
            filesCount: group.files.length
        });

        if (group.processed) {
            logDebug('Группа уже была обработана:', { mediaGroupId });
            return;
        }

        try {
            group.processed = true;

            // Проверяем наличие registrationId
            const registrationId = ctx.scene.session.registrationId;
            if (!registrationId) {
                throw new Error('Отсутствует registrationId в сессии');
            }

            logDebug('Начинаем загрузку файлов:', {
                mediaGroupId,
                registrationId,
                filesCount: group.files.length
            });

            // Загружаем и подготавливаем все документы
            const uploadPromises = group.files.map(async (doc) => {
                logDebug('Получаем информацию о файле от Telegram:', {
                    fileId: doc.file_id,
                    fileName: doc.file_name
                });

                const file = await ctx.telegram.getFile(doc.file_id);
                const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN_MASTER}/${file.file_path}`;

                logDebug('Получен URL файла:', {
                    fileName: doc.file_name,
                    fileUrl: fileUrl
                });

                return {
                    url: fileUrl,
                    name: doc.file_name
                };
            });

            const uploadedFiles = await Promise.all(uploadPromises);
            logDebug('Все файлы подготовлены к загрузке:', {
                filesCount: uploadedFiles.length,
                files: uploadedFiles.map(f => f.name)
            });

            // Отправляем документы в API
            logDebug('Отправляем документы в API:', {
                registrationId,
                filesCount: uploadedFiles.length
            });

            const response = await laravelService.uploadSignedDocuments(
                registrationId,
                uploadedFiles
            );

            logDebug('Получен ответ от API:', { response });

            await ctx.reply('Спасибо! Документы успешно получены. В ближайшее время мы проверим их и сообщим вам о результатах.');
            
            // Очищаем группу
            documentGroups.delete(mediaGroupId);
            logDebug('Группа документов успешно обработана и удалена:', { mediaGroupId });
            
            return ctx.scene.leave();
        } catch (error) {
            logDebug('Ошибка при обработке группы документов:', {
                mediaGroupId,
                error: error.message,
                stack: error.stack
            });

            await ctx.reply('Произошла ошибка при обработке документов. Пожалуйста, попробуйте еще раз или обратитесь в поддержку.');
            
            // Очищаем группу в случае ошибки
            documentGroups.delete(mediaGroupId);
        }
    }, 2000); // Увеличиваем время ожидания до 2 секунд
});

// Handle final step
// В handleFinalStep добавим:
const handleFinalStep = async (ctx: MyContext) => {
    await ctx.reply('Отлично, мы подготовим документы и отправим вам их сюда.');
    
    try {
        console.log('Attempting to submit registration with data:', {
            ...ctx.scene.session.registrationForm,
            masterPrice: ctx.scene.session.registrationForm.masterPrice
        });
        
        const registrationResponse = await laravelService.submitRegistration(ctx.scene.session.registrationForm);
        console.log('Registration submitted successfully:', registrationResponse);
        
        const registrationId = registrationResponse.data.id;
        // Явно сохраняем registrationId в сессии
        ctx.scene.session.registrationId = registrationId;
        console.log('DEBUG: Registration ID saved to session:', registrationId);
        ctx.scene.session.documentUpload = {
            documents: [],
            registrationId: registrationId
        };
        
        if (!registrationId) {
            throw new Error('Registration ID not found in response');
        }

        const zipBuffer = await laravelService.generateContract({
            id: registrationId
        });

        await ctx.replyWithDocument({
            source: zipBuffer,
            filename: `Документы_${registrationResponse.data.contract_number}.zip`
        });

        const instructions = `
Пожалуйста, внимательно прочитайте инструкцию!!!

1. Распакуйте полученный архив
2. Подпишите все документы
3. Отправьте ВСЕ подписанные документы ОДНИМ СООБЩЕНИЕМ в этот чат

❗️ Важные требования:
- Отправьте все документы одним сообщением (можно выбрать несколько файлов)
- Принимаются файлы в форматах PDF или DOCX
- Убедитесь, что все документы хорошо читаемы
- Проверьте наличие всех подписей перед отправкой

Чтобы отправить несколько файлов одним сообщением:
📱 В мобильном приложении:
1. Нажмите на скрепку
2. Выберите "Файл"
3. Нажмите на три точки в правом верхнем углу
4. Выберите все нужные документы
5. Нажмите "Отправить"

💻 В десктопной версии:
1. Нажмите на скрепку
2. Зажмите Ctrl и выберите все нужные файлы
3. Нажмите "Открыть"`;

        await ctx.reply(instructions, { parse_mode: 'HTML' });
        return ctx.wizard.next();

    } catch (error) {
        console.error('Error in handleFinalStep:', error);
        
        let errorMessage = 'Произошла ошибка при обработке данных. ';
        
        if (error.response?.status === 422) {
            const validationErrors = error.response.data.errors;
            if (validationErrors.email) {
                errorMessage += 'Этот email уже зарегистрирован в системе. Пожалуйста, используйте другой email.';
            } else {
                errorMessage += 'Пожалуйста, проверьте правильность введенных данных.';
            }
        } else {
            errorMessage += 'Пожалуйста, попробуйте позже.';
        }
        
        await ctx.reply(errorMessage);
    }
};


export const registrationWizard = new Scenes.WizardScene<MyContext>(
    'registration_wizard',
    showWelcome,
    checkSelfEmployment,
    handleSelfEmployment,
    handleFullName,
    handleBirthDate,
    handlePassport,
    handleIssuedBy,
    handleIssueDate,
    handleDivisionCode,
    handleAddress,
    handleInn,
    handleAccountNumber,
    handleBankName,
    handleBik,
    handleCorrAccount,
    handleBankInn,
    handleBankKpp,
    handlePhone,
    handleEmail,
    handleMedBook,
    handleMedBookExpiry,
    handleEducationCert,
    handleEducationCertPhoto,
    handleMasterPrice, // Новый шаг
    handleFinalStep,
    // Исправляем этап ожидания документов
    async (ctx) => {
        // Явно возвращаем Promise<void>
        await ctx.reply('Ожидаю подписанные документы...');
        return;
    }
);

registrationWizard.action('cancel', async (ctx) => {
    await ctx.reply(
        '❌ Регистрация отменена\n\n' +
        'Вы можете начать заново, когда будете готовы',
        Markup.inlineKeyboard([[
            Markup.button.callback('Начать заново', 'start_registration')
        ]])
    );
    return ctx.scene.leave();
});

// Добавляем обработчик документов через middleware
registrationWizard.command('restart', async (ctx) => {
    await ctx.scene.leave();
    await ctx.scene.enter('registration_wizard');
});

// Регистрируем обработчик документов на уровне сцены
registrationWizard.on('document', handleSignedDocuments);

// Добавляем отладочный middleware
registrationWizard.use(async (ctx, next) => {
    console.log('Scene middleware triggered:', {
        step: ctx.wizard?.cursor,
        sessionData: ctx.scene?.session,
        updateType: ctx.updateType
    });
    return next();
});