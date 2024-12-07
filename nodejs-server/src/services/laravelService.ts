// src/services/UserService.ts

import axios from 'axios';
import CacheService from '../utils/redis/Cache/Cache';
import  {User, CreateCabinetResponse}  from '../telegraf/types/User';
import {PaginatedNotifications} from "../telegraf/types/Notification";
import { RegistrationSession } from '../telegraf/types/RegistrationSession';

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

interface TaskPaginatedResponse {
    actual_amounts: any;
    currentPage: number;
    totalPages: number;
    tasks: any;
    allTasks: any;
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
                    responseType: 'arraybuffer'
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

   async auth(phone: string, password: string, telegram_id: number): Promise<void> {
        try {
            const response = await axios.post(`${this.laravelApiUrl}/auth`, {
                phone,
                password,
                telegram_id
            });
            return response.data;
        } catch (error) {
            console.error('Error authenticating:', error);
            throw new Error('Error authenticating');
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

}


export default new LaravelService();
