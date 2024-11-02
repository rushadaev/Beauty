// nodejs-server/controllers/ordersController.ts

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import {createOrderRequest} from "../services/wildberriesService";

/**
 * Interfaces for the storage state structure.
 */
interface Cookie {
    name: string;
    value: string;
}

interface LocalStorageItem {
    name: string;
    value: string;
}

interface OriginData {
    origin: string;
    localStorage: LocalStorageItem[];
}

interface StorageState {
    cookies: Cookie[];
    origins: OriginData[];
}

interface CreateSupplyResult {
    result?: {
        ids: { Id: string }[];
    };
}

interface RecommendationsResult {
    warehouses: Warehouse[];
}

interface Warehouse {
    isActive: boolean;
    // Add other relevant properties as needed
}

/**
 * Handler to create an order.
 * Expects a JSON body: { userId, draftId, warehouseId, boxTypeMask }
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    const { userId, draftId, warehouseId, boxTypeMask } = req.body;

    // Validate request body
    if (!userId || !draftId || !warehouseId || !boxTypeMask) {
        res.status(400).json({ error: 'Missing userId, draftId, warehouseId, or boxTypeMask in request body.' });
        return;
    }

    try {
        const response = await createOrderRequest(userId, draftId, warehouseId, boxTypeMask);

        // Respond with success and the preorderID
        res.status(200).json({
            message: 'Order created successfully.',
            preorderID: response.preorderID,
        });
    } catch (error: any) {
        console.error('Error during order creation:', error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};

/**
 * Handler to list warehouses.
 * Expects query parameters: { userId, draftId }
 */
export const listWarehouses = async (req: Request, res: Response): Promise<void> => {
    const { userId, draftId } = req.query;

    // Validate query parameters
    if (typeof userId !== 'string' || typeof draftId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid userId or draftId in query parameters.' });
        return;
    }

    try {
        // Construct the path to the user's state.json
        const statePath = path.join('/var/www/wb-back/storage/state', `${userId}.json`);

        // Check if the state file exists
        if (!fs.existsSync(statePath)) {
            res.status(404).json({ error: 'User state not found.' });
            return;
        }

        // Read and parse the storage state
        const storageStateRaw = fs.readFileSync(statePath, 'utf-8');
        const storageState: StorageState = JSON.parse(storageStateRaw);

        // Extract cookies and construct the Cookie header
        const cookies = storageState.cookies;
        let cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        // Find origin data for Wildberries seller
        const originData = storageState.origins.find(origin => origin.origin === 'https://seller.wildberries.ru');
        if (!originData) {
            res.status(400).json({ error: 'Origin data not found in state.' });
            return;
        }

        // Retrieve WBTokenV3 from localStorage
        const wbTokenEntry = originData.localStorage.find(item => item.name === 'wb-eu-passport-v2.access-token');
        const wbTokenValue = wbTokenEntry ? wbTokenEntry.value : null;

        if (!wbTokenValue) {
            res.status(400).json({ error: 'WBTokenV3 token not found in localStorage.' });
            return;
        }

        // Append WBTokenV3 to the Cookie header
        cookieHeader += `; WBTokenV3=${wbTokenValue}`;

        // Define HTTP headers for the request
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Origin': 'https://seller.wildberries.ru',
            'Referer': 'https://seller.wildberries.ru/',
            'Accept-Language': 'ru,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        };

        // **a. Get Warehouse Recommendations**
        const recommendationsUrl = 'https://seller-supply.wildberries.ru/ns/sm-recommendations/supply-manager/api/v1/recommendations/getRecommendationsForWarehouses';
        const recommendationsData = {
            params: {
                draftId: draftId
            },
            jsonrpc: "2.0",
            id: "json-rpc_20"
        };

        // Make the POST request to get warehouse recommendations
        const recommendationsResponse: AxiosResponse<{ result: RecommendationsResult }> = await axios.post(recommendationsUrl, recommendationsData, { headers });
        const recommendationsResult = recommendationsResponse.data.result;

        // Filter active warehouses
        const activeWarehouses = recommendationsResult.warehouses.filter(warehouse => warehouse.isActive);
        if (activeWarehouses.length === 0) {
            res.status(400).json({ error: 'No active warehouses available.' });
            return;
        }

        // Respond with the list of active warehouses
        res.status(200).json({
            message: 'Warehouses fetched successfully.',
            warehouses: activeWarehouses,
        });
    } catch (error: any) {
        console.error('Error during warehouse fetch:', error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};
