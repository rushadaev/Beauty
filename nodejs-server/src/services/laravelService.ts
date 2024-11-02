// src/services/UserService.ts

import axios from 'axios';
import CacheService from '../utils/redis/Cache/Cache';
import  {User, CreateCabinetResponse}  from '../telegraf/types/User';
import {PaginatedNotifications} from "../telegraf/types/Notification";

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
     * @returns A Promise that resolves to the User object or null if not found.
     */
    public async getUserByTelegramId(telegramId: number): Promise<User | null> {
        const cacheKey = `user_telegram_id_${telegramId}`;
        try {
            const user: User | null = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchUserFromApi(telegramId),
                3600 // Cache expiration set to 1 hour (3600 seconds)
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
     * @returns A Promise that resolves to PaginatedNotifications or null if not found.
     */
    public async getNotificationsByTelegramId(
        telegramId: number,
        page: number = 1,
        perPage: number = 1,
        type: string = 'search'
    ): Promise<PaginatedNotifications | null> {
        const cacheKey = `notifications_telegram_id_${telegramId}_page_${page}`;
        try {
            const notifications: PaginatedNotifications | null = await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchNotificationsFromApi(telegramId, page, perPage, type),
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
    ): Promise<PaginatedNotifications | null> {
        try {
            const response = await axios.post<PaginatedNotifications>(
                `${this.laravelApiUrl}/notifications/telegram/${telegramId}`,
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
        notificationId: string
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
     * @returns A Promise that resolves to PaginatedNotifications.
     */
    private async fetchNotificationsFromApi(
        telegramId: number,
        page: number,
        perPage: number,
        type: string
    ): Promise<PaginatedNotifications> {
        const response = await axios.get<PaginatedNotifications>(
            `${this.laravelApiUrl}/notifications/telegram/${telegramId}`,
            {
                params: {
                    page,
                    per_page: perPage,
                    type
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



}

export default new LaravelService();
