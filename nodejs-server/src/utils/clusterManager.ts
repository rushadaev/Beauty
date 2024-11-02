// nodejs-server/utils/clusterManager.ts

import { Cluster } from 'playwright-cluster';

let cluster: Cluster | undefined;

const initializeCluster = async (): Promise<Cluster> => {
    if (cluster) {
        return cluster;
    }

    cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 5,
        timeout: 120000,
        playwrightOptions: {
            headless: true,
        },
    });

    cluster.on('taskerror', (err: Error, data: any, willRetry: boolean) => {
        if (willRetry) {
            console.warn(`Error processing ${data}: ${err.message}. Retrying...`);
        } else {
            console.error(`Failed to process ${data}: ${err.message}`);
        }
    });

    cluster.on('active', () => {
        console.log('A new task has started. Active tasks:', cluster!.idle);
    });

    cluster.on('idle', () => {
        console.log('All tasks are complete. Cluster is idle.');
    });

    return cluster;
};

const shutdownCluster = async (): Promise<void> => {
    if (cluster) {
        await cluster.close();
        console.log('Cluster has been shut down.');
        cluster = undefined;
    }
};

process.on('SIGINT', async () => {
    console.log('Received SIGINT. Shutting down cluster...');
    await shutdownCluster();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Shutting down cluster...');
    await shutdownCluster();
    process.exit(0);
});

export {
    initializeCluster,
    shutdownCluster,
};
