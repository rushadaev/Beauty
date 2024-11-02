import path from 'path';
import fs from 'fs';
import axios, { AxiosResponse } from 'axios';

// Define the interfaces (if you need type safety)
interface StorageState {
    cookies: { name: string; value: string }[];
    origins: {
        origin: string;
        localStorage: { name: string; value: string }[];
    }[];
}

interface DraftsApiResponse {
    result: {
        drafts: any[];
    };
}

interface RowData {
    createdAt: string;
    updatedAt: string;
    barcodeQuantity: string;
    goodQuantity: string;
    author: string;
    draftId: string;
    url: string;
}

interface CreateSupplyResult {
    result?: {
        ids: { Id: string }[];
    };
}

export const getDraftsForUser = async (userId: string): Promise<RowData[]> => {
    // Path to the user's state.json
    const statePath = path.join('/var/www/wb-back/storage/state', `${userId}.json`);

    if (!fs.existsSync(statePath)) {
        throw new Error('User state not found.');
    }

    const storageState: StorageState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

    // Extract cookies and WBTokenV3
    const { cookies, origins } = storageState;
    let cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    const originData = origins.find(origin => origin.origin === 'https://seller.wildberries.ru');
    if (!originData) {
        throw new Error('Origin data not found in state.');
    }

    const wbTokenEntry = originData.localStorage.find(item => item.name === 'wb-eu-passport-v2.access-token');
    const wbTokenValue = wbTokenEntry ? wbTokenEntry.value : null;

    if (!wbTokenValue) {
        throw new Error('WBTokenV3 token not found in localStorage.');
    }

    // Add WBTokenV3 to cookies
    cookieHeader += `; WBTokenV3=${wbTokenValue}`;

    // Define the API endpoint
    const apiUrl = 'https://seller-supply.wildberries.ru/ns/sm-draft/supply-manager/api/v1/draft/listDrafts';

    // Define the request payload
    const data = {
        params: {
            filter: {
                orderBy: {
                    createdAt: -1,
                },
            },
            limit: 10,
            offset: 0,
        },
        jsonrpc: '2.0',
        id: 'json-rpc_20',
    };

    // Define headers
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Accept': '*/*',
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Origin': 'https://seller.wildberries.ru',
        'Referer': 'https://seller.wildberries.ru/',
        'Accept-Language': 'ru,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    };

    // Make the API request using axios
    const response: AxiosResponse<DraftsApiResponse> = await axios.post(apiUrl, data, { headers });

    // Extract and process drafts data
    const drafts = response.data.result.drafts;

    const filteredDrafts = drafts.filter(draft => draft.barcodeQuantity > 0);
    return filteredDrafts.map(draft => ({
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        barcodeQuantity: draft.barcodeQuantity.toString(),
        goodQuantity: draft.goodQuantity.toString(),
        author: draft.author,
        draftId: draft.ID,
        url: `https://seller.wildberries.ru/supplies-management/drafts/draft-detail?draftNumber=${draft.ID}`,
    }));
};


export const createOrderRequest = async (cabinetId:string, draftId:string, warehouseId:string, boxTypeMask:string): Promise<{
    preorderID: string;
    message: string
}> => {
    // Validate request body
    if (!cabinetId || !draftId || !warehouseId || !boxTypeMask) {
       throw new Error('Missing required parameters.');
    }

    try {
        // Construct the path to the user's state.json
        const statePath = path.join('/var/www/wb-back/storage/state', `${cabinetId}.json`);

        // Check if the state file exists
        if (!fs.existsSync(statePath)) {
            throw new Error('User state not found.' );
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
            throw new Error('Origin data not found in state.' );
        }

        // Retrieve WBTokenV3 from localStorage
        const wbTokenEntry = originData.localStorage.find(item => item.name === 'wb-eu-passport-v2.access-token');
        const wbTokenValue = wbTokenEntry ? wbTokenEntry.value : null;

        if (!wbTokenValue) {
            throw new Error('WBTokenV3 token not found in localStorage.');
        }

        // Append WBTokenV3 to the Cookie header
        cookieHeader += `; WBTokenV3=${wbTokenValue}`;

        // Define HTTP headers for the request
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (compatible)',
            'Origin': 'https://seller.wildberries.ru',
            'Referer': 'https://seller.wildberries.ru/',
            'Accept-Language': 'ru,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        };

        // **b. Create Supply**
        const createSupplyUrl = 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/create';

        //Monopallet 32
        //Koroba 4
        const boxTypeCorrect = boxTypeMask == "5" ? 32 : 4;
        // Prepare the payload for creating supply
        const createSupplyData = {
            params: {
                boxTypeMask: boxTypeCorrect,
                draftID: draftId,
                transitWarehouseId: null,
                warehouseId: Number(warehouseId),
            },
            jsonrpc: "2.0",
            id: "json-rpc_26"
        };

        // Make the POST request to create supply
        const createSupplyResponse: AxiosResponse<CreateSupplyResult> = await axios.post(createSupplyUrl, createSupplyData, { headers });
        const createSupplyResult = createSupplyResponse.data;

        // Extract preorderID from the response
        const preorderID = createSupplyResult?.result?.ids[0]?.Id;
        console.log('createSupplyResult:', createSupplyResult);

        // Respond with success and the preorderID
        return {
            message: 'Order created successfully.',
            preorderID: preorderID,
        };
    } catch (error: any) {
        console.error('Error during order creation:', error.message);
        throw new Error('Internal Server Error.');
    }
};
