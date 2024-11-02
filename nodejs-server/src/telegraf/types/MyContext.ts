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
/**
 * Base Wizard Session Interface
 */
export interface MyWizardSession extends Scenes.WizardSessionData {
    autobookingForm: AutoBookingForm;
    cabinetForm: CabinetForm;
    myWizardSessionProp: number;
    cabinetName: string;
    apiToken: string;
    notificationSettings: NotificationSettings;
    test: string;
    drafts?: any[];

    selectedCabinetId: string;
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
    searchRequestsType: string;
    autobookingForm: AutoBookingForm;
    page: number;
    selectedTariff: string;
    count: any;
    userPreferences: UserPreferences;
    mySessionProp: number;

    searchRequestsPage: number;
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

type SearchRequestsContext = Scenes.SceneContext<SearchRequestsSession>;