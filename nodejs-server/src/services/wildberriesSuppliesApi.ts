// src/services/UserService.ts

import axios from 'axios';
import CacheService from '../utils/redis/Cache/Cache';
import {Warehouse, WarehouseResponse} from "../telegraf/types/Warehouses";

class WildberriesSuppliesApi {
    private laravelApiUrl: string;

    constructor() {
        const apiUrl = process.env.LARAVEL_API_URL;
        if (!apiUrl) {
            throw new Error('LARAVEL_API_URL is not defined in environment variables.');
        }
        this.laravelApiUrl = apiUrl;
    }



    /**
     * Retrieves paginated notifications for a user by their Telegram ID.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param page - The page number to retrieve.
     * @param perPage - Number of notifications per page.
     * @returns A Promise that resolves to PaginatedNotifications or null if not found.
     */
    public async getWarehouses(): Promise<Warehouse[] | null> {
        const cacheKey = `warehouses`;
        try {
            return await CacheService.rememberCacheValue(
                cacheKey,
                () => this.fetchWarehousesFromApi(),
                3600*24 // Cache expiration set to 2 hours (7200 seconds)
            );
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            return null;
        }
    }


     /**
     * Fetches warehouses data from the Laravel API.
     *
     * @returns A Promise that resolves to the User object.
     */
    private async fetchWarehousesFromApi(): Promise<Warehouse[]> {
        const response = await axios.get<WarehouseResponse>(`${this.laravelApiUrl}/warehouses`);
        return response.data.data;
    }

}

export default new WildberriesSuppliesApi();
