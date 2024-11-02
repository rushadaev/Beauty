export interface User{
    id: number;
    name: string;
    email: string;
    telegram_id: string;
    email_verified_at: string;
    created_at: string;
    updated_at: string;
    subscription_until: string;
    is_paid: boolean;
    notified_12_hours: boolean;
    notified_3_hours: boolean;
    state_path: string;
    phone_number: string;
    has_active_subscription: boolean;
}




// Define the User and Cabinet interfaces based on your application's data structure
export interface CabinetSettings {
    is_active: boolean;
    is_default: boolean;
    phone_number: string;
}

export interface Cabinet {
    id: number;
    name: string;
    settings: CabinetSettings;
}


export interface CreateCabinetResponse {
    message: string;
    user: User;
}