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

export interface Notification {
    id: number;
    telegram_id: number;
    name: string;
    sum: string | null;
    notification_datetime: string;
    type: 'single' | 'recurring';
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
    frequency_value?: number;
    is_active: boolean;
    last_notification_sent_at?: string;
    created_at: string;
    updated_at: string;
}

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    type: 'schedule_update' | 'photo_update' | 'description_update' | 'other';
    master_phone: string | null;
    master_name: string | null;
    completed_at: string | null;
    deadline: string | null;
    created_at: string;
    updated_at: string;
}

// Интерфейс для ответа с одной задачей
export interface TaskResponse {
    success: boolean;
    data: Task;
    message?: string;
}

declare module 'telegraf/typings/scenes/base' {
    interface SceneSessionData {
        tasksState: {
            page: number;
            filter: 'active' | 'completed' | 'all';
        };
    }
}

// Интерфейс для пагинированного ответа со списком задач
export interface TaskPaginatedResponse {
    success: boolean; // Добавляем поле success
    data: {
        current_page: number;
        data: Task[];
        total: number;
        per_page: number;
    };
    meta: {
        total: number;
    };
}

// Состояние для сцены задач
export interface TasksState {
    page: number;
    filter: 'active' | 'completed' | 'all';
}

export interface SceneState {
    tasksState: TasksState;
}

export interface TasksSceneState {
    tasksState: {
        page: number;
        filter: 'active' | 'completed' | 'all';
    };
}

export type TasksSceneContext = MyContext & {
    scene: Scenes.SceneContextScene<MyContext> & {
        state: SceneState;
    };
};






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

export interface UpdateNotificationResponse {
    success: boolean;
    data?: any;
    message?: string;
}

export interface NotificationResponse {
    success: boolean;
    message?: string;
    data?: any;
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

export interface PaginatedNotifications {
    data: AdminNotification[];
    meta: {
        current_page: number;
        total: number;
        per_page: number;
    };
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
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom' | ''; // добавляем пустую строку как возможное значение
    frequency_value?: string;
    created_at?: string;
}

export interface CreateNotificationResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface RecordData {
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
}

/**
 * Base Wizard Session Interface
 */
export interface MyWizardSession extends Scenes.WizardSessionData {
    currentPage: number;
    recordsByDate: Record<string, RecordData[]>;
    tasksState: TasksState;
    __scenes: any;
    warehouseForm: any;
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
    selectedBranchId?: string;
    selectedProductId?: string;
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

export interface PriceChangeDisplay {
    branch_name: string;
    service_name: string;
    old_price: number;
    new_price: number;
    branch_id: number;  // Добавляем ID для API
    service_id: number; // Добавляем ID для API
}

export type MySessionData = MyWizardSession;

/**
 * Global Session Interface accommodating all Scene Sessions
 */
export interface MySession extends Scenes.WizardSession<MySessionData> {
    pendingChanges?: PriceChangeDisplay[]; 
    awaitingServiceDuration: any;
    selectedCategoryId: any;
    selectedServiceId: string;
    tasksState: TasksState;
    selectedNotificationId: number; // Меняем тип с string на number
    editField?: 'name' | 'sum' | 'date';
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
    selectedBranchId?: string;
    selectedProductId?: string;
    warehouseForm?: WarehouseForm;
}

export interface AdminNotification {
    id: number;
    name: string;
    sum: string | null;
    notification_datetime: string;
    type: 'single' | 'recurring';
    is_active: boolean;
}

export interface WarehouseForm {
    productId: string;
    minAmount: number | null;
    type: 'warehouse';
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
    selectedBranch?: {
        id: string;
        name: string;
        address: string;
    };
    branch_yclients_id?: number;
}


/**
 * Custom Context Interface
 */
export interface MyContext<U extends Update = Update> extends Context<U> {
    ctx: {};
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

export interface PriceChange {
    branch_name: string;
    service_name: string;
    old_price: number;
    new_price: number;
}

type SearchRequestsContext = Scenes.SceneContext<SearchRequestsSession>;