// nodejs-server/controllers/draftsController.ts

import {Request, RequestHandler, Response} from 'express';
import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import {getDraftsForUser} from "../services/wildberriesService";

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

// Define Interfaces for Drafts Response
interface Draft {
    createdAt: string;
    updatedAt: string;
    barcodeQuantity: number;
    goodQuantity: number;
    author: string;
    ID: string;
}

interface DraftsResult {
    drafts: Draft[];
}

interface DraftsApiResponse {
    result: DraftsResult;
}

// Define Interface for Row Data
interface RowData {
    createdAt: string;
    updatedAt: string;
    barcodeQuantity: string;
    goodQuantity: string;
    author: string;
    draftId: string;
    url: string;
}

/**
 * List Drafts Endpoint
 * Expects a query parameter: userId
 */
export const listDrafts:RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid userId parameter.' });
        return
    }

    try {
        const drafts = await getDraftsForUser(userId);
        res.status(200).json({
            message: `Found ${drafts.length} drafts with barcodeQuantity > 0.`,
            data: drafts,
        });
        return
    } catch (error: any) {
        console.error('Error fetching drafts data:', error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
        return
    }
};
