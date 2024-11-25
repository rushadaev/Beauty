import { Scenes, Markup, Composer } from 'telegraf';
import { MyContext } from '../../../types/MyContext';
import laravelService from "../../../../services/laravelService";

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
}

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
        isSelfEmployed: false
    };
    ctx.scene.session.registrationForm = registrationForm;

    const messageText = 'Давайте вместе устроимся на работу?!';
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
const checkSelfEmployment = async (ctx: MyContext) => {
    if (ctx.callbackQuery?.data === 'start_registration') {
        const messageText = 'Вы являетесь самозанятым?';
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('Да', 'self_employed_yes'),
                Markup.button.callback('Нет', 'self_employed_no')
            ]
        ]);
        await ctx.editMessageText(messageText, keyboard);
    }
    return ctx.wizard.next();
};

// Handle self-employment response
const handleSelfEmployment = new Composer<MyContext>();
handleSelfEmployment.action('self_employed_no', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = true;
    const messageText = 'Оформитесь как СМЗ и продолжите трудоустройство';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('Оформиться', 'https://npd.nalog.ru/')],
        [Markup.button.callback('Продолжить', 'continue_registration')]
    ]);
    await ctx.editMessageText(messageText, keyboard);
});

handleSelfEmployment.action('self_employed_yes', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = false;
    return requestFullName(ctx);
});

handleSelfEmployment.action('continue_registration', async (ctx) => {
    return requestFullName(ctx);
});

// Request full name
const requestFullName = async (ctx: MyContext) => {
    await ctx.reply('Отлично, теперь нам необходимо получить ваши данные для составления договора.\nНапишите, пожалуйста, свое ФИО');
    return ctx.wizard.next();
};

// Handle full name input and subsequent steps
const handleFullName = new Composer<MyContext>();
handleFullName.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.fullName = ctx.message.text;
    await ctx.reply('Напишите, пожалуйста, дату рождения');
    return ctx.wizard.next();
});

// Continue with other handlers for each step...
const handleBirthDate = new Composer<MyContext>();
handleBirthDate.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.birthDate = ctx.message.text;
    await ctx.reply('Паспорт: серия *номер *_');
    return ctx.wizard.next();
});

// Add handlers for all remaining steps...
const handlePassport = new Composer<MyContext>();
handlePassport.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.passport = ctx.message.text;
    await ctx.reply('Выдан:');
    return ctx.wizard.next();
});

const handleIssuedBy = new Composer<MyContext>();
handleIssuedBy.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.issuedBy = ctx.message.text;
    await ctx.reply('Дата выдачи:');
    return ctx.wizard.next();
});

const handleIssueDate = new Composer<MyContext>();
handleIssueDate.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.issueDate = ctx.message.text;
    await ctx.reply('Код разделение:');
    return ctx.wizard.next();
});

const handleDivisionCode = new Composer<MyContext>();
handleDivisionCode.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.divisionCode = ctx.message.text;
    await ctx.reply('Адрес регистрации:');
    return ctx.wizard.next();
});

const handleAddress = new Composer<MyContext>();
handleAddress.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.registrationAddress = ctx.message.text;
    await ctx.reply('ИНН:');
    return ctx.wizard.next();
});

const handleInn = new Composer<MyContext>();
handleInn.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.inn = ctx.message.text;
    await ctx.reply('Номер счета:');
    return ctx.wizard.next();
});

const handleAccountNumber = new Composer<MyContext>();
handleAccountNumber.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.accountNumber = ctx.message.text;
    await ctx.reply('Банк получателя:');
    return ctx.wizard.next();
});

const handleBankName = new Composer<MyContext>();
handleBankName.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bankName = ctx.message.text;
    await ctx.reply('БИК:');
    return ctx.wizard.next();
});

const handleBik = new Composer<MyContext>();
handleBik.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bik = ctx.message.text;
    await ctx.reply('Корр. счет:');
    return ctx.wizard.next();
});

const handleCorrAccount = new Composer<MyContext>();
handleCorrAccount.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.corrAccount = ctx.message.text;
    await ctx.reply('ИНН банка:');
    return ctx.wizard.next();
});

const handleBankInn = new Composer<MyContext>();
handleBankInn.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bankInn = ctx.message.text;
    await ctx.reply('КПП банка:');
    return ctx.wizard.next();
});

const handleBankKpp = new Composer<MyContext>();
handleBankKpp.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bankKpp = ctx.message.text;
    await ctx.reply('Ваш номер телефона:');
    return ctx.wizard.next();
});

const handlePhone = new Composer<MyContext>();
handlePhone.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.phone = ctx.message.text;
    await ctx.reply('Ваша почта:');
    return ctx.wizard.next();
});

const handleEmail = new Composer<MyContext>();
handleEmail.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.email = ctx.message.text;
    await ctx.reply('У вас есть мед книжка?', Markup.inlineKeyboard([
        [
            Markup.button.callback('Да', 'med_book_yes'),
            Markup.button.callback('Нет', 'med_book_no')
        ]
    ]));
    return ctx.wizard.next();
});

const handleMedBook = new Composer<MyContext>();
handleMedBook.action('med_book_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = true;
    await ctx.reply('Когда она истекает?');
    return ctx.wizard.next();
});
handleMedBook.action('med_book_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = false;
    return handleEducationCertQuestion(ctx);
});

const handleMedBookExpiry = new Composer<MyContext>();
handleMedBookExpiry.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.medBookExpiry = ctx.message.text;
    return handleEducationCertQuestion(ctx);
});

const handleEducationCertQuestion = async (ctx: MyContext) => {
    await ctx.reply('У вас есть сертификат об образовании?', Markup.inlineKeyboard([
        [
            Markup.button.callback('Да', 'education_cert_yes'),
            Markup.button.callback('Нет', 'education_cert_no')
        ]
    ]));
    return ctx.wizard.next();
};

const handleEducationCert = new Composer<MyContext>();
handleEducationCert.action('education_cert_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = true;
    await ctx.reply('Отправьте пожалуйста фото сертификата');
    return ctx.wizard.next();
});
handleEducationCert.action('education_cert_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = false;
    return handleFinalStep(ctx);
});

const handleEducationCertPhoto = new Composer<MyContext>();
handleEducationCertPhoto.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    ctx.scene.session.registrationForm.educationCertPhoto = photo.file_id;
    return handleFinalStep(ctx);
});



const handleFinalStep = async (ctx: MyContext) => {
    await ctx.reply('Отлично, мы подготовим договор и отправим вам его сюда.');

    console.log(ctx.scene.session.registrationForm);
    // Here you can add code to send the collected data to your backend
    // try {
    //     await laravelService.submitRegistration(ctx.scene.session);
    // } catch (error) {
    //     await ctx.reply('Произошла ошибка при отправке данных. Пожалуйста, попробуйте позже.');
    // }

    return ctx.scene.leave();
};

// Create the wizard scene with all steps
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
    handleEducationCertPhoto
);