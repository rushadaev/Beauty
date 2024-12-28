export interface NotificationSettings {
    sum?: string;
    product_name?: string;
    product_id?: number;

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
    telegram_id: number;
    name: string;
    sum?: number;
    notification_datetime: string;
    type: 'single' | 'recurring';
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
    frequency_value?: number;
    is_active: boolean;
    last_notification_sent_at?: string | null;
    created_at: string;
    updated_at: string;
    next_notification?: string | null;
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
