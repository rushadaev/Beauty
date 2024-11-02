import express, { Application, Request, Response } from 'express';
import bodyParser from 'body-parser';
import winston from 'winston'; // For logging
import { initializeCluster, shutdownCluster } from './utils/clusterManager';

import bot from './telegraf/controllers/telegramController';
// Import Routes
import draftsRoutes from './routes/drafts';
import ordersRoutes from './routes/orders';
import acceptanceRoutes from './routes/acceptance';
import authRoutes from './routes/auth';

const app: Application = express();
const PORT: number | string = process.env.PORT || 3000;

// Configure Winston (optional)
export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'nodejs-server' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
        new winston.transports.File({
            filename: 'combined.log', // Log file name
            format: winston.format.json(), // Optional: Can also use format like simple or custom formats
        }),
        // Add more transports like File if needed
    ],
});

// Middleware
app.use(bodyParser.json());

// Routes
// Webhook route
app.use(bot.webhookCallback('/webhook/telegram'));

app.use('/api/drafts', draftsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/acceptance', acceptanceRoutes);
app.use('/api/auth', authRoutes);

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).send({ status: 'OK' });
});

// Start Server After Initializing Cluster
const startServer = async (): Promise<void> => {
    try {
        await initializeCluster(); // Initialize Playwright Cluster
        app.listen(PORT, () => {
            console.log(`Node.js server is running on port ${PORT}`);
        });
    } catch (error: any) {
        console.error('Failed to initialize Playwright cluster:', error.message);
        process.exit(1); // Exit process with failure
    }
};

startServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await shutdownCluster();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    await shutdownCluster();
    process.exit(0);
});
