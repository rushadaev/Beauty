// utils/redisClient.ts

import { createClient, RedisClientType } from 'redis';

/**
 * Configuration options for the Redis client.
 */
const redisConfig = {
    url: 'redis://redis:6379/1', // Use Redis container name as host
};

/**
 * Create a Redis client instance.
 */
const redisClient: RedisClientType = createClient(redisConfig);

/**
 * Connect to Redis.
 */
const connectRedis = async (): Promise<void> => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Redis connection error:', error);
        // Optionally, handle reconnection logic or exit the process
        process.exit(1);
    }
};

// Initiate the connection
connectRedis();

/**
 * Gracefully handle application termination signals to disconnect Redis client.
 */
const gracefulShutdown = async () => {
    try {
        await redisClient.disconnect();
        console.log('Disconnected from Redis');
        process.exit(0);
    } catch (error) {
        console.error('Error during Redis disconnection:', error);
        process.exit(1);
    }
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default redisClient;
