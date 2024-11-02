import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';

// Load environment variables
const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || '7237021957:AAEBwCsrCFNLFGArfGys3rJgzqitL9Wsg8k';
const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID || '782919745';

/**
 * Sends a text message to the specified Telegram chat.
 * @param message - The message text to send.
 * @param telegram_chat_id - Optional chat ID to send the message to.
 * @returns Returns true if sent successfully, else false.
 */
async function sendMessageToTelegram(message: string, telegram_chat_id: string | null = null): Promise<boolean> {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const form = new FormData();
    form.append('chat_id', telegram_chat_id || TELEGRAM_CHAT_ID);
    form.append('text', message);

    try {
        const response: AxiosResponse<{ ok: boolean; result?: any }> = await axios.post(url, form, {
            headers: form.getHeaders(),
        });
        if (response.data.ok) {
            console.log('Message sent to Telegram successfully!');
            return true;
        } else {
            console.error('Failed to send message:', response.data);
            return false;
        }
    } catch (error: any) {
        console.error('Exception occurred while sending message:', error.message);
        return false;
    }
}

/**
 * Retrieves updates from the Telegram Bot API.
 * @param offset - The update ID to start fetching from.
 * @returns Returns the JSON response or null on failure.
 */
async function getUpdates(offset: number | null = null): Promise<any | null> {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const params: { timeout: number; offset?: number } = { timeout: 100 };
    if (offset !== null) {
        params.offset = offset;
    }

    try {
        const response: AxiosResponse<{ ok: boolean; result?: any }> = await axios.get(url, { params });
        if (response.data.ok) {
            return response.data;
        } else {
            console.error('Failed to get updates:', response.data);
            return null;
        }
    } catch (error: any) {
        console.error('Exception occurred while getting updates:', error.message);
        return null;
    }
}

export {
    sendMessageToTelegram,
};
