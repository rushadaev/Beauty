// utils/cacheHelper.ts

import redisClient from './redisClient';
import { serialize as phpSerialize, unserialize as phpUnserialize } from 'php-serialize';

/**
 * Interface representing the options for setting a Redis key.
 */
interface SetOptions {
    EX?: number; // Expiration time in seconds
}

/**
 * Serialize values to match Laravel's expected format (PHP serialization).
 * Sets a value in Redis with an optional expiration time.
 *
 * @param key - The cache key.
 * @param value - The value to cache.
 * @param expirationInSeconds - Expiration time in seconds (default is 3600 seconds or 1 hour).
 * @returns A promise that resolves when the value is set.
 */
export async function setCacheValue(
    key: string,
    value: any,
    expirationInSeconds: number = 3600
): Promise<void> {
    try {
        // Custom key format: wb_app_database_{key}
        const formattedKey = `wb_app_database_${key}`;
        const serializedValue = phpSerialize(value);
        const options: SetOptions = {
            EX: expirationInSeconds, // Expiration time in seconds
        };
        await redisClient.set(formattedKey, serializedValue, options);
        console.log(`Value set for key: ${formattedKey}`);
    } catch (err) {
        console.error(`Error setting cache value for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}

/**
 * Retrieves a value from the Laravel Redis cache.
 * Attempts to unserialize the value; if unsuccessful, returns the raw value.
 *
 * @param key - The cache key.
 * @returns A promise that resolves with the cached value or null if not found.
 */
export async function getCacheValue<T = any>(key: string): Promise<T | string | null> {
    try {
        // Custom key format: wb_app_database_{key}
        const formattedKey = `wb_app_database_${key}`;
        const value = await redisClient.get(formattedKey);
        if (value !== null) {
            try {
                const deserializedValue = phpUnserialize(value) as T;
                console.log(`Value retrieved for key ${formattedKey}:`, deserializedValue);
                return deserializedValue;
            } catch (error) {
                console.warn(`Failed to deserialize, returning raw value for key ${formattedKey}:`, value);
                return value; // If not serialized, return raw value
            }
        } else {
            console.log(`Key ${formattedKey} not found in cache.`);
            return null;
        }
    } catch (err) {
        console.error(`Error getting cache value for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}

/**
 * Clears (deletes) a specific cache key from Redis.
 *
 * @param key - The cache key to delete.
 * @returns A promise that resolves to true if the key was deleted, false otherwise.
 */
export async function clearCacheValue(key: string): Promise<boolean> {
    try {
        // Custom key format: wb_app_database_{key}
        const formattedKey = `wb_app_database_${key}`;
        const result = await redisClient.del(formattedKey);
        if (result === 1) {
            console.log(`Successfully deleted key: ${formattedKey}`);
            return true;
        } else {
            console.log(`Key ${formattedKey} does not exist or could not be deleted.`);
            return false;
        }
    } catch (err) {
        console.error(`Error deleting cache value for key ${key}:`, err);
        throw err; // Rethrow the error after logging
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
export async function rememberCacheValue<T>(
    key: string,
    computeFn: () => Promise<T>,
    expirationInSeconds: number = 3600
): Promise<T> {
    try {
        // Attempt to retrieve the cached value
        const cachedValue = await getCacheValue<T>(key);

        if (cachedValue !== null) {
            console.log(`Cache hit for key: ${key}`);
            return cachedValue as T;
        }

        console.log(`Cache miss for key: ${key}. Computing value...`);

        // Compute the value using the provided function
        const computedValue = await computeFn();

        // Store the computed value in the cache
        await setCacheValue(key, computedValue, expirationInSeconds);
        console.log(`Computed and cached value for key: ${key}`);

        return computedValue;
    } catch (err) {
        console.error(`Error in rememberCacheValue for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}

