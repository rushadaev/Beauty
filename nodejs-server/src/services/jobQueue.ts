// src/services/jobQueue.ts
import Bull from 'bull';
import { AuthenticateUserRequestBody } from './authService';

// Initialize Bull queue for authentication jobs
export const authQueue = new Bull<AuthenticateUserRequestBody>('authentication', {
    redis: {
        host: 'redis', // Update with your Redis host
        port: 6379,        // Update with your Redis port
    },
});
