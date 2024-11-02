import {Request, RequestHandler, Response} from 'express';
import { initializeCluster } from '../utils/clusterManager';
import fs from 'fs';
import path from 'path';
import { sendMessageToTelegram } from '../utils/telegram';
import { getPowTask, solvePowTask, verifyPowAnswer } from './acceptanceController';
import { waitForVerificationCode } from '../utils/redis/redisHelper';
import { setCacheValue } from '../utils/redis/cacheHelper';
import axios, { AxiosResponse } from 'axios';
import { Page, BrowserContext } from 'playwright';
import {TaskInput} from "../utils/pow/solveTask";

// Define Interfaces for Request Bodies and Other Structures

interface Credentials {
    phone: string;
    // Add other credential fields if necessary
}

interface AuthenticateUserRequestBody {
    userId: string;
    credentials: Credentials;
    telegramId: string;
    headless?: boolean;
}

interface AuthenticationResult {
    success: boolean;
    statePath?: string;
    error?: string;
}

interface PowTask {
    // Define based on actual task structure
    [key: string]: any;
}

interface PowAnswer {
    // Define based on actual answer structure
    [key: string]: any;
}

// Exported Functions

/**
 * Authenticates a user by automating the login process, handling CAPTCHA, and verification codes.
 * Expects a JSON body: { userId, credentials, telegramId, headless }
 */
export const authenticateUser: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { userId, telegramId, credentials, headless } = req.body as AuthenticateUserRequestBody;

    if (!userId || !credentials || !telegramId || !credentials.phone) {
        res.status(400).json({ error: 'Missing userId, telegramId, or credentials.' });
        return
    }

    // Respond to Laravel immediately
    res.status(202).json({ message: 'Authentication job started.' });

    try {
        // Initialize the cluster
        const cluster = await initializeCluster();

        // Define the task for authentication
        await cluster.execute(
            {
                userId,
                telegramId,
                credentials,
                headless: headless !== undefined ? headless : true,
            },
            async ({ page, data }): Promise<void> => {
            const { userId, telegramId, credentials, headless } = data as AuthenticateUserRequestBody;
            let context: BrowserContext | undefined;

            // Set custom headers
            const customHeaders = {
                'Content-Type': 'application/json;charset=UTF-8',
                Accept: '*/*',
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/128.0.0.0 Safari/537.36',
                Origin: 'https://seller.wildberries.ru',
                Referer: 'https://seller.wildberries.ru/',
            };

            try {
                // Apply custom headers to the context
                context = await page.context();
                await context.setExtraHTTPHeaders({
                    'Content-Type': customHeaders['Content-Type'],
                    Accept: customHeaders['Accept'],
                    Origin: customHeaders['Origin'],
                    Referer: customHeaders['Referer'],
                });

                await page.setViewportSize({ width: 1920, height: 1080 });

                // Enhanced logging for debugging
                page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
                page.on('request', (request) => {
                    if (request.url().includes('/auth/v2/auth')) {
                        console.log(
                            'Auth Request:',
                            request.method(),
                            request.url(),
                            request.headers(),
                            request.postData()
                        );
                    }
                });
                page.on('response', (response) => {
                    if (response.url().includes('/auth/v2/auth')) {
                        console.log('Auth Response:', response.status(), response.url(), response.statusText());
                    }
                });

                // Intercept and modify auth requests
                await page.route('**/auth/v2/auth', async (route) => {
                    const request = route.request();

                    if (request.method() === 'POST') {
                        const headers = {
                            ...request.headers(),
                            'Content-Type': 'application/json',
                        };

                        console.log('Original Headers:', request.headers());
                        console.log('Modified Headers:', headers);

                        await route.continue({
                            headers: headers,
                        });
                    } else {
                        await route.continue();
                    }
                });

                // Navigate to the login page
                await page.goto('https://seller-auth.wildberries.ru/');
                console.log('Navigated to the login page.');

                // Interact with the login form
                await page.locator('div').filter({ hasText: /^\+7$/ }).nth(2).click();
                await page.getByTestId('phone-input').click();
                await page.getByTestId('phone-input').fill(credentials.phone);
                console.log('Filled phone number into the form.');

                // Wait 1 second
                await page.waitForTimeout(1000);

                // Handle CAPTCHA solving
                const captchaResult = await handleCaptcha(page, telegramId);
                if (!captchaResult) {
                    throw new Error('Failed to handle CAPTCHA.');
                }

                // Ask user for the verification code via Telegram
                const codeResult = await askUserForCode(page, telegramId);
                if (!codeResult) {
                    throw new Error('Failed to submit verification code.');
                }

                console.log('Successfully authenticated the user. Going to the Seller Portal...');
                await page.goto('https://seller.wildberries.ru/');
                await page.waitForLoadState('networkidle');
                await page.getByTestId('menu.section.supply-management-button-link');
                console.log('Check for specific cookie');

                // Wait for the 'x-supplier-id' cookie to be set
                const maxRetries = 20; // You can adjust this based on the expected time
                let retries = 0;
                let supplierIdCookie: { name: string; value: string } | undefined = undefined;

                while (retries < maxRetries) {
                    const cookies = await context.cookies();
                    supplierIdCookie = cookies.find((cookie) => cookie.name === 'x-supplier-id');

                    if (supplierIdCookie) {
                        console.log('x-supplier-id cookie is set:', supplierIdCookie);
                        break; // Cookie is found, proceed with saving the session
                    }

                    // Wait 500ms before checking again
                    await page.waitForTimeout(500);
                    retries += 1;
                }

                if (!supplierIdCookie) {
                    throw new Error('x-supplier-id cookie was not set in the expected time frame.');
                }

                console.log('Navigated to the Seller Portal. Waiting for the page to load...');
                console.log('Saving cookies...');
                // Save the authenticated state to state.json
                const storageState = await context.storageState();
                const statePath = path.join('/var/www/wb-back/storage/state', `${userId}.json`);
                fs.writeFileSync(statePath, JSON.stringify(storageState, null, 2));

                console.log(`Authentication state saved to ${statePath}`);

                // Store success in Redis cache using setCacheValue and return path to Laravel state
                await setCacheValue(
                    `auth_state_${userId}`,
                    {
                        success: true,
                        statePath,
                    },
                    3600
                );

                await notifyLaravel(userId, 'Успешно', { statePath });

                console.log(`Authentication job for user ${userId} completed.`);
            } catch (error: any) {
                console.error(`Error during authentication process: ${error.message}`);
                // Store failure in Redis cache using setCacheValue
                await setCacheValue(
                    `auth_state_${userId}`,
                    {
                        success: false,
                        error: error.message,
                    },
                    3600
                );
                await notifyLaravel(userId, 'Ошибка', { error: error.message });
            } finally {
                // Ensure that the context is properly closed after the task finishes
                if (context) {
                    await context.close(); // This will close the context and the associated pages
                    console.log('Browser context closed.');
                }
            }
        }
    );

    } catch (error: any) {
        console.error('Exception occurred during authentication:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
        return;
    }
};

/**
 * Asks the user for the verification code via Telegram.
 * @param {Page} page - Playwright page instance.
 * @param {string} telegramId - Telegram ID for communication.
 * @returns {Promise<boolean>} - Returns true if code submission is successful, else false.
 */
const askUserForCode = async (page: Page, telegramId: string): Promise<boolean> => {
    // Set action in cache
    await setCacheValue(`session_${telegramId}`, { action: 'collect_verification_code' }, 300);

    // Send a Telegram message requesting the verification code
    const messageSent = await sendMessageToTelegram(
        'Пожалуйста, введите код подтверждения для входа в Wildberries Seller Portal.',
        telegramId
    );
    if (!messageSent) {
        return false;
    }

    // Wait for the verification code from Redis
    console.log('Waiting for verification code from Redis...');
    let verificationCode: string;
    try {
        verificationCode = await waitForVerificationCode(telegramId);
        console.log(`Received verification code: ${verificationCode}`);
    } catch (error) {
        return false;
    }

    // Validate the verification code (ensure it's 6 digits)
    if (!/^\d{6}$/.test(verificationCode)) {
        return false;
    }

    // Fill the verification code into the form
    const digits = verificationCode;
    await page.locator('.InputCell-PB5beCCt55').first().fill(digits[0]);
    await page.locator('li:nth-child(2) > .InputCell-PB5beCCt55').fill(digits[1]);
    await page.locator('li:nth-child(3) > .InputCell-PB5beCCt55').fill(digits[2]);
    await page.locator('li:nth-child(4) > .InputCell-PB5beCCt55').fill(digits[3]);
    await page.locator('li:nth-child(5) > .InputCell-PB5beCCt55').fill(digits[4]);
    await page.locator('li:nth-child(6) > .InputCell-PB5beCCt55').fill(digits[5]);

    console.log('Filled verification code into the form.');

    // Submit the verification code
    console.log('Submitting the verification code...');
    const codeResult = await submitCode('captchaSolution', verificationCode, page, telegramId);
    return codeResult;
};

const authApiUrl = 'https://seller-auth.wildberries.ru/auth/v2/auth';
const maxRetries = 3;
let retries = 0;

/**
 * Submits the verification code to the authentication API.
 * @param {string} captchaSolution - The CAPTCHA solution identifier.
 * @param {string} code - The verification code entered by the user.
 * @param {Page} page - Playwright page instance.
 * @param {string} telegramId - Telegram ID for communication.
 * @returns {Promise<boolean>} - Returns true if submission is successful, else false.
 */
const submitCode = async (
    captchaSolution: string,
    code: string,
    page: Page,
    telegramId: string
): Promise<boolean> => {
    console.log('Submitting the verification code:', code);
    console.log('retry', retries, 'maxRetries', maxRetries);
    while (retries < maxRetries) {
        // Wait for the API response
        const response = await page.waitForResponse((response) =>
            response.url().includes(authApiUrl)
        );

        // Parse the response JSON
        const responseBody = await response.json();
        console.log('Auth API response:', responseBody);

        // Check if the response has "mismatch code" error
        if (responseBody.result === 6 || responseBody.error === 'mismatch code') {
            console.error('Code mismatch, prompting the user to try again.');

            retries += 1;

            if (retries >= maxRetries) {
                console.error('Maximum retries reached, exiting.');
                await sendMessageToTelegram(
                    'Превышено количество попыток ввода кода. Попробуйте позже.',
                    telegramId
                );
                break;
            }

            await sendMessageToTelegram('Неверный код. Попробуйте еще раз.', telegramId);

            console.log(`Retrying code submission (Attempt ${retries}/${maxRetries})...`);

            const newCodeResult = await askUserForCode(page, telegramId);
            if (newCodeResult) {
                return true;
            }
        } else {
            // Success case or unexpected response
            console.log('Code submission successful:', responseBody);
            return true;
        }
    }
    return false;
};

/**
 * Notifies the Laravel application about the authentication status.
 * @param {string} userId - The ID of the user.
 * @param {string} status - The status of the authentication ('Успешно' or 'Ошибка').
 * @param {object} payload - Additional data to send.
 */
const notifyLaravel = async (userId: string, status: string, payload: object): Promise<void> => {
    try {
        await axios.post('http://webserver/webhook/auth-completed', {
            userId,
            status,
            payload,
        });
    } catch (error: any) {
        console.error('Failed to notify Laravel:', error.message);
    }
};

/**
 * Handles CAPTCHA solving during the authentication process.
 * @param {Page} page - Playwright page instance.
 * @param telegramId
 * @returns {Promise<boolean>} - Returns true if CAPTCHA is handled successfully, else false.
 */
const handleCaptcha = async (page: Page, telegramId: string): Promise<boolean> => {
    // Wait for the window.CAPTCHA_CLIENT_ID to be defined
    await page.waitForFunction(() => (window as any).CAPTCHA_CLIENT_ID !== undefined);

    // Retrieve the value of window.CAPTCHA_CLIENT_ID
    const captchaClientId: string = await page.evaluate(() => (window as any).CAPTCHA_CLIENT_ID);
    console.log('CAPTCHA client ID:', captchaClientId);

    // Perform CAPTCHA Solving
    const task: TaskInput = await getPowTask(captchaClientId);

    const startTime = Date.now();
    const answers: PowAnswer[] = await solvePowTask(task);

    console.log('answers', answers);

    const captchaToken: string = await verifyPowAnswer(task, answers);
    console.log('captchaToken', captchaToken);

    // Define your known captcha_token
    const knownCaptchaToken = captchaToken;
    // Example: '1727347696|76cdbc0609b845fab0b31a5f3f1a346a|d71150af502218593a67fd916cb174c4f48c35d1dabfb38ef4d00d088fb9806b'

    // Intercept the POST request to the wb-captcha endpoint
    await page.route('**/auth/v2/code/wb-captcha', async (route) => {
        console.log('Intercepted CAPTCHA inside! request:', route.request().url());
        const request = route.request();

        if (request.method() === 'POST') {
            // Parse the existing request payload
            let postData: any;
            try {
                postData = await request.postDataJSON();
            } catch (error) {
                console.error('Failed to parse POST data:', error);
                return route.abort();
            }

            // Inject the known captcha_token
            postData.captcha_token = knownCaptchaToken;

            // Continue the request with the modified payload
            await route.continue({
                postData: JSON.stringify(postData),
                headers: {
                    ...request.headers(),
                    'Content-Type': 'application/json', // Ensure the content type is correct
                },
            });
        } else {
            // For non-POST requests, continue without modification
            await route.continue();
        }
    });

    const captchaApiUrl = 'https://seller-auth.wildberries.ru/auth/v2/code/wb-captcha';

    // Trigger the API request (e.g., submitting the phone number form)
    await page.getByTestId('submit-phone-button').click();

    // Wait for the specific API response
    const response: any = await page.waitForResponse((response) =>
        response.url().includes(captchaApiUrl) && response.status() === 200
    );

    // Parse the response JSON
    const responseBody = await response.json();

    if (responseBody.result === 4) {
        console.error('Captcha required:', responseBody);
        await sendMessageToTelegram(
            'Wildberries заблокировал вас на 3 часа. Попробуйте позже.',
            telegramId
        );
        // Handle CAPTCHA workflow (e.g., ask the user to solve the CAPTCHA)
        // You can also store or process any additional data from `responseBody.payload`
        return false;
    } else if (responseBody.result === 3) {
        console.log('Process result:', responseBody.result);
        // CAPTCHA required, wait for captcha response
        const verifyAnswerUrl = 'https://pow.wildberries.ru/api/v1/short/verify-answer';
        const getTaskUrl = 'https://pow.wildberries.ru/api/v1/short/get-task';

        // Wait for the get-task API response
        const responseTask: any = await page.waitForResponse((response) =>
            response.url().includes(getTaskUrl)
        );
        const responseBodyTask = await responseTask.json();
        console.log('Received response from get-task API:', responseBodyTask);

        // Wait for the verify-answer API response
        const responsePow: any = await page.waitForResponse((response) =>
            response.url().includes(verifyAnswerUrl)
        );
        const responseBodyPow = await responsePow.json();
        console.log('Received response from verify-answer API:', responseBodyPow);
        return true;
    } else if (responseBody.result === 0) {
        console.log('Process result:', responseBody.result);
        // CAPTCHA not required
        return true;
    } else {
        // Success case or unexpected response
        console.log('Unexpected response:', responseBody);
        await sendMessageToTelegram(
            `Ошибка: ${responseBody.error ?? 'Неизвестная ошибка'}`,
            telegramId
        );
        return false;
    }
};