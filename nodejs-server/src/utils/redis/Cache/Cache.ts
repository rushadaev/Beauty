// src/cache/Cache.ts

import redisClient from '../redisClient';
import { serialize, unserialize } from 'php-serialize';
import axios from 'axios';

// Define an interface for the user data returned by the API
interface User {
    id: number;
    telegramId: string;
    name: string;
    // Add other user properties as needed
}

interface ScanResult {
    cursor: number;
    keys: string[];
}

class Cache {
    private prefix: string;

    constructor() {
        this.prefix = 'wb_app_database_';
    }

    /**
     * Sets a value in the Redis cache.
     * @param key - The key under which the value is stored.
     * @param value - The value to store; can be any serializable type.
     * @param expirationInSeconds - Time in seconds before the key expires. Defaults to 3600 seconds (1 hour).
     */
    async set(key: string, value: any, expirationInSeconds: number = 3600): Promise<void> {
        const fullKey = `${this.prefix}${key}`;
        try {
            const serializedValue = serialize(value);
            await redisClient.set(fullKey, serializedValue, {
                EX: expirationInSeconds, // Expiration time in seconds
            });
            console.log(`Value set for key: ${fullKey}`);
        } catch (err) {
            console.error(`Error setting cache value for key ${fullKey}:`, err);
        }
    }

    /**
     * Retrieves a value from the Redis cache.
     * @param key - The key of the value to retrieve.
     * @returns The deserialized value if found, raw value if deserialization fails, or null if not found.
     */
    async get(key: string): Promise<any | null> {
        const fullKey = `${this.prefix}${key}`;
        try {
            const value = await redisClient.get(fullKey);
            if (value !== null) {
                try {
                    const deserializedValue = unserialize(value);
                    // console.log(`Value retrieved for key ${fullKey}:`, deserializedValue);
                    return deserializedValue;
                } catch (error) {
                    console.warn(`Failed to deserialize value for key ${fullKey}. Returning raw value.`);
                    return value;
                }
            } else {
                console.log(`Key ${fullKey} not found in cache.`);
                return null;
            }
        } catch (err) {
            console.error(`Error getting cache value for key ${fullKey}:`, err);
            return null;
        }
    }

    /**
     * Retrieves a value from the cache. If it doesn't exist, computes it using the provided function,
     * stores it in the cache, and then returns it.
     *
     * @param key - The cache key.
     * @param computeFn - An asynchronous function to compute the value if it's not cached.
     * @param expirationInSeconds - Cache expiration time in seconds. Defaults to 3600 (1 hour).
     * @returns A promise that resolves with the cached or computed value.
     */
    async rememberCacheValue<T>(
        key: string,
        computeFn: () => Promise<T>,
        expirationInSeconds: number = 3600
    ): Promise<T> {
        try {
            // Attempt to retrieve the cached value
            const cachedValue = await this.get(key);

            if (cachedValue !== null) {
                console.log(`Cache hit for key: ${key}`);
                return cachedValue as T;
            }

            console.log(`Cache miss for key: ${key}. Computing value...`);

            // Compute the value using the provided function
            const computedValue = await computeFn();

            // Store the computed value in the cache
            await this.set(key, computedValue, expirationInSeconds);
            console.log(`Computed and cached value for key: ${key}`);

            return computedValue;
        } catch (err) {
            console.error(`Error in rememberCacheValue for key ${key}:`, err);
            throw err; // Rethrow the error after logging
        }
    }


    /**
     * Retrieves a user by their Telegram ID, first checking the cache before making an API call.
     * @param telegramId - The Telegram ID of the user.
     * @returns The user data if found, or null otherwise.
     */
    async getUserByTelegramId(telegramId: number): Promise<User | null> {
        const cacheKey = `user_telegram_id_${telegramId}`;
        try {
            let user: User | null = await this.get(cacheKey);
            console.log('User retrieved from cache:', user);
            if (user) {
                return user;
            }

            const laravelApiUrl = process.env.LARAVEL_API_URL;
            if (!laravelApiUrl) {
                console.error('LARAVEL_API_URL is not defined in environment variables.');
                return null;
            }

            const response = await axios.get<User>(`${laravelApiUrl}/users/telegram/${telegramId}`);
            user = response.data;
            console.log('User retrieved from API:', user);

            // Optionally, cache the user data after fetching from the API
            await this.set(cacheKey, user, 3600); // Cache for 1 hour

            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    /**
     * Deletes a key from the Redis cache.
     * @param key - The key to delete.
     * @returns True if the key was deleted, false otherwise.
     */
    async forget(key: string): Promise<boolean> {
        const fullKey = `${this.prefix}${key}`;
        try {
            const result = await redisClient.del(fullKey);
            if (result === 1) {
                console.log(`Successfully deleted key: ${fullKey}`);
                return true;
            } else {
                console.log(`Key ${fullKey} does not exist or could not be deleted.`);
                return false;
            }
        } catch (err) {
            console.error(`Error deleting cache value for key ${fullKey}:`, err);
            return false;
        }
    }

    async forgetByPattern(pattern: string): Promise<boolean> {
        const fullPattern = `${this.prefix}${pattern}`;
        console.log(`Deleting keys matching pattern: ${fullPattern}`);
        try {
            let cursor = 0;
            do {
                const result:ScanResult = await redisClient.scan(cursor, {
                    MATCH: fullPattern,
                    COUNT: 100
                });
                console.log('Scan result:', result);

                // Adjusted to match the actual response structure
                const nextCursor = result.cursor;
                const keys = result.keys;
                cursor = nextCursor;

                if (keys && keys.length > 0) {  // Added a check to ensure keys is defined
                    await redisClient.del(keys);
                    console.log(`Successfully deleted keys matching pattern: ${fullPattern}`);
                }
            } while (cursor !== 0);

            return true;
        } catch (err) {
            console.error(`Error deleting cache values for pattern ${fullPattern}:`, err);
            return false;
        }
    }

    /**
     * Publishes a message to a Redis channel.
     * @param channel - The channel to publish the message to.
     * @param message - The message to publish.
     */
    async pushToChannel(channel: string, message: string): Promise<void> {
        const fullChannel = `${this.prefix}${channel}`;

        try {
            await redisClient.publish(fullChannel, message);
            console.log(`Message published to channel ${channel}: ${message}`);
        } catch (err) {
            console.error(`Error publishing message to channel ${channel}:`, err);
        }
    }

}

export default new Cache();
