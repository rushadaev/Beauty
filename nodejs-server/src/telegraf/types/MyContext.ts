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



export interface StaffMember {
    id: number;
    name: string;
    fired: boolean;
    hidden: boolean;
    schedule?: Array<{
        date: string;
        slots: Array<{
            from: string;
            to: string;
        }>;
    }>;
}

// Базовый интерфейс для слота расписания
export interface ScheduleSlot {
    from: string;
    to: string;
}

// Интерфейс для добавления расписания
export interface ScheduleToSet {
    staff_id: number;
    date: string;
    slots: ScheduleSlot[];
}

// Обновляем интерфейс для установки расписания
export interface ScheduleDate {
    date: string;
    slots: ScheduleSlot[];
}

// Интерфейс для удаления расписания
export interface ScheduleToDelete {
    staff_id: number;
    date: string;
}

export interface ScheduleUpdateData {
    schedules_to_set: ScheduleToSet[];
    schedules_to_delete: ScheduleToDelete[];
}

// Обновляем ScheduleState
export interface ScheduleState {
    step: string;
    periodType?: 'single' | 'range';
    startDate?: string;
    endDate?: string;
    companyId?: number;
    currentMasterId?: number;
    masters?: StaffMemberWithSchedule[];
    updateData?: ScheduleUpdateData;
}


// Интерфейс для занятого интервала
export interface BusyInterval {
    from: string;
    to: string;
    entity_type: string;
    entity_id: number;
}

// Интерфейс для данных мастера из расписания
export interface StaffSchedule {
    staff_id: number; 
    company_id: number;                     // ID мастера
    slots?: ScheduleSlot[];               // Доступные слоты
    off_day_type?: number;                // Тип выходного дня
    busy_intervals?: BusyInterval[];      // Занятые интервалы
}

// Интерфейс для данных мастера с информацией о нём
export interface StaffMemberInfo {
    staff_id: number;
    id: number;  // Добавляем это поле
    name: string;
    specialization?: string;
}

// Комбинированный интерфейс для полных данных мастера
export interface StaffMemberWithSchedule extends StaffSchedule, StaffMemberInfo {}

// Интерфейс для ответа API
export interface ScheduleResponse {
    success: boolean;
    data?: StaffMemberWithSchedule[];
    meta?: {
        message?: string;
        count?: number;
    };
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
    selectedRecordId: any;
    password: string;
    phone: string;
    user_id?: number;
    task_id?: number;
    notificationForm: NotificationForm;
    autobookingForm: AutoBookingForm;
    user: {
        token?: string;
        data?: any;
    };
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
    scheduleState: ScheduleState; // Добавляем поле для состояния расписания
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
    user: {
        token?: string;
        data?: any;
    };
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
    scheduleState: ScheduleState;
    selectedRecordId?: string;
    clientRecords?: {
        data: Array<{
            id: string;
            date: string;
            client?: {
                name?: string;
                phone?: string;
            };
            services?: Array<{
                id: number;
                title: string;
                cost: number;
            }>;
        }>;
    };
    cancelBookingState?: CancelBookingState;
    changePhoneState?: ChangePhoneState;
    deleteServiceState?: DeleteServiceState;
    addServiceState?: AddServiceState;
}

export interface ChangePhoneState {
    recordId: string;
    phone?: string;
    password?: string;
    newPhone?: string;
}

export interface DeleteServiceState {
    recordId: string;
    phone?: string;
    password?: string;
}

export interface AddServiceState {
    recordId: string;
    phone?: string;
    password?: string;
}

export interface registrationForm {
    masterPrice: number;
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
    match: RegExpExecArray | null;  // Добавляем это свойство
}

export interface CancelBookingState {
    recordId: string;
    phone?: string;
    password?: string;
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