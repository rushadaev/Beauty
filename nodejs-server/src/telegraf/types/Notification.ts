export interface NotificationSettings {
    type: string;
    chatId: string;
    warehouseId: number;
    boxType: string;
    boxTypeId: number;
    coefficient: number;
    date: string;
    checkUntilDate: string;
}

export interface Notification {
    id: number;
    user_id: number;
    settings: NotificationSettings;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface PaginatedNotifications {
    current_page: number;
    data: Notification[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}
