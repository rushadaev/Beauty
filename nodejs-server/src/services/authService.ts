// src/services/authService.ts
import { authQueue } from './jobQueue';

export interface AuthenticateUserRequestBody {
    userId: string;
    telegramId: string;
    credentials: {
        statePath?: any;
        phone: string;
        name?: string;
    };
    headless?: boolean;
}

export interface AuthServiceResult {
    success: boolean;
    message: string;
}

// Service function to enqueue authentication job
export const authenticateUserService = async (
    data: AuthenticateUserRequestBody
): Promise<AuthServiceResult> => {
    const { userId, telegramId, credentials, headless } = data;

    if (!userId || !credentials || !telegramId || !credentials.phone) {
        return { success: false, message: 'Missing userId, telegramId, or credentials.' };
    }

    try {
        // Add the job to the Bull queue
        await authQueue.add(data, {
            backoff: 5000, // Wait 5 seconds before retrying
            removeOnComplete: true, // Remove job from queue on completion
            removeOnFail: true, // Remove failed jobs for inspection
        });

        return { success: true, message: 'Authentication job enqueued.' };
    } catch (error: any) {
        console.error('Failed to enqueue authentication job:', error.message);
        return { success: false, message: 'Failed to enqueue authentication job.' };
    }
};
