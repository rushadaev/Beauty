import redisSubscriber from './redisSubscriber';
import { sendMessageToTelegram } from "../telegram";

/**
 * Interface representing the structure of the verification message.
 */
interface VerificationMessage {
    action: 'collect_verification_code';
    telegramId: string;
    code: string;
    // Add other properties if necessary
}

/**
 * Handles incoming verification code messages.
 * @param message - The verification message received from Redis.
 */
async function handleVerificationCodeMessage(message: VerificationMessage): Promise<void> {
    if (message.action === 'collect_verification_code') {
        console.log(`User ${message.telegramId} sent verification code: ${message.code}`);

        await sendMessageToTelegram(`Received verification code: ${message.code}`, message.telegramId);
        // Add your processing logic here, for example, validating the code
    }
}

/**
 * Starts listening for verification code messages on a specified Redis channel.
 * @param channel - The channel name to subscribe to (without prefix).
 */
async function startListeningForVerificationCode(channel: string): Promise<void> {
    const prefixedChannel = `wb_app_database_${channel}`;
    // Subscribe to the channel where Laravel publishes verification code updates
    await redisSubscriber.subscribe(prefixedChannel, handleVerificationCodeMessage);
}

export {
    startListeningForVerificationCode,
};
