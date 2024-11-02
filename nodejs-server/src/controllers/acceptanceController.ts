// src/controllers/acceptanceController.ts

import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import {Request, RequestHandler, Response} from 'express';
import {solveTaskInNode, TaskInput, wasmPath} from '../utils/pow/solveTask';

// Define Interfaces for Storage State
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

// Define Interfaces for Acceptance Costs Response
interface Coefficient {
    coefficient: number;
    // Add other properties if necessary
}

interface AcceptanceCostsResult {
    costs: Coefficient[];
    // Add other properties if necessary
}

interface AcceptanceCostsResponse {
    result?: AcceptanceCostsResult;
    // Add other properties if necessary
}

// Define Interfaces for Book Timeslot Response
interface BookTimeslotResult {
    // Define the structure based on actual response
    [key: string]: any;
}

// Define Interfaces for POW Task
interface PowTask {
    // Define based on actual task structure
    [key: string]: any;
}

interface PowAnswer {
    // Define based on actual answer structure
    [key: string]: any;
}

// Helper function to wait
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Ensure the functions are typed as RequestHandler
export const fetchTimeslots: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { userId, preorderId } = req.query;

    if (!userId || !preorderId) {
        res.status(400).json({ error: 'Missing userId or preorderId parameter.' });
        return;
    }

    try {
        // Path to the user's state.json
        const statePath = path.join('/var/www/wb-back/storage/state', `${userId}.json`);

        if (!fs.existsSync(statePath)) {
            res.status(404).json({ error: 'User state not found.' });
            return;
        }

        const storageState: StorageState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

        // Extract cookies and WBTokenV3
        const { cookies, origins } = storageState;
        let cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        const originData = origins.find(origin => origin.origin === 'https://seller.wildberries.ru');
        if (!originData) {
            res.status(400).json({ error: 'Origin data not found in state.' });
            return;
        }

        const wbTokenEntry = originData.localStorage.find(item => item.name === 'wb-eu-passport-v2.access-token');
        const wbTokenValue = wbTokenEntry ? wbTokenEntry.value : null;

        if (!wbTokenValue) {
            res.status(400).json({ error: 'WBTokenV3 token not found in localStorage.' });
            return;
        }

        // Add WBTokenV3 to cookies
        cookieHeader += `; WBTokenV3=${wbTokenValue}`;

        // Define headers
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Origin': 'https://seller.wildberries.ru',
            'Referer': 'https://seller.wildberries.ru/',
            'Accept-Language': 'ru,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
        };

        // **a. Get Acceptance Costs**
        const acceptanceCostsUrl = 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/getAcceptanceCosts';
        const dateFrom = new Date().toISOString();
        const dateTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
        const acceptanceCostsData = {
            "params": {
                "dateFrom": dateFrom,
                "dateTo": dateTo,
                "preorderID": Number(preorderId)
            },
            "jsonrpc": "2.0",
            "id": "json-rpc_35"
        };

        const acceptanceCostsResponse: AxiosResponse<AcceptanceCostsResponse> = await axios.post(acceptanceCostsUrl, acceptanceCostsData, { headers });
        const acceptanceCostsResult = acceptanceCostsResponse.data?.result;

        if (!acceptanceCostsResult) {
            res.status(500).json({ error: 'Failed to retrieve acceptance costs.' });
            return;
        }

        // Filter coefficients > -1
        acceptanceCostsResult.costs = acceptanceCostsResult.costs.filter(coefficient => coefficient.coefficient > -1);

        res.status(200).json({
            message: 'Fetched acceptance costs and delivery date successfully.',
            data: {
                acceptanceCosts: acceptanceCostsResult,
            }
        });
    } catch (error: any) {
        console.error('Error fetching acceptance costs:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};

export const bookTimeslot: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { userId, preorderId, deliveryDate, warehouseId, monopalletCount } = req.body;

    if (!userId || !preorderId || !deliveryDate || !warehouseId) {
        res.status(400).json({ error: 'Missing required parameters.' });
        return;
    }

    try {
        // Path to the user's state.json
        const statePath = path.join('/var/www/wb-back/storage/state', `${userId}.json`);

        if (!fs.existsSync(statePath)) {
            res.status(404).json({ error: 'User state not found.' });
            return;
        }

        const storageState: StorageState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

        // Extract cookies and WBTokenV3
        const { cookies, origins } = storageState;
        let cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        const originData = origins.find(origin => origin.origin === 'https://seller.wildberries.ru');
        if (!originData) {
            res.status(400).json({ error: 'Origin data not found in state.' });
            return;
        }

        const wbTokenEntry = originData.localStorage.find(item => item.name === 'wb-eu-passport-v2.access-token');
        const wbTokenValue = wbTokenEntry ? wbTokenEntry.value : null;

        if (!wbTokenValue) {
            res.status(400).json({ error: 'WBTokenV3 token not found in localStorage.' });
            return;
        }

        // Add WBTokenV3 to cookies
        cookieHeader += `; WBTokenV3=${wbTokenValue}`;

        // Define headers
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Origin': 'https://seller.wildberries.ru',
            'Referer': 'https://seller.wildberries.ru/',
            'Accept-Language': 'ru,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
        };

        // **d. Book Timeslot**
        const bookTimeslotUrl = 'https://seller-supply.wildberries.ru/ns/sm/supply-manager/api/v1/plan/add';

        const bookTimeslotData = {
            "params": {
                "preOrderId": Number(preorderId),
                "deliveryDate": deliveryDate,
                "warehouseId": warehouseId,
                ...(monopalletCount !== undefined && { monopalletCount })  // Add monopalletCount if provided
            },
            "jsonrpc": "2.0",
            "id": "json-rpc_36"
        };

        // **Perform CAPTCHA Solving**
        const task: TaskInput = await getPowTask();

        const startTime = Date.now();
        const answers: PowAnswer[] = await solvePowTask(task);
        const latency = (Date.now() - startTime).toFixed(3); // Latency in milliseconds

        console.log('answers', answers);

        const captchaToken: string = await verifyPowAnswer(task, answers);
        console.log('captchaToken', captchaToken);

        // Include the CAPTCHA token and latency in headers
        const bookTimeslotHeaders = {
            ...headers,
            'x-wb-captcha-token': captchaToken,
            'x-wb-captcha-latency': latency,
        };

        // Make the plan/add request with CAPTCHA headers
        const bookTimeslotResponse: AxiosResponse<{ result: BookTimeslotResult }> = await axios.post(bookTimeslotUrl, bookTimeslotData, { headers: bookTimeslotHeaders });
        const bookTimeslotResult = bookTimeslotResponse.data.result;

        console.log('Book Timeslot Result:', bookTimeslotResult);

        res.status(200).json({
            message: 'Timeslot booked successfully.',
            data: bookTimeslotResult
        });
    } catch (error: any) {
        console.error('Error booking timeslot:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};
// Functions for CAPTCHA solving

/**
 * Retrieves a POW task from the server.
 * @param clientId Optional client ID.
 * @returns The POW task.
 */
export const getPowTask = async (clientId: string | null = null): Promise<TaskInput> => {
    const actualClientId = clientId || 'e150c635-c6bb-4192-8046-97c2cf81e8b8'; // Use the actual client_id if required
    const getTaskUrl = `https://pow.wildberries.ru/api/v1/short/get-task?client_id=${actualClientId}`;

    const response: AxiosResponse<TaskInput> = await axios.get(getTaskUrl, {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Origin': 'https://seller.wildberries.ru',
            'Referer': 'https://seller.wildberries.ru/',
            'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
        },
    });

    return response.data;
};

/**
 * Solves the given POW task.
 * @param task The POW task to solve.
 * @returns An array of answers.
 */
export const solvePowTask = async (task:TaskInput): Promise<PowAnswer[]> => {
    let resultArray: PowAnswer[] = [];
    try {
        const result = await solveTaskInNode(wasmPath, task);
        resultArray = JSON.parse(result)?.answers;
        console.log('solveTask result:', resultArray);
    } catch (err) {
        console.error('Error running solveTask:', err);
    }
    return resultArray;
};

/**
 * Verifies the POW answer with the server.
 * @param task The original POW task.
 * @param answers The answers to verify.
 * @returns The CAPTCHA token.
 */
export const verifyPowAnswer = async (task:TaskInput, answers: PowAnswer[]): Promise<string> => {
    const verifyUrl = 'https://pow.wildberries.ru/api/v1/short/verify-answer';

    const data = {
        task,
        answers,
    };

    console.log('data', data);

    const response: AxiosResponse<{ 'wb-captcha-short-token': string }> = await axios.post(verifyUrl, JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Origin': 'https://seller.wildberries.ru',
            'Referer': 'https://seller.wildberries.ru/',
            'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
        },
    });

    return response.data['wb-captcha-short-token'];
};
