// utils/redisHelper.ts

import redisSubscriber from './redisSubscriber';

/**
 * Interface representing the structure of messages received from Redis.
 */
interface VerificationMessage {
    action: string;
    code: string;
}

/**
 * Waits for a verification code from Redis on a specific channel.
 * @param telegramId - The user's Telegram ID.
 * @param timeoutMs - Timeout in milliseconds (default is 300000 ms or 5 minutes).
 * @returns A promise that resolves with the verification code.
 */
export function waitForVerificationCode(
    telegramId: string,
    timeoutMs: number = 300000
): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        // Construct the channel name with the given Telegram ID
        let channel = `verification_code_channel_${telegramId}`;
        channel = `wb_app_database_${channel}`;

        /**
         * Handler for incoming messages on the Redis channel.
         * @param message - The message received from Redis.
         */
        const messageHandler = (message: VerificationMessage) => {
            if (message && message.action === 'collect_verification_code') {
                console.log(
                    `Received verification code for Telegram ID ${telegramId}: ${message.code}`
                );
                cleanup();
                resolve(message.code);
            }
        };

        /**
         * Cleans up by unsubscribing from the Redis channel and clearing the timeout.
         */
        const cleanup = async () => {
            try {
                await redisSubscriber.unsubscribe(channel, messageHandler);
            } catch (error) {
                console.error(`Error during cleanup: ${error}`);
            }
            clearTimeout(timer);
        };

        // Set up a timeout to reject the promise if no verification code is received in time
        const timer = setTimeout(async () => {
            try {
                await redisSubscriber.unsubscribe(channel, messageHandler);
            } catch (error) {
                console.error(`Error during timeout cleanup: ${error}`);
            }
            reject(new Error('Verification code timeout.'));
        }, timeoutMs);

        try {
            await redisSubscriber.subscribe(channel, messageHandler);
            console.log(`Waiting for verification code on channel: ${channel}`);
        } catch (error) {
            clearTimeout(timer);
            reject(error);
        }
    });
}
