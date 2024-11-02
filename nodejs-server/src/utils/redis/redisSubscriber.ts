// redisSubscriber.ts

import { createClient, RedisClientType } from 'redis';

/**
 * Type definition for a message handler function.
 * It accepts a parsed message of generic type T and returns void or a Promise.
 */
type MessageHandler<T = any> = (message: T | null) => void | Promise<void>;

/**
 * Interface representing the structure of the message handlers.
 * Each channel maps to an array of message handler functions.
 */
interface MessageHandlers {
    [channel: string]: MessageHandler[];
}

/**
 * RedisSubscriber is a singleton class responsible for managing Redis subscriptions.
 */
class RedisSubscriber {
    private subscriber: RedisClientType;
    private isConnected: boolean;
    private messageHandlers: MessageHandlers;

    constructor() {
        this.subscriber = createClient({
            url: 'redis://redis:6379/1', // Ensure using Database 1
        });
        this.isConnected = false;
        this.messageHandlers = {};

        this.subscriber.on('error', (err: Error) => {
            console.error('Redis subscription error:', err);
        });
    }

    /**
     * Establishes a connection to the Redis server if not already connected.
     */
    private async connect(): Promise<void> {
        if (!this.isConnected) {
            try {
                await this.subscriber.connect();
                this.isConnected = true;
                console.log('Connected to Redis.');
            } catch (error) {
                console.error('Failed to connect to Redis:', error);
                throw error;
            }
        }
    }

    /**
     * Subscribes to a Redis channel with a specific message handler.
     * @param channel - The Redis channel to subscribe to.
     * @param messageHandler - The function to handle incoming messages.
     */
    public async subscribe<T = any>(channel: string, messageHandler: MessageHandler<T>): Promise<void> {
        await this.connect();

        if (!this.messageHandlers[channel]) {
            this.messageHandlers[channel] = [];

            // Subscribe with a callback that iterates over all handlers for this channel
            try {
                await this.subscriber.subscribe(channel, async (message: string) => {
                    const parsedMessage = this.parseMessage<T>(message, channel);
                    if (parsedMessage === null) {
                        // Parsing failed; optionally handle this scenario
                        return;
                    }

                    // Execute all handlers for this channel
                    for (const handler of this.messageHandlers[channel]) {
                        try {
                            await handler(parsedMessage);
                        } catch (handlerError) {
                            console.error(`Error in handler for channel ${channel}:`, handlerError);
                        }
                    }
                });

                console.log(`Subscribed to Redis channel: ${channel}`);
            } catch (subscribeError) {
                console.error(`Failed to subscribe to channel ${channel}:`, subscribeError);
                throw subscribeError;
            }
        }

        this.messageHandlers[channel].push(messageHandler);
    }

    /**
     * Unsubscribes a specific message handler from a Redis channel.
     * @param channel - The Redis channel to unsubscribe from.
     * @param messageHandler - The handler to remove.
     */
    public async unsubscribe(channel: string, messageHandler: MessageHandler): Promise<void> {
        if (this.messageHandlers[channel]) {
            this.messageHandlers[channel] = this.messageHandlers[channel].filter(
                (handler) => handler !== messageHandler
            );

            if (this.messageHandlers[channel].length === 0) {
                delete this.messageHandlers[channel];
                try {
                    await this.subscriber.unsubscribe(channel);
                    console.log(`Unsubscribed from Redis channel: ${channel}`);
                } catch (unsubscribeError) {
                    console.error(`Failed to unsubscribe from channel ${channel}:`, unsubscribeError);
                    throw unsubscribeError;
                }
            }
        }
    }

    /**
     * Parses the incoming message and handles JSON parsing errors.
     * @param message - The raw message string from Redis.
     * @param channel - The Redis channel name.
     * @returns The parsed message object or null if parsing fails.
     */
    private parseMessage<T>(message: string, channel: string): T | null {
        try {
            const parsed: T = JSON.parse(message);
            console.log(`Message received from ${channel}:`, parsed);
            return parsed;
        } catch (error) {
            console.error(`Error parsing message from channel ${channel}:`, error);
            return null;
        }
    }

    /**
     * Disconnects the Redis subscriber gracefully.
     */
    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            try {
                await this.subscriber.disconnect();
                this.isConnected = false;
                console.log('Redis subscriber disconnected.');
            } catch (error) {
                console.error('Error disconnecting Redis subscriber:', error);
                throw error;
            }
        }
    }
}

// Exporting a singleton instance of RedisSubscriber
const redisSubscriber = new RedisSubscriber();
export default redisSubscriber;
