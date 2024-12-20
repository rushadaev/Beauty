import { Context, Scenes, session } from "telegraf";
import { Update } from "@telegraf/types";

/**
 * Notification Settings Interface
 */
export interface NotificationSettings {
    email: boolean;
    sms: boolean;
    push: boolean;
}

/**
 * Search Requests Session Interface extending the Base Wizard Session
 */
export interface SearchRequestsSession extends Scenes.SceneSessionData {
    searchRequestsSessionProp: number;
    searchRequestsPage: number;
    notifications: any[];
    state: {
        user: any;
    };
}

export interface CabinetForm { phoneNumber: string; name: string };

export interface AutoBookingState {
    user: any;
}

export interface ReauthState {
    cabinet: any;
}

export interface NotificationForm {
    notification_id?: number;
    product_id?: number;
    product_name?: string;




    id?: string;
    name: string;
    sum?: string;
    dateTime: string;
    type?: string;
}
/**
 * Base Wizard Session Interface
 */
export interface MyWizardSession extends Scenes.WizardSessionData {
    password: string;
    phone: string;
    user_id?: number;
    task_id?: number;
    notificationForm: NotificationForm;
    autobookingForm: AutoBookingForm;

    registrationForm: registrationForm;
    cabinetForm: CabinetForm;
    myWizardSessionProp: number;
    cabinetName: string;
    apiToken: string;
    notificationSettings: NotificationSettings;
    test: string;
    drafts?: any[];
    messageToEdit?: number;
    selectedCabinetId: string;
    descriptionForm: DescriptionForm;
    authData?: {
        phone: string;
        password: string;
    };
    isEditing: boolean;
    documentUpload?: DocumentUploadSession;
    registrationId?: number;
}



/**
 * User Preferences Interface
 */
export interface UserPreferences {
    notifications: number;
}

/**
 * Auto Booking Form Interface
 */
export interface AutoBookingForm {


    warehouseId: string;
    coefficient: string;
    dates?: string[];
    checkUntilDate: string;
    boxTypeId: string;

    cabinetId?: string;
    draftId?: string;
    preorderId?: string;
    isBooking?: boolean;
    monopalletCount?: number;
}



export type MySessionData = MyWizardSession;

/**
 * Global Session Interface accommodating all Scene Sessions
 */
export interface MySession extends Scenes.WizardSession<MySessionData> {
    user: any;
    notifications: any[];
    notificationForm: NotificationForm;
    notificationId: string;
    searchRequestsType: string;
    autobookingForm: AutoBookingForm;
    page: number;
    selectedTariff: string;
    count: any;
    userPreferences: UserPreferences;
    mySessionProp: number;
    descriptionForm: DescriptionForm;
    searchRequestsPage: number;
    phone: string;
    password: string;
    apiToken?: string; // Добавить это поле
    auth?: {
      success: boolean;
      token?: string;
      user?: any;
    };
    messageToEdit?: number;
    isEditing: boolean;
    documentUpload?: DocumentUploadSession;
    registrationId?: number;
}



export interface registrationForm {
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


/**
 * Custom Context Interface
 */
export interface MyContext<U extends Update = Update> extends Context<U> {
    myContextProp: string;
    session: MySession;
    scene: Scenes.SceneContextScene<MyContext, MySessionData>;
    wizard: Scenes.WizardContextWizard<MyContext>;
    payload: string;
}

export interface DescriptionForm {
    tempDescription?: string;
    generatedDescription?: string;
    originalInput?: string;
    
}

// Добавляем интерфейс для загруженных документов
export interface UploadedDocument {
    file_id: string;
    file_name: string;
}

// Интерфейс для сессии загрузки документов
export interface DocumentUploadSession {
    documents: UploadedDocument[];
    registrationId: number;
}

type SearchRequestsContext = Scenes.SceneContext<SearchRequestsSession>;