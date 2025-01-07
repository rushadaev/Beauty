// src/services/UserService.ts

import axios from 'axios';
import CacheService from '../utils/redis/Cache/Cache';
import  {User, CreateCabinetResponse}  from '../telegraf/types/User';
import {PaginatedNotifications} from "../telegraf/types/Notification";
import { RegistrationSession } from '../telegraf/types/RegistrationSession';
import FormData from 'form-data';
import * as fs from 'node:fs';

interface NotificationResponse {
    success: boolean;
    message?: string;
    data?: any;
}

interface GetTasksParams {
    page?: number;
    per_page?: number;
    filter?: 'active' | 'completed' | 'all';
}

export interface Product {
    good_id: number;
    title: string;
    actual_amount: [
        {
            amount: number;
            storage_id: number;
        }
    ];
}

export interface ProductsPaginatedResponse {
    actual_amounts: any;
    currentPage: number;
    totalPages: number;
    products: Product[];
    allProducts: Product[];
}

export interface ProductPaginatedResponse {
    actual_amounts: any;
    product: Product;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: any;
    message?: string;
}

interface TaskPaginatedResponse {
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

// Добавляем интерфейсы
interface ScheduleSlot {
    from: string;
    to: string;
}

interface StaffSchedule {
    staff_id: number;
    date: string;
    slots: ScheduleSlot[];
    busy_intervals?: Array<{
        entity_type: string;
        entity_id: number;
        from: string;
        to: string;
    }>;
    off_day_type?: number;
}

interface ScheduleResponse {
    success: boolean;
    data: StaffSchedule[];
    meta: {
        count: number;
    };
}

interface WarehouseNotification {
    company: any;
    success: any;
    product: any;
    id: number;
    telegram_id: number;
    company_id: number;
    product_id: number;
    min_amount: number;
    is_active: boolean;
    last_notification_sent_at: string | null;
    created_at: string;
    updated_at: string;
}

interface WarehouseNotificationForm {
    productId: number | string;
    minAmount: number;
    type: 'warehouse';
    branchId: string | number; // Добавляем поле
}

interface PaginatedWarehouseNotifications {
    min_amount: any;
    current_amount: any;
    product: any;
    success: boolean;
    data: {
        current_page: number;
        data: WarehouseNotification[];
        total: number;
        per_page: number;
    };
}

interface Task {
    deadline: any;
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    type: 'schedule_update' | 'photo_update' | 'description_update' | 'other';
    master_phone: string | null;
    master_name: string | null;
    completed_at: string | null;
    priority: number;
    created_at: string;
    updated_at: string;
}

interface TaskResponse {
    status: string;
    success: boolean;
    data: Task;
    message?: string;
}

interface TasksResponse {
    success: boolean;
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

class LaravelService {
    private laravelApiUrl: string;
    

    constructor() {
        const apiUrl = process.env.LARAVEL_API_URL;
        if (!apiUrl) {
            throw new Error('LARAVEL_API_URL is not defined in environment variables.');
        }
        this.laravelApiUrl = apiUrl;
    }

    public async getTasks(params: GetTasksParams): Promise<TaskPaginatedResponse> {
        try {
            const response = await axios.get<TaskPaginatedResponse>(
                `${this.laravelApiUrl}/admin-tasks`,
                { params }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }

    public async sendTaskNotificationToAdmin(taskId: number): Promise<void> {
        try {
            // Отправляем уведомление через NodeJS API
            await axios.post(`${this.laravelApiUrl}/admin-notifications/send`, {
                task_id: taskId,
                type: 'new_task'
            });
        } catch (error) {
            console.error('Error sending notification to admin:', error);
        }
    }

    public async getMasterPhoto(phone: string): Promise<any> {
        try {
            const response = await axios.post(`${this.laravelApiUrl}/masters/get-photo`, {
                phone: phone
            });
    
            return response.data;
    
        } catch (error) {
            console.error('Error getting master photo:', error);
            return {
                success: false,
                message: 'Ошибка при получении фото мастера'
            };
        }
    }
    
    public async getTaskById(id: number): Promise<TaskResponse> {
        try {
            const response = await axios.get<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks/${id}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching task:', error);
            throw error;
        }
    }
    
    public async completeTask(taskId: number): Promise<TaskResponse> {
        try {
            const response = await axios.post<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks/${taskId}/complete`
            );
            return response.data;
        } catch (error) {
            console.error('Error completing task:', error);
            throw error;
        }
    }
    
    public async updateTaskStatus(
        taskId: number, 
        status: 'pending' | 'in_progress' | 'completed'
    ): Promise<TaskResponse> {
        try {
            const response = await axios.put<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks/${taskId}/status`,
                { status }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    }
    
    async createTaskForMaster({
        type,
        masterPhone,
        masterName,
        description = null
    }: {
        type: 'schedule_update' | 'photo_update' | 'description_update';
        masterPhone: string;
        masterName: string;
        description?: string | null;
    }): Promise<TaskResponse> {
        try {
            // Формируем заголовок в зависимости от типа задачи
            const titles = {
                'description_update': `Обновить описание мастера ${masterName}`,
                'photo_update': `Обновить фото мастера ${masterName}`,
                'schedule_update': `Обновить расписание мастера ${masterName}`
            };
    
            const response = await axios.post<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks`,
                {
                    type,
                    master_phone: masterPhone,
                    master_name: masterName,
                    description,
                    title: titles[type]
                }
            );

            if (response.data.success && response.data.data) {
                // Отправляем уведомление админам
                await this.sendAdminNotification(response.data.data.id, type);
            }
    
            return response.data;
        } catch (error) {
            console.error('Error creating task for master:', error);
            throw error;
        }
    }

    private async sendAdminNotification(taskId: number, type: string): Promise<void> {
        try {
            await axios.post(`${this.laravelApiUrl}/admin-notifications/send`, {
                task_id: taskId,
                type: type
            });
        } catch (error) {
            console.error('Error sending admin notification:', error);
            // Не выбрасываем ошибку, чтобы не прерывать основной процесс
        }
    }

    public async getMasterByPhone(phone: string): Promise<{ name: string; id: number } | null> {
        try {
            const response = await axios.post(
                `${this.laravelApiUrl}/masters/info`,
                { phone }
            );
    
            if (response.data.success) {
                return {
                    name: response.data.data.name,
                    id: response.data.data.id
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting master info:', error);
            return null;
        }
    }
    
    public async deleteTask(taskId: number): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await axios.delete(
                `${this.laravelApiUrl}/admin-tasks/${taskId}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
    
    // Метод для изменения приоритета задачи
    public async updateTaskPriority(
        taskId: number,
        priority: number
    ): Promise<TaskResponse> {
        try {
            const response = await axios.put<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks/${taskId}/priority`,
                { priority }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating task priority:', error);
            throw error;
        }
    }
    
    // Метод для добавления комментария к задаче
    public async addTaskComment(
        taskId: number,
        comment: string
    ): Promise<TaskResponse> {
        try {
            const response = await axios.post<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks/${taskId}/comments`,
                { comment }
            );
            return response.data;
        } catch (error) {
            console.error('Error adding task comment:', error);
            throw error;
        }
    }
    
    // Метод для обновления дедлайна задачи
    public async updateTaskDeadline(
        taskId: number,
        deadline: string
    ): Promise<TaskResponse> {
        try {
            const response = await axios.put<TaskResponse>(
                `${this.laravelApiUrl}/admin-tasks/${taskId}/deadline`,
                { deadline }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating task deadline:', error);
            throw error;
        }
    }

    /**
     * Retrieves a user by their Telegram ID.
     * Utilizes CacheService.rememberCacheValue for caching.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param ex
     * @returns A Promise that resolves to the User object or null if not found.
     */
    public async getUserByTelegramId(telegramId: number, ex: number = 3600): Promise<User | null> {
        const cacheKey = `user_telegram_id_${telegramId}`;
        try {
            const user: User | null = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchUserFromApi(telegramId),
                ex // Cache expiration set to 1 hour (3600 seconds)
            );
            console.log(`User fetched for Telegram ID ${telegramId}:`, user);
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    // Создание уведомления об остатках
    public async createWarehouseNotification(
        telegramId: number,
        data: WarehouseNotificationForm
    ): Promise<WarehouseNotification | null> {
        try {
            const response = await axios.post<{ success: boolean; data: WarehouseNotification }>(
                `${this.laravelApiUrl}/warehouse-notifications`,
                {
                    telegram_id: telegramId,
                    product_id: data.productId,
                    min_amount: data.minAmount,
                    branch_id: data.branchId // Добавляем branch_id
                }
            );
    
            if (!response.data.success) {
                throw new Error('Failed to create warehouse notification');
            }
    
            return response.data.data;
        } catch (error) {
            console.error('Error creating warehouse notification:', error);
            throw error;
        }
    }

    public async getWarehouseNotification(id: number): Promise<any> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/warehouse-notifications/${id}`
            );
            return response.data;
        } catch (error) {
            console.error('Error getting single warehouse notification:', error);
            return null;
        }
    }

    // Получение списка уведомлений
    public async getWarehouseNotifications(
        telegramId: number,
        branchId: number | null = null,
        page: number = 1,
        perPage: number = 10
    ): Promise<PaginatedWarehouseNotifications | null> {
        try {
            console.log('Fetching warehouse notifications:', { telegramId, branchId, page, perPage });
            
            const response = await axios.get<PaginatedWarehouseNotifications>(
                `${this.laravelApiUrl}/warehouse-notifications`,
                {
                    params: {
                        telegram_id: telegramId,
                        branch_id: branchId,
                        page,
                        per_page: perPage
                    }
                }
            );
    
            console.log('Warehouse notifications response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting warehouse notifications:', error);
            return null;
        }
    }

    // Обновление уведомления
    public async updateWarehouseNotification(
        id: number,
        data: { min_amount: number }
    ): Promise<any> {
        try {
            const response = await axios.put(
                `${this.laravelApiUrl}/warehouse-notifications/${id}`,
                data
            );
    
            // Если получили ответ с данными - значит запрос успешен
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            throw new Error('Failed to update notification');
        }
    }

    // Удаление уведомления
    public async deleteWarehouseNotification(id: number): Promise<boolean> {
        try {
            const response = await axios.delete(
                `${this.laravelApiUrl}/warehouse-notifications/${id}`
            );

            return response.data.success || false;
        } catch (error) {
            console.error('Error deleting warehouse notification:', error);
            throw error;
        }
    }


    /**
     * Retrieves paginated notifications for a user by their Telegram ID.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param page - The page number to retrieve.
     * @param perPage - Number of notifications per page.
     * @param type - Either 'search' or 'booking'.
     * @param id
     * @returns A Promise that resolves to PaginatedNotifications or null if not found.
     */
    public async getNotificationsByTelegramId(
        telegramId: number,
        page: number = 1,
        perPage: number = 1,
        type: string = 'search',
        id: number = null
    ): Promise<PaginatedNotifications | null> {
        const cacheKey = `notifications_${type}_telegram_id_${telegramId}_page_${page}`;
        try {
            const notifications: PaginatedNotifications | null = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchNotificationsFromApi(telegramId, page, perPage, type, id),
                60 // Cache expiration set to 2 hours (7200 seconds)
            );
            return notifications;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return null;
        }
    }

    async rescheduleNotification(
        notificationId: number, 
        newDateTime: string
    ): Promise<{ success: boolean; data?: any }> {
        try {
            const response = await axios.patch(
                `${this.laravelApiUrl}/admin-notifications/${notificationId}/reschedule`,
                {
                    notification_datetime: newDateTime
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error rescheduling notification:', error);
            throw error;
        }
    }

    public async createNotificationByTelegramId(
        telegramId: number,
        settings: any
    ): Promise<NotificationResponse> {
        try {
            const response = await axios.post<NotificationResponse>(
                `${this.laravelApiUrl}/admin-notifications`,
                {
                    telegram_id: telegramId,
                    name: settings.name,
                    sum: settings.sum,
                    notification_datetime: this.formatDateTime(settings.dateTime),
                    type: settings.type,
                    frequency: settings.frequency,
                    frequency_value: settings.frequency_value,
                    is_active: true
                }
            );
    
            if (!response.data.success) {
                throw new Error('Failed to create notification');
            }
    
            return response.data;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    
    // Вспомогательный метод для форматирования даты и времени
    private formatDateTime(dateTimeStr: string): string {
        const [date, time] = dateTimeStr.split(' ');
        const [day, month, year] = date.split('.');
        return `${year}-${month}-${day} ${time}:00`;
    }

    // Получение списка уведомлений
public async getAdminNotifications(
    telegramId: number,
    page: number = 1,
    perPage: number = 10
): Promise<PaginatedNotifications | null> {
    try {
        const response = await axios.get<PaginatedNotifications>(
            `${this.laravelApiUrl}/admin-notifications`,
            {
                params: {
                    telegram_id: telegramId,
                    page,
                    per_page: perPage
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error getting admin notifications:', error);
        return null;
    }
}

// Получение конкретного уведомления
public async getAdminNotification(id: number): Promise<any> {
    try {
        const response = await axios.get(
            `${this.laravelApiUrl}/admin-notifications/${id}`
        );
        return response.data;
    } catch (error) {
        console.error('Error getting admin notification:', error);
        return null;
    }
}

// Обновление уведомления
public async updateAdminNotification(
    id: number,
    settings: any
): Promise<any> {
    try {
        const response = await axios.put(
            `${this.laravelApiUrl}/admin-notifications/${id}`,
            settings
        );
        return response.data;
    } catch (error) {
        console.error('Error updating admin notification:', error);
        throw error;
    }
}

// Удаление уведомления
public async deleteAdminNotification(id: number): Promise<boolean> {
    try {
        const response = await axios.delete(
            `${this.laravelApiUrl}/admin-notifications/${id}`
        );
        return response.data.success || false;
    } catch (error) {
        console.error('Error deleting admin notification:', error);
        throw error;
    }
}

    public async updateNotificationById(
        notificationId: string | number,
        settings: any,
    ): Promise<PaginatedNotifications | null> {
        try {
            const response = await axios.put<PaginatedNotifications>(
                `${this.laravelApiUrl}/notifications/telegram/update/${notificationId}`,
                {
                    settings
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Error creating notification');
        }
    }

    /**
     * Creates a cabinet for a user identified by their Telegram ID.
     * Utilizes caching to store and update the user data.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param name - The name of the cabinet to be created.
     * @param phoneNumber - The phone number associated with the cabinet.
     * @param userId
     * @param statePath
     * @returns A Promise that resolves to the updated User object or null if an error occurs.
     */
    public async createCabinetByTelegramId(
        telegramId: number,
        name: string,
        phoneNumber: string,
        userId: string,
        statePath: string,
    ): Promise<User | null> {

        const cacheKey = `user_new_cabinet_${telegramId}`;

        try {
            // Prepare the payload for the POST request
            const payload = {
                name,
                phone_number: phoneNumber,
                user_id: userId,
                state_path: statePath,
            };

            // Make the POST request to create a cabinet
            const response = await this.createCabinet<CreateCabinetResponse>(
                `/cabinets/telegram/${telegramId}`,
                payload
            );

            // Extract the updated user from the response
            const updatedUser: User = response?.user || null;

            // Update the cache with the new user data
            await CacheService.set(cacheKey, updatedUser, 3600); // Cache expires in 1 hour

            console.log(`Cabinet "${name}" created for Telegram ID ${telegramId}. Updated user data cached.`);
            return updatedUser;
        } catch (error) {
            // Handle errors (e.g., user not found, validation errors)
            console.error(`Error creating cabinet for Telegram ID ${telegramId}:`, error);

            // Optionally, you can handle specific error types here
            // For example, if using Axios, you can check error.response.status

            return null;
        }
    }

    public async deleteCabinetByTelegramId(
        telegramId: number,
        cabinetId: string) {
        try {
            const response = await axios.delete(
                `${this.laravelApiUrl}/cabinets/telegram/${telegramId}/${cabinetId}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting cabinet:', error);
            throw new Error('Error deleting cabinet');
        }
    }

    public async updateCabinetByTelegramId(
        telegramId: number,
        cabinetId: string,
        payload: any) {
        try {
            const response = await axios.put(
                `${this.laravelApiUrl}/cabinets/telegram/${telegramId}/${cabinetId}`, {
                    name: payload.name,
                    settings: payload.settings
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error updating cabinet:', error);
            throw new Error('Error updating cabinet');
        }
    }

    public async deleteNotification(
        notificationId: string | number
    ): Promise<void> {
        try {
            await axios.delete(
                `${this.laravelApiUrl}/notifications/telegram/${notificationId}`
            );
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw new Error('Error deleting notification');
        }
    }

    /**
     * Fetches the user data from the Laravel API.
     *
     * @param telegramId - The Telegram ID of the user.
     * @returns A Promise that resolves to the User object.
     */
    private async fetchUserFromApi(telegramId: number): Promise<User> {
        const response = await axios.get<User>(`${this.laravelApiUrl}/users/telegram/${telegramId}`);
        return response.data;
    }

    /**
     * Fetches paginated notifications from the Laravel API.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param page - The page number to retrieve.
     * @param perPage - Number of notifications per page.
     * @param type - Either 'search' or 'booking'.
     * @param id
     * @returns A Promise that resolves to PaginatedNotifications.
     */
    private async fetchNotificationsFromApi(
        telegramId: number,
        page: number,
        perPage: number,
        type: string,
        id: string | number,
    ): Promise<PaginatedNotifications> {
        const response = await axios.get<PaginatedNotifications>(
            `${this.laravelApiUrl}/notifications/telegram/${telegramId}`,
            {
                params: {
                    page,
                    per_page: perPage,
                    type,
                    id
                },
            }
        );
        return response.data;
    }

    /**
     * Makes a POST request to create a cabinet.
     *
     * @param url - The API endpoint URL.
     * @param data - The data to be sent in the request body.
     * @returns A Promise that resolves to the response data.
     * @template T - The type of the response data.
     * @private
     * */

    private async createCabinet<T>(url: string, data: any): Promise<T> {
        const response = await axios.post<T>(`${this.laravelApiUrl}${url}`, data);
        return response.data;
    }



    async getProductsByTelegramId(telegramId: number, page: number = 1, perPage: number = 10): Promise<ProductsPaginatedResponse> {
        const cacheKey = `products_telegram_id_${telegramId}`;
        try {
            // Получаем данные из кэша или API
            const response: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchProductsFromApi(telegramId),
                3600 * 24
            );
    
            // Извлекаем массив продуктов из поля data
            const products = Array.isArray(response?.data) ? response.data : [];
    
            // Пагинация
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / perPage);
            page = Math.max(1, Math.min(totalPages || 1, page));
            const start = (page - 1) * perPage;
            const currentProducts = products.slice(start, start + perPage);
    
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                products: currentProducts,
                allProducts: products
            };
        } catch (error) {
            console.error('Error fetching products:', error);
            return {
                actual_amounts: undefined,
                currentPage: 1,
                totalPages: 0,
                products: [],
                allProducts: []
            };
        }
    }

    async getTaskByTelegramId(telegramId: number, page: number = 1, perPage: number = 10): Promise<TaskPaginatedResponse> {
        const cacheKey = `task_telegram_id_${telegramId}`;
        try {
            // Получаем задачи из кеша или API с правильной типизацией
            const response: { data: Task[] } | null = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchTasksFromApi(telegramId),
                10
            );
    
            if (!response || !Array.isArray(response.data)) {
                return this.createEmptyResponse(page, perPage);
            }
    
            // Пагинация
            const tasks = response.data;
            const totalTasks = tasks.length;
            const totalPages = Math.max(1, Math.ceil(totalTasks / perPage));
            const validPage = Math.max(1, Math.min(totalPages, page));
            const start = (validPage - 1) * perPage;
            const currentTasks = tasks.slice(start, start + perPage);
    
            // Возвращаем данные в формате TaskPaginatedResponse
            return {
                success: true,
                data: {
                    current_page: validPage,
                    data: currentTasks,
                    total: totalTasks,
                    per_page: perPage
                },
                meta: {
                    total: totalTasks
                }
            };
        } catch (error) {
            console.error('Error fetching tasks:', {
                error,
                telegram_id: telegramId,
                page,
                per_page: perPage
            });
            
            return this.createEmptyResponse(page, perPage);
        }
    }
    
    // Вспомогательный метод для создания пустого ответа
    private createEmptyResponse(page: number, perPage: number): TaskPaginatedResponse {
        return {
            success: false,
            data: {
                current_page: page,
                data: [],
                total: 0,
                per_page: perPage
            },
            meta: {
                total: 0
            }
        };
    }
    
    // Типизированный метод для получения задач из API
    private async fetchTasksFromApi(telegramId: number): Promise<{ data: Task[] }> {
        const response = await axios.get<{ data: Task[] }>(
            `${this.laravelApiUrl}/tasks`,
            {
                params: {
                    telegram_id: telegramId
                }
            }
        );
        
        return response.data;
    }

    async closeTask(taskId: number, telegramId: number): Promise<void> {
        try {
            const cacheKey = `task_telegram_id_${telegramId}_task_id_${taskId}`;
            const cacheKey2 = `task_telegram_id_${telegramId}`;
            cacheKey && await CacheService.forget(cacheKey);
            cacheKey2 && await CacheService.forget(cacheKey2);


            await axios.put(`${this.laravelApiUrl}/tasks/close/${taskId}`);
        } catch (error) {
            console.error('Error closing task:', error);
            throw new Error('Error closing task');
        }
    }

   

    async getOneProductByTelegramId(telegramId: number, product_id: number): Promise<ProductPaginatedResponse> {
        const cacheKey = `product_telegram_id_${telegramId}_product_id_${product_id}`;
        try {
            // Fetch products from cache or API
            const product: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchProductsFromApi(telegramId, product_id),
                86400 // Cache expiration set to 24 hours (86400 seconds)
            );



            // Prepare response with pagination details
            return product;
        } catch (error) {
            console.error('Error fetching products:', error);
            return null;
        }
    }


    private async fetchProductsFromApi(telegramId: number, product_id: number = null): Promise<any> {
        try {
            if (product_id === null) {
                const response = await axios.get(`${this.laravelApiUrl}/yclients/goods/${telegramId}`);
                // Возвращаем весь ответ, так как нам нужна структура с полями success, data, meta
                return response.data;
            } else {
                const response = await axios.get(`${this.laravelApiUrl}/yclients/goods/${telegramId}&product_id=${product_id}`);
                return response.data;
            }
        }
        catch (error) {
            console.error('Error fetching products:', error);
            throw new Error('Error fetching products');
        }
    }

   

    async getUsersByTelegramId(telegramId: number, page: number = 1, perPage: number = 10): Promise<any> {
        const cacheKey = `users_telegram_id_${telegramId}`;
        try {
            // Fetch products from cache or API
            const users: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchUsersFromApi(telegramId),
                10 // Cache expiration set to 24 hours (86400 seconds)
            );

            // Paginate products
            const totalUsers = users.length;
            const totalPages = Math.ceil(totalUsers / perPage);
            page = Math.max(1, Math.min(totalPages, page));
            const start = (page - 1) * perPage;
            const currentUsers = users.slice(start, start + perPage);

            // Prepare response with pagination details
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                tasks: currentUsers,
                allTasks: users
            };
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
    }

    async getUserById(telegramId: number, user_id: number): Promise<any> {
        const cacheKey = `user_telegram_id_${telegramId}_user_id_${user_id}`;
        try {
            // Fetch products from cache or API
            const user: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchUsersFromApi(telegramId, user_id),
                10 // Cache expiration set to 24 hours (86400 seconds)
            );

            // Prepare response with pagination details
            return user;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
    }

    private getHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    public async submitRegistration(data: RegistrationSession): Promise<any> {
        try {
            const formattedData = {
                full_name: data.fullName,
                birth_date: this.formatDate(data.birthDate),
                passport_series_number: data.passport,
                passport_issued_by: data.issuedBy?.toUpperCase(),
                passport_issue_date: this.formatDate(data.issueDate),
                passport_division_code: data.divisionCode,
                registration_address: data.registrationAddress,
                inn: data.inn,
                account_number: data.accountNumber,
                bank_name: data.bankName,
                bik: data.bik,
                correspondent_account: data.corrAccount,
                bank_inn: data.bankInn,
                bank_kpp: data.bankKpp,
                phone: data.phone,
                email: data.email,
                has_med_book: data.hasMedBook,
                med_book_expiry: data.medBookExpiry ? this.formatDate(data.medBookExpiry) : null,
                has_education_cert: data.hasEducationCert,
                education_cert_photo: data.educationCertPhoto,
                is_self_employed: data.isSelfEmployed,
                master_price: data.masterPrice, // Добавляем поле master_price
                work_address: data.selectedBranch?.address, // Добавляем адрес филиала
                branch_name: data.selectedBranch?.name,     // Добавляем название филиала
                branch_id: data.selectedBranch?.id,         // Добавляем ID филиала
                telegram_id: data.telegram_id, // Добавляем telegram_id
                status: 'pending'
            };
    
            const response = await axios.post(
                `${this.laravelApiUrl}/employee-registrations`,
                formattedData,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
    
            // Если регистрация успешна, отправляем уведомление
            if (response.data?.success || response.status === 201) {
                try {
                    await axios.post(
                        `${this.laravelApiUrl}/admin-notifications/employment`,
                        {
                            registration_id: response.data.data.id,
                            type: 'new_registration'
                        },
                        {
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (notificationError) {
                    console.error('Error sending registration notification:', {
                        error: notificationError,
                        registrationId: response.data.data.id,
                        response: notificationError.response?.data
                    });
                }
            }
    
            return response.data;
        } catch (error) {
            console.error('Error submitting registration:', error);
            throw error;
        }
    }
    
    // Добавьте также вспомогательный метод, если его еще нет
    private formatDate(dateStr?: string): string | null {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month}-${day}`;
    }

    public async generateContract(data: { id: number }): Promise<Buffer> {
        try {
            const response = await axios.post(
                `${this.laravelApiUrl}/employee-registrations/generate-contract`,
                data,
                {
                    headers: {
                        'Accept': 'application/zip',
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer',  // Добавляем настройки для правильной обработки больших файлов
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 30000 // 30 секунд тайм-аут
                }
            );
    
            if (!response.data || response.data.length === 0) {
                throw new Error('Empty response received');
            }
    
            // Проверяем заголовки ответа
            const contentType = response.headers['content-type'];
            if (contentType?.includes('application/json')) {
                // Если получили JSON с ошибкой
                const errorText = new TextDecoder().decode(response.data);
                const error = JSON.parse(errorText);
                throw new Error(error.message || 'Contract generation failed');
            }
    
            return Buffer.from(response.data);
    
        } catch (error) {
            console.error('Contract generation error:', {
                message: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    public async getActiveRegistrations(): Promise<any[]> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/employee-registrations/pending`,
                {
                    headers: this.getHeaders()
                }
            );
            return response.data.data;
        } catch (error) {
            console.error('Error fetching active registrations:', error);
            throw error;
        }
    }

    
    
    public async getRegistrationDetails(id: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/employee-registrations/${id}`,
                {
                    headers: this.getHeaders()
                }
            );
            return response.data.data;
        } catch (error) {
            console.error('Error fetching registration details:', error);
            throw error;
        }
    }
    
    public async sendEmploymentInvite(registrationId: string): Promise<any> {
        try {
            const response = await axios.post(
                `${this.laravelApiUrl}/employee-registrations/${registrationId}/send-invite`,
                {},
                {
                    headers: this.getHeaders()
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error sending employment invite:', error);
            throw error;
        }
    }

    public async getMasterSalary(
        telegramId: number,
        startDate: string,
        endDate: string
    ): Promise<any> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/salary/master`,  // Исправленный URL
                {
                    params: {
                        telegram_id: telegramId,
                        start_date: startDate,
                        end_date: endDate
                    }
                }
            );
    
            return response.data;
        } catch (error) {
            console.error('Error getting master salary:', error);
            throw error;
        }
    }

    public async exportSalaryReport(startDate: string, endDate: string): Promise<Buffer> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/salary/export`,
                {
                    params: {
                        start_date: startDate,
                        end_date: endDate
                    },
                    responseType: 'arraybuffer',
                    headers: this.getHeaders(),
                    timeout: 300000 // увеличиваем до 5 минут
                }
            );
            
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 504) {
                    throw new Error('Превышено время формирования отчёта. Попробуйте еще раз.');
                }
            }
            throw error;
        }
    }
    
    public async createStaffProfile(registrationId: string): Promise<any> {
        try {
            const response = await axios.post(
                `${this.laravelApiUrl}/employee-registrations/${registrationId}/create-staff-after-invite`,
                {},
                {
                    headers: this.getHeaders()
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error creating staff profile:', error);
            throw error;
        }
    }
    
    public async getRegistrationDocuments(id: string): Promise<any[]> {
        try {
            console.log('Fetching documents for registration:', id);
            const response = await axios.get(
                `${this.laravelApiUrl}/employee-registrations/${id}/documents`,
                {
                    headers: this.getHeaders()
                }
            );
            console.log('Documents response:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching registration documents:', error);
            throw error;
        }
    }

    async getMasterDocumentsByPhone(phone: string): Promise<any[]> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/master/documents/${phone}`,
                {
                    headers: this.getHeaders()
                }
            );
            return response.data.data;
        } catch (error) {
            console.error('Error fetching master documents:', error);
            throw error;
        }
    }

    
    public async approveRegistration(id: string): Promise<void> {
        try {
            await axios.post(
                `${this.laravelApiUrl}/employee-registrations/${id}/approve`,
                {},
                {
                    headers: this.getHeaders()
                }
            );
        } catch (error) {
            console.error('Error approving registration:', error);
            throw error;
        }
    }


    
    public async rejectRegistration(id: string): Promise<void> {
        try {
            await axios.post(
                `${this.laravelApiUrl}/employee-registrations/${id}/reject`,
                {},
                {
                    headers: this.getHeaders()
                }
            );
        } catch (error) {
            console.error('Error rejecting registration:', error);
            throw error;
        }
    }

    public async logout(telegramId: number): Promise<void> {
        try {
            // Очищаем токен в Redis через бэкенд
            await axios.post(`${this.laravelApiUrl}/auth/logout`, {
                telegram_id: telegramId
            });
    
            // Очищаем локальный кэш
            const cacheKey = `user_telegram_id_${telegramId}`;
            await CacheService.forget(cacheKey);
    
        } catch (error) {
            console.error('Logout error:', error);
            // Даже если запрос завершился с ошибкой, очищаем локальный кэш
            const cacheKey = `user_telegram_id_${telegramId}`;
            await CacheService.forget(cacheKey);
            // Не пробрасываем ошибку дальше, просто логируем
        }
    }

    public async getBranchYclientsId(branchId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.laravelApiUrl}/branches/${branchId}/yclients-id`,
                {
                    headers: this.getHeaders()
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching branch yclients_id:', error);
            throw error;
        }
    }

    

    public async updateMasterDescription(
        phone: string,
        password: string,
        description: string
    ): Promise<boolean> {
        try {
            console.log('Starting master description update:', {
                phone,
                descriptionLength: description.length
            });
    
            const response = await axios.post(`${this.laravelApiUrl}/masters/update-description`, {
                phone,
                password,
                description
            });
    
            console.log('Full update description response:', {
                status: response.status,
                success: response.data?.success,
                message: response.data?.message,
                debug: response.data?.debug // Для отладочной информации с бэкенда
            });
    
            if (!response.data?.success) {
                console.error('Update description failed:', {
                    message: response.data?.message,
                    debug: response.data?.debug,
                    responseData: response.data
                });
                return false;
            }
    
            return true;
        } catch (error: any) {
            // Расширенное логирование ошибки
            console.error('Error updating master description:', {
                errorMessage: error?.message,
                errorResponse: {
                    status: error?.response?.status,
                    statusText: error?.response?.statusText,
                    data: error?.response?.data,
                    debug: error?.response?.data?.debug
                },
                requestData: {
                    phone,
                    descriptionLength: description.length,
                    url: `${this.laravelApiUrl}/masters/update-description`
                }
            });
            
            // Специфичные ошибки
            if (error?.response?.status === 401) {
                throw new Error('Неверный логин или пароль');
            }
            
            if (error?.response?.status === 404) {
                throw new Error('Мастер не найден в системе');
            }
            
            throw new Error('Не удалось обновить описание: ' + 
                (error?.response?.data?.message || error.message));
        }
    }



   private async fetchUsersFromApi(telegramId: number, user_id: number = null): Promise<any> {
        try {
            if (user_id === null) {
                const response = await axios.get(`${this.laravelApiUrl}/staff?telegram_id=${telegramId}`);
                return response.data;
            } else {
                const response = await axios.get(`${this.laravelApiUrl}/staff?telegram_id=${telegramId}&user_id=${user_id}`);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw new Error('Error fetching tasks');
        }
   }

   async auth(phone: string, password: string, telegram_id: number): Promise<AuthResponse> {
    try {
        const response = await axios.post<AuthResponse>(`${this.laravelApiUrl}/auth`, {
            phone,
            password,
            telegram_id
        });
        return response.data;
    } catch (error) {
        console.error('Error authenticating:', error);
        throw error; // Пробрасываем ошибку дальше для обработки в обработчике
    }
}

// Добавляем новый метод в LaravelService
async authAdmin(phone: string, password: string, telegram_id: number): Promise<AuthResponse> {
    try {
        // Сначала получаем обычный ответ аутентификации
        const response = await axios.post<AuthResponse>(`${this.laravelApiUrl}/auth/admin`, {
            phone,
            password,
            telegram_id
        });

        // Проверяем роль пользователя
        if (response.data.success && response.data.user) {
            const userRole = response.data.user.user_role_slug;
            
            // Если роль не owner или administrator - возвращаем ошибку
            if (!['owner', 'administrator'].includes(userRole)) {
                return {
                    success: false,
                    message: 'Доступ запрещен: недостаточно прав. Этот бот доступен только для владельцев и администраторов.'
                };
            }
        }

        return response.data;
    } catch (error) {
        console.error('Error authenticating admin:', error);
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            return {
                success: false,
                message: error.response.data.message
            };
        }
        throw error;
    }
}



async uploadSignedDocuments(registrationId: number, files: Array<{url: string, name: string}>): Promise<any> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/employee-registrations/${registrationId}/upload-signed-documents`,
            { 
                files,
                status: 'documents_uploaded'
            },
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error uploading signed documents:', {
            error,
            registrationId,
            response: error.response?.data
        });
        throw error;
    }
}

public async getFilialStaff(
    telegramId: number,
    startDate: string,
    endDate: string,
    useAdminAuth: boolean = false
): Promise<any> {
    try {
        const response = await axios.get(
            `${this.laravelApiUrl}/staff/filial`,
            {
                params: {
                    telegram_id: telegramId,
                    start_date: startDate,
                    end_date: endDate,
                    use_admin_auth: useAdminAuth
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error getting filial staff:', error);
        return null;
    }
}

 /**
     * Получить расписание сотрудника
     */
 public async getStaffSchedule(
    telegramId: number,
    startDate: string,
    endDate: string,
    useAdminAuth: boolean = false
): Promise<ScheduleResponse | null> {
    const cacheKey = `schedule_telegram_id_${telegramId}_${startDate}_${endDate}_${useAdminAuth}`;
    
    try {
        // Логируем входные параметры
        console.log('getStaffSchedule request params:', {
            telegramId,
            startDate,
            endDate,
            useAdminAuth,
            cacheKey,
            apiUrl: `${this.laravelApiUrl}/schedule`
        });

        // Временно отключаем кэширование для отладки
        // const schedule = await CacheService.rememberCacheValue(
        //     cacheKey,
        //     async () => {
        try {
            console.log('Making API request to get schedule...');
            
            const response = await axios.get(
                `${this.laravelApiUrl}/schedule`,
                {
                    params: {
                        telegram_id: telegramId,
                        start_date: startDate,
                        end_date: endDate,
                        use_admin_auth: useAdminAuth
                    }
                }
            );

            console.log('API Response received:', {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data
            });

            return response.data;
        } catch (apiError) {
            console.error('API request error:', {
                error: apiError,
                response: apiError.response?.data,
                status: apiError.response?.status
            });
            throw apiError;
        }
        //     },
        //     300
        // );

        // return schedule;
    } catch (error) {
        console.error('Error in getStaffSchedule:', {
            error: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        return null;
    }
}


// Обновляем метод updateStaffSchedule с правильными типами
public async updateStaffSchedule(
    telegramId: number,
    date: string,
    scheduleData: {
        schedules_to_set: Array<{
            staff_id: number;
            date: string;
            slots: ScheduleSlot[];
        }>;
        schedules_to_delete: Array<{
            staff_id: number;
            date: string;
        }>;
    },
    useAdminAuth: boolean
): Promise<ScheduleResponse | null> {
    try {
        const response = await axios.put<ScheduleResponse>(
            `${this.laravelApiUrl}/schedule`,
            {
                telegram_id: telegramId,
                use_admin_auth: useAdminAuth,
                ...scheduleData
            }
        );

        if (!response.data.success) {
            console.error('Failed to update schedule:', response.data);
            return null;
        }

        // Очищаем кэш для этой даты и соседних дат
        const clearDate = new Date(date);
        const startDate = new Date(clearDate);
        startDate.setDate(clearDate.getDate() - 7);
        const endDate = new Date(clearDate);
        endDate.setDate(clearDate.getDate() + 7);

        const cacheKey = `schedule_telegram_id_${telegramId}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
        await CacheService.forget(cacheKey);

        return response.data;
    } catch (error) {
        console.error('Error updating staff schedule:', error);
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Не удалось обновить расписание: ${errorMessage}`);
        }
        throw error;
    }
}

/**
 * Проверить доступность временного интервала
 */
public async checkTimeSlotAvailability(
    telegramId: number,
    date: string,
    startTime: string,
    endTime: string
): Promise<boolean> {
    try {
        const response = await axios.get(
            `${this.laravelApiUrl}/schedule/check-availability`,
            {
                params: {
                    telegram_id: telegramId,
                    date,
                    start_time: startTime,
                    end_time: endTime
                }
            }
        );
        return response.data.available || false;
    } catch (error) {
        console.error('Error checking time slot availability:', error);
        return false;
    }
}

async updateMasterPhoto(
    phone: string,
    photoPath: string
): Promise<any> {
    try {
        console.log('Starting master photo update:', {
            phone,
            photoPath
        });

        // Проверяем существование файла
        if (!fs.existsSync(photoPath)) {
            throw new Error('Photo file not found');
        }

        // Создаем FormData и добавляем файл и телефон
        const form = new FormData();
        form.append('photo', fs.createReadStream(photoPath));
        form.append('phone', phone);

        const response = await axios.post(
            `${this.laravelApiUrl}/masters/update-photo`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        console.log('Full update photo response:', {
            status: response.status,
            data: response.data
        });

        if (response.data) {
            return response.data; // Возвращаем полный объект ответа
        }

        throw new Error('Invalid response format');

    } catch (error: any) {
        // Расширенное логирование ошибки
        console.error('Error updating master photo:', {
            errorMessage: error?.message,
            errorResponse: {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data
            },
            requestData: {
                phone,
                photoPath,
                url: `${this.laravelApiUrl}/masters/update-photo`
            }
        });

        // Формируем объект ответа с ошибкой
        const errorResponse = {
            success: false,
            message: 'Не удалось обновить фото',
            error: error?.message
        };

        // Добавляем специфические ошибки
        if (error?.response?.status === 401) {
            errorResponse.message = 'Ошибка авторизации';
        } else if (error?.response?.status === 404) {
            errorResponse.message = 'Мастер не найден в системе';
        } else if (error?.response?.status === 413) {
            errorResponse.message = 'Файл слишком большой';
        } else if (error?.response?.data?.message) {
            errorResponse.message = error.response.data.message;
        }

        return errorResponse; // Возвращаем объект с информацией об ошибке
    }
}

public async getMasterRecords({
    phone,
    password,
    params
}: {
    phone: string;
    password: string;
    params: {
        start_date: string;
        end_date: string;
    }
}): Promise<any> {
    try {
        console.log('Starting getMasterRecords:', {
            phone,
            date_range: params
        });

        // Делаем запрос к API для получения записей
        const response = await axios.post(`${this.laravelApiUrl}/records/master`, {
            phone,
            password,
            start_date: params.start_date,
            end_date: params.end_date
        });

        console.log('Records response received:', {
            status: response.status,
            success: response.data?.success,
            recordsCount: response.data?.data?.length ?? 0
        });

        // Проверяем успешность запроса
        if (!response.data?.success) {
            console.error('Failed to get master records:', {
                message: response.data?.message,
                data: response.data
            });
            return {
                success: false,
                message: response.data?.message || 'Не удалось получить записи'
            };
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in getMasterRecords:', {
            errorMessage: error?.message,
            errorResponse: {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data
            },
            requestData: {
                phone,
                date_range: params,
                url: `${this.laravelApiUrl}/records/master`
            }
        });

        // Обработка специфических ошибок
        if (error?.response?.status === 401) {
            throw new Error('Неверный логин или пароль');
        }

        if (error?.response?.status === 404) {
            throw new Error('Мастер не найден в системе');
        }

        throw new Error('Не удалось получить записи: ' + 
            (error?.response?.data?.message || error.message));
    }
}

// Получение деталей конкретной записи
public async getMasterRecordDetails({
    phone,
    password,
    recordId
}: {
    phone: string;
    password: string;
    recordId: string;
}): Promise<any> {
    try {
        console.log('Starting getMasterRecordDetails:', {
            phone,
            recordId
        });

        const response = await axios.post(`${this.laravelApiUrl}/records/master/details`, {
            phone,
            password,
            record_id: recordId
        });

        if (!response.data?.success) {
            console.error('Failed to get record details:', {
                message: response.data?.message,
                data: response.data
            });
            return {
                success: false,
                message: response.data?.message || 'Не удалось получить детали записи'
            };
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in getMasterRecordDetails:', {
            errorMessage: error?.message,
            errorResponse: {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data
            }
        });

        if (error?.response?.status === 401) {
            throw new Error('Неверный логин или пароль');
        }

        throw new Error('Не удалось получить детали записи: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async cancelMasterRecord({
    phone,
    password,
    recordId
}: {
    phone: string;
    password: string;
    recordId: string;
}): Promise<any> {
    try {
        console.log('Starting cancelMasterRecord:', {
            phone,
            recordId
        });

        const response = await axios.post(`${this.laravelApiUrl}/records/master/cancel`, {
            phone,
            password,
            record_id: recordId
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось отменить запись');
        }

        return {
            success: true,
            message: response.data.message
        };

    } catch (error: any) {
        console.error('Error in cancelMasterRecord:', {
            errorMessage: error?.message,
            errorResponse: error?.response?.data
        });

        throw new Error('Не удалось отменить запись: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async updateMasterRecord({
    phone,
    password,
    recordId,
    updateData
}: {
    phone: string;
    password: string;
    recordId: string;
    updateData: any;
}): Promise<any> {
    try {
        const response = await axios.post(`${this.laravelApiUrl}/records/master/update`, {
            phone,
            password,
            record_id: recordId,
            update_data: updateData
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось обновить запись');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in updateMasterRecord:', error);
        throw new Error('Не удалось обновить запись: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async getMasterCategoriesForTimeChange({
    phone,
    password
}: {
    phone: string;
    password: string;
}): Promise<any> {
    try {
        console.log('Starting getMasterCategoriesForTimeChange');

        const response = await axios.post(`${this.laravelApiUrl}/master/categories-time-change`, {
            phone,
            password
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось получить категории услуг');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in getMasterCategoriesForTimeChange:', error);
        throw new Error('Не удалось получить категории услуг: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async getMasterServicesForTimeChange({
    phone,
    password,
    category_id
}: {
    phone: string;
    password: string;
    category_id: number;
}): Promise<any> {
    try {
        console.log('Starting getMasterServicesForTimeChange');

        const response = await axios.post(`${this.laravelApiUrl}/master/services-time-change`, {
            phone,
            password,
            category_id
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось получить список услуг');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in getMasterServicesForTimeChange:', error);
        throw new Error('Не удалось получить список услуг: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async updateMasterServiceTime({
    phone,
    password,
    service_id,
    duration
}: {
    phone: string;
    password: string;
    service_id: number;
    duration: number;
}): Promise<any> {
    try {
        console.log('Starting updateMasterServiceTime');

        const response = await axios.post(`${this.laravelApiUrl}/master/update-service-time`, {
            phone,
            password,
            service_id,
            duration
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось обновить длительность услуги');
        }

        return {
            success: true,
            message: response.data.message,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in updateMasterServiceTime:', error);
        throw new Error('Не удалось обновить длительность услуги: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async getMasterServices({
    phone,
    password
}: {
    phone: string;
    password: string;
}): Promise<any> {
    try {
        console.log('Starting getMasterServices');

        const response = await axios.post(`${this.laravelApiUrl}/services/master`, {
            phone,
            password
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось получить список услуг');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error in getMasterServices:', error);
        throw new Error('Не удалось получить список услуг: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async getCompanies(): Promise<any> {
    try {
        const response = await axios.get<any>(
            `${this.laravelApiUrl}/companies`
        );
        return response.data;
    } catch (error) {
        console.error('Error getting companies:', error);
        return null;
    }
}

public async getProducts(companyId: number): Promise<any> {
    try {
        const response = await axios.get(
            `${this.laravelApiUrl}/products/${companyId}`
        );
        return response.data;
    } catch (error) {
        console.error('Error getting products:', error);
        return null;
    }
}

public async getServiceCategories(params: {
    phone: string,
    password: string,
    companyId: number
}): Promise<any> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/admin/services/categories`,
            {
                phone: params.phone,
                password: params.password,
                company_id: params.companyId
            }
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось получить категории услуг');
        }

        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('Error getting service categories:', error);
        throw new Error('Не удалось получить категории услуг: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async getServices(params: {
    phone: string,
    password: string,
    companyId: number,
    categoryId: number
}): Promise<any> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/admin/services/list`,
            {
                phone: params.phone,
                password: params.password,
                company_id: params.companyId,
                category_id: params.categoryId
            }
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось получить список услуг');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error getting services:', error);
        throw new Error('Не удалось получить список услуг: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async generateServicesTemplate(params: {
    phone: string,
    password: string
}): Promise<Buffer> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/admin/services/template`,
            {
                phone: params.phone,
                password: params.password
            },
            {
                responseType: 'arraybuffer'
            }
        );
        
        if (response.headers['content-type']?.includes('application/json')) {
            // Если получили JSON вместо файла - значит произошла ошибка
            const errorText = new TextDecoder().decode(response.data);
            const error = JSON.parse(errorText);
            throw new Error(error.message || 'Не удалось сгенерировать шаблон');
        }

        return response.data;
    } catch (error: any) {
        console.error('Error generating services template:', error);
        throw new Error('Не удалось сгенерировать шаблон: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async generatePinboxTemplate(params: {
    phone: string,
    password: string
}): Promise<Buffer> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/admin/pinbox/template`,
            {
                phone: params.phone,
                password: params.password
            },
            {
                responseType: 'arraybuffer'
            }
        );
        
        if (response.headers['content-type']?.includes('application/json')) {
            const errorText = new TextDecoder().decode(response.data);
            const error = JSON.parse(errorText);
            throw new Error(error.message || 'Не удалось сгенерировать шаблон Pinbox');
        }

        return response.data;
    } catch (error: any) {
        console.error('Error generating pinbox template:', error);
        throw new Error('Не удалось сгенерировать шаблон Pinbox: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async processServicesUpdates(params: {
    phone: string,
    password: string,
    file: Buffer
}): Promise<any> {
    try {
        const formData = new FormData();
        formData.append('file', params.file, {
            filename: 'services_update.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        formData.append('phone', params.phone);
        formData.append('password', params.password);

        const response = await axios.post(
            `${this.laravelApiUrl}/admin/services/process-updates`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось обработать изменения');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error processing services updates:', error);
        throw new Error('Не удалось обработать изменения: ' + 
            (error?.response?.data?.message || error.message));
    }
}

public async updateServicePrices(params: {
    phone: string,
    password: string,
    updates: Array<{
        branch_id: number,
        service_id: number,
        new_price: number
    }>
}): Promise<any> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/admin/services/update-prices`,
            { 
                phone: params.phone,
                password: params.password,
                updates: params.updates
            }
        );

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Не удалось обновить цены');
        }

        return {
            success: true,
            data: response.data.data
        };

    } catch (error: any) {
        console.error('Error updating service prices:', error);
        throw new Error('Не удалось обновить цены: ' + 
            (error?.response?.data?.message || error.message));
    }
}

}


export default new LaravelService();
