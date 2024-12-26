// src/services/UserService.ts

import axios from 'axios';
import CacheService from '../utils/redis/Cache/Cache';
import  {User, CreateCabinetResponse}  from '../telegraf/types/User';
import {PaginatedNotifications} from "../telegraf/types/Notification";
import { RegistrationSession } from '../telegraf/types/RegistrationSession';
import FormData from 'form-data';
import * as fs from 'node:fs';

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
    actual_amounts: any;
    currentPage: number;
    totalPages: number;
    tasks: any;
    allTasks: any;
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

class LaravelService {
    private laravelApiUrl: string;

    constructor() {
        const apiUrl = process.env.LARAVEL_API_URL;
        if (!apiUrl) {
            throw new Error('LARAVEL_API_URL is not defined in environment variables.');
        }
        this.laravelApiUrl = apiUrl;
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

    public async createNotificationByTelegramId(
        telegramId: number,
        settings: any,
        type: string = 'notification'
    ): Promise<PaginatedNotifications | null> {
        try {
            const response = await axios.post<PaginatedNotifications>(
                `${this.laravelApiUrl}/notifications/telegram/${telegramId}`,
                {
                    settings:{
                        ...settings,
                        type
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Error creating notification');
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
            // Fetch products from cache or API
            const products: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchProductsFromApi(telegramId),
                3600 * 24 // Cache expiration set to 24 hours (86400 seconds)
            );

            // Paginate products
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / perPage);
            page = Math.max(1, Math.min(totalPages, page));
            const start = (page - 1) * perPage;
            const currentProducts = products.slice(start, start + perPage);

            // Prepare response with pagination details
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                products: currentProducts,
                allProducts: products
            };
        } catch (error) {
            console.error('Error fetching products:', error);
            return null;
        }
    }

    async getTaskByTelegramId(telegramId: number, page: number = 1, perPage: number = 10): Promise<TaskPaginatedResponse> {
        const cacheKey = `task_telegram_id_${telegramId}`;
        try {
            // Fetch products from cache or API
            const tasks: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchTasksFromApi(telegramId),
                10 // Cache expiration set to 24 hours (86400 seconds)
            );

            // Paginate products
            const totalTasks = tasks.length;
            const totalPages = Math.ceil(totalTasks / perPage);
            page = Math.max(1, Math.min(totalPages, page));
            const start = (page - 1) * perPage;
            const currentTasks = tasks.slice(start, start + perPage);

            // Prepare response with pagination details
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                tasks: currentTasks,
                allTasks: tasks
            };
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
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

    async getTaskById(telegramId: number, task_id: number): Promise<TaskPaginatedResponse> {
        const cacheKey = `task_telegram_id_${telegramId}_task_id_${task_id}`;
        try {
            // Fetch products from cache or API
            const task: any = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchTasksFromApi(telegramId, task_id),
                10 // Cache expiration set to 24 hours (86400 seconds)
            );

            // Prepare response with pagination details
            return task;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
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


    private async fetchProductsFromApi(telegramId: number, product_id: number = null): Promise<Product[]> {
        try{
            if (product_id === null) {
                const response = await axios.get(`${this.laravelApiUrl}/yclients/goods/${telegramId}`);
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

    private async fetchTasksFromApi(telegramId: number, task_id: number = null): Promise<any> {
        try {
            if (task_id === null) {
                const response = await axios.get(`${this.laravelApiUrl}/tasks?telegram_id=${telegramId}`);
                return response.data;
            } else {
                const response = await axios.get(`${this.laravelApiUrl}/tasks?telegram_id=${telegramId}&task_id=${task_id}`);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw new Error('Error fetching tasks');
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

// В LaravelService добавляем новый метод:
public async uploadSignedDocuments(registrationId: number, files: Array<{url: string, name: string}>): Promise<any> {
    try {
        const response = await axios.post(
            `${this.laravelApiUrl}/employee-registrations/${registrationId}/upload-signed-documents`,
            { 
                files,
                status: 'documents_uploaded' // Обновляем статус регистрации
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
        console.error('Error uploading signed documents:', error);
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

async updateMasterPhoto(telegramId: number, photoPath: string): Promise<any> {
    try {
        const form = new FormData();
        form.append('photo', fs.createReadStream(photoPath));
        form.append('telegram_id', telegramId.toString());

        const response = await axios.post(
            `${this.laravelApiUrl}/masters/update-photo`,
            form,
            {
                headers: {
                    ...form.getHeaders()
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error updating master photo:', error);
        throw error;
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

}


export default new LaravelService();
