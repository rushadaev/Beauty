import { Request, Response } from 'express';
import axios from 'axios';

// Function to get goods
export const getGoods = async (req: Request, res: Response) => {
    try {
        const response = await axios.get('https://api.yclients.com/api/v1/goods/490462', {
            headers: {
                'Accept': 'application/vnd.api.v2+json',
                'Authorization': 'Bearer rpxh9hw6sjakpdsha6r3, User eb4b7a6a59b300074be260e045ade57c'
            }
        });

        res.status(200).json(response.data);
    } catch (error: any) {
        console.error('Error fetching goods:', error.message);
        res.status(500).json({ error: 'Failed to get goods' });
    }
};

// Function to get companies
export const getCompanies = async (req: Request, res: Response) => {
    try {
        const response = await axios.get('https://api.yclients.com/api/v1/companies', {
            headers: {
                'Accept': 'application/vnd.api.v2+json',
                'Authorization': 'Bearer rpxh9hw6sjakpdsha6r3'
            }
        });

        res.status(200).json(response.data);
    } catch (error: any) {
        console.error('Error fetching companies:', error.message);
        res.status(500).json({ error: 'Failed to get companies' });
    }
};