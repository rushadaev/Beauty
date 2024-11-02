/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/controllers/acceptanceController.ts":
/*!*************************************************!*\
  !*** ./src/controllers/acceptanceController.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bookTimeslot: () => (/* binding */ bookTimeslot),
/* harmony export */   fetchTimeslots: () => (/* binding */ fetchTimeslots),
/* harmony export */   getPowTask: () => (/* binding */ getPowTask),
/* harmony export */   solvePowTask: () => (/* binding */ solvePowTask),
/* harmony export */   verifyPowAnswer: () => (/* binding */ verifyPowAnswer)
/* harmony export */ });
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils_pow_solveTask__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/pow/solveTask */ "./src/utils/pow/solveTask.ts");
// src/controllers/acceptanceController.ts




// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Ensure the functions are typed as RequestHandler
const fetchTimeslots = async (req, res) => {
    var _a;
    const { userId, preorderId } = req.query;
    if (!userId || !preorderId) {
        res.status(400).json({ error: 'Missing userId or preorderId parameter.' });
        return;
    }
    try {
        // Path to the user's state.json
        const statePath = path__WEBPACK_IMPORTED_MODULE_1___default().join('/var/www/wb-back/storage/state', `${userId}.json`);
        if (!fs__WEBPACK_IMPORTED_MODULE_0___default().existsSync(statePath)) {
            res.status(404).json({ error: 'User state not found.' });
            return;
        }
        const storageState = JSON.parse(fs__WEBPACK_IMPORTED_MODULE_0___default().readFileSync(statePath, 'utf-8'));
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
        const acceptanceCostsResponse = await axios__WEBPACK_IMPORTED_MODULE_2___default().post(acceptanceCostsUrl, acceptanceCostsData, { headers });
        const acceptanceCostsResult = (_a = acceptanceCostsResponse.data) === null || _a === void 0 ? void 0 : _a.result;
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
    }
    catch (error) {
        console.error('Error fetching acceptance costs:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};
const bookTimeslot = async (req, res) => {
    const { userId, preorderId, deliveryDate, warehouseId, monopalletCount } = req.body;
    if (!userId || !preorderId || !deliveryDate || !warehouseId) {
        res.status(400).json({ error: 'Missing required parameters.' });
        return;
    }
    try {
        // Path to the user's state.json
        const statePath = path__WEBPACK_IMPORTED_MODULE_1___default().join('/var/www/wb-back/storage/state', `${userId}.json`);
        if (!fs__WEBPACK_IMPORTED_MODULE_0___default().existsSync(statePath)) {
            res.status(404).json({ error: 'User state not found.' });
            return;
        }
        const storageState = JSON.parse(fs__WEBPACK_IMPORTED_MODULE_0___default().readFileSync(statePath, 'utf-8'));
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
            "params": Object.assign({ "preOrderId": Number(preorderId), "deliveryDate": deliveryDate, "warehouseId": warehouseId }, (monopalletCount !== undefined && { monopalletCount }) // Add monopalletCount if provided
            ),
            "jsonrpc": "2.0",
            "id": "json-rpc_36"
        };
        // **Perform CAPTCHA Solving**
        const task = await getPowTask();
        const startTime = Date.now();
        const answers = await solvePowTask(task);
        const latency = (Date.now() - startTime).toFixed(3); // Latency in milliseconds
        console.log('answers', answers);
        const captchaToken = await verifyPowAnswer(task, answers);
        console.log('captchaToken', captchaToken);
        // Include the CAPTCHA token and latency in headers
        const bookTimeslotHeaders = Object.assign(Object.assign({}, headers), { 'x-wb-captcha-token': captchaToken, 'x-wb-captcha-latency': latency });
        // Make the plan/add request with CAPTCHA headers
        const bookTimeslotResponse = await axios__WEBPACK_IMPORTED_MODULE_2___default().post(bookTimeslotUrl, bookTimeslotData, { headers: bookTimeslotHeaders });
        const bookTimeslotResult = bookTimeslotResponse.data.result;
        console.log('Book Timeslot Result:', bookTimeslotResult);
        res.status(200).json({
            message: 'Timeslot booked successfully.',
            data: bookTimeslotResult
        });
    }
    catch (error) {
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
const getPowTask = async (clientId = null) => {
    const actualClientId = clientId || 'e150c635-c6bb-4192-8046-97c2cf81e8b8'; // Use the actual client_id if required
    const getTaskUrl = `https://pow.wildberries.ru/api/v1/short/get-task?client_id=${actualClientId}`;
    const response = await axios__WEBPACK_IMPORTED_MODULE_2___default().get(getTaskUrl, {
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
const solvePowTask = async (task) => {
    var _a;
    let resultArray = [];
    try {
        const result = await (0,_utils_pow_solveTask__WEBPACK_IMPORTED_MODULE_3__.solveTaskInNode)(_utils_pow_solveTask__WEBPACK_IMPORTED_MODULE_3__.wasmPath, task);
        resultArray = (_a = JSON.parse(result)) === null || _a === void 0 ? void 0 : _a.answers;
        console.log('solveTask result:', resultArray);
    }
    catch (err) {
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
const verifyPowAnswer = async (task, answers) => {
    const verifyUrl = 'https://pow.wildberries.ru/api/v1/short/verify-answer';
    const data = {
        task,
        answers,
    };
    console.log('data', data);
    const response = await axios__WEBPACK_IMPORTED_MODULE_2___default().post(verifyUrl, JSON.stringify(data), {
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


/***/ }),

/***/ "./src/controllers/authController.ts":
/*!*******************************************!*\
  !*** ./src/controllers/authController.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   authenticateUser: () => (/* binding */ authenticateUser)
/* harmony export */ });
/* harmony import */ var _utils_clusterManager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/clusterManager */ "./src/utils/clusterManager.ts");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils_telegram__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/telegram */ "./src/utils/telegram.ts");
/* harmony import */ var _acceptanceController__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./acceptanceController */ "./src/controllers/acceptanceController.ts");
/* harmony import */ var _utils_redis_redisHelper__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/redis/redisHelper */ "./src/utils/redis/redisHelper.ts");
/* harmony import */ var _utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../utils/redis/cacheHelper */ "./src/utils/redis/cacheHelper.ts");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_7__);








// Exported Functions
/**
 * Authenticates a user by automating the login process, handling CAPTCHA, and verification codes.
 * Expects a JSON body: { userId, credentials, telegramId, headless }
 */
const authenticateUser = async (req, res) => {
    const { userId, telegramId, credentials, headless } = req.body;
    if (!userId || !credentials || !telegramId || !credentials.phone) {
        res.status(400).json({ error: 'Missing userId, telegramId, or credentials.' });
        return;
    }
    // Respond to Laravel immediately
    res.status(202).json({ message: 'Authentication job started.' });
    try {
        // Initialize the cluster
        const cluster = await (0,_utils_clusterManager__WEBPACK_IMPORTED_MODULE_0__.initializeCluster)();
        // Define the task for authentication
        await cluster.execute({
            userId,
            telegramId,
            credentials,
            headless: headless !== undefined ? headless : true,
        }, async ({ page, data }) => {
            const { userId, telegramId, credentials, headless } = data;
            let context;
            // Set custom headers
            const customHeaders = {
                'Content-Type': 'application/json;charset=UTF-8',
                Accept: '*/*',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
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
                        console.log('Auth Request:', request.method(), request.url(), request.headers(), request.postData());
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
                        const headers = Object.assign(Object.assign({}, request.headers()), { 'Content-Type': 'application/json' });
                        console.log('Original Headers:', request.headers());
                        console.log('Modified Headers:', headers);
                        await route.continue({
                            headers: headers,
                        });
                    }
                    else {
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
                let supplierIdCookie = undefined;
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
                const statePath = path__WEBPACK_IMPORTED_MODULE_2___default().join('/var/www/wb-back/storage/state', `${userId}.json`);
                fs__WEBPACK_IMPORTED_MODULE_1___default().writeFileSync(statePath, JSON.stringify(storageState, null, 2));
                console.log(`Authentication state saved to ${statePath}`);
                // Store success in Redis cache using setCacheValue and return path to Laravel state
                await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_6__.setCacheValue)(`auth_state_${userId}`, {
                    success: true,
                    statePath,
                }, 3600);
                await notifyLaravel(userId, 'Успешно', { statePath });
                console.log(`Authentication job for user ${userId} completed.`);
            }
            catch (error) {
                console.error(`Error during authentication process: ${error.message}`);
                // Store failure in Redis cache using setCacheValue
                await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_6__.setCacheValue)(`auth_state_${userId}`, {
                    success: false,
                    error: error.message,
                }, 3600);
                await notifyLaravel(userId, 'Ошибка', { error: error.message });
            }
            finally {
                // Ensure that the context is properly closed after the task finishes
                if (context) {
                    await context.close(); // This will close the context and the associated pages
                    console.log('Browser context closed.');
                }
            }
        });
    }
    catch (error) {
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
const askUserForCode = async (page, telegramId) => {
    // Set action in cache
    await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_6__.setCacheValue)(`session_${telegramId}`, { action: 'collect_verification_code' }, 300);
    // Send a Telegram message requesting the verification code
    const messageSent = await (0,_utils_telegram__WEBPACK_IMPORTED_MODULE_3__.sendMessageToTelegram)('Пожалуйста, введите код подтверждения для входа в Wildberries Seller Portal.', telegramId);
    if (!messageSent) {
        return false;
    }
    // Wait for the verification code from Redis
    console.log('Waiting for verification code from Redis...');
    let verificationCode;
    try {
        verificationCode = await (0,_utils_redis_redisHelper__WEBPACK_IMPORTED_MODULE_5__.waitForVerificationCode)(telegramId);
        console.log(`Received verification code: ${verificationCode}`);
    }
    catch (error) {
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
const submitCode = async (captchaSolution, code, page, telegramId) => {
    console.log('Submitting the verification code:', code);
    console.log('retry', retries, 'maxRetries', maxRetries);
    while (retries < maxRetries) {
        // Wait for the API response
        const response = await page.waitForResponse((response) => response.url().includes(authApiUrl));
        // Parse the response JSON
        const responseBody = await response.json();
        console.log('Auth API response:', responseBody);
        // Check if the response has "mismatch code" error
        if (responseBody.result === 6 || responseBody.error === 'mismatch code') {
            console.error('Code mismatch, prompting the user to try again.');
            retries += 1;
            if (retries >= maxRetries) {
                console.error('Maximum retries reached, exiting.');
                await (0,_utils_telegram__WEBPACK_IMPORTED_MODULE_3__.sendMessageToTelegram)('Превышено количество попыток ввода кода. Попробуйте позже.', telegramId);
                break;
            }
            await (0,_utils_telegram__WEBPACK_IMPORTED_MODULE_3__.sendMessageToTelegram)('Неверный код. Попробуйте еще раз.', telegramId);
            console.log(`Retrying code submission (Attempt ${retries}/${maxRetries})...`);
            const newCodeResult = await askUserForCode(page, telegramId);
            if (newCodeResult) {
                return true;
            }
        }
        else {
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
const notifyLaravel = async (userId, status, payload) => {
    try {
        await axios__WEBPACK_IMPORTED_MODULE_7___default().post('http://webserver/webhook/auth-completed', {
            userId,
            status,
            payload,
        });
    }
    catch (error) {
        console.error('Failed to notify Laravel:', error.message);
    }
};
/**
 * Handles CAPTCHA solving during the authentication process.
 * @param {Page} page - Playwright page instance.
 * @param telegramId
 * @returns {Promise<boolean>} - Returns true if CAPTCHA is handled successfully, else false.
 */
const handleCaptcha = async (page, telegramId) => {
    var _a;
    // Wait for the window.CAPTCHA_CLIENT_ID to be defined
    await page.waitForFunction(() => window.CAPTCHA_CLIENT_ID !== undefined);
    // Retrieve the value of window.CAPTCHA_CLIENT_ID
    const captchaClientId = await page.evaluate(() => window.CAPTCHA_CLIENT_ID);
    console.log('CAPTCHA client ID:', captchaClientId);
    // Perform CAPTCHA Solving
    const task = await (0,_acceptanceController__WEBPACK_IMPORTED_MODULE_4__.getPowTask)(captchaClientId);
    const startTime = Date.now();
    const answers = await (0,_acceptanceController__WEBPACK_IMPORTED_MODULE_4__.solvePowTask)(task);
    console.log('answers', answers);
    const captchaToken = await (0,_acceptanceController__WEBPACK_IMPORTED_MODULE_4__.verifyPowAnswer)(task, answers);
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
            let postData;
            try {
                postData = await request.postDataJSON();
            }
            catch (error) {
                console.error('Failed to parse POST data:', error);
                return route.abort();
            }
            // Inject the known captcha_token
            postData.captcha_token = knownCaptchaToken;
            // Continue the request with the modified payload
            await route.continue({
                postData: JSON.stringify(postData),
                headers: Object.assign(Object.assign({}, request.headers()), { 'Content-Type': 'application/json' }),
            });
        }
        else {
            // For non-POST requests, continue without modification
            await route.continue();
        }
    });
    const captchaApiUrl = 'https://seller-auth.wildberries.ru/auth/v2/code/wb-captcha';
    // Trigger the API request (e.g., submitting the phone number form)
    await page.getByTestId('submit-phone-button').click();
    // Wait for the specific API response
    const response = await page.waitForResponse((response) => response.url().includes(captchaApiUrl) && response.status() === 200);
    // Parse the response JSON
    const responseBody = await response.json();
    if (responseBody.result === 4) {
        console.error('Captcha required:', responseBody);
        await (0,_utils_telegram__WEBPACK_IMPORTED_MODULE_3__.sendMessageToTelegram)('Wildberries заблокировал вас на 3 часа. Попробуйте позже.', telegramId);
        // Handle CAPTCHA workflow (e.g., ask the user to solve the CAPTCHA)
        // You can also store or process any additional data from `responseBody.payload`
        return false;
    }
    else if (responseBody.result === 3) {
        console.log('Process result:', responseBody.result);
        // CAPTCHA required, wait for captcha response
        const verifyAnswerUrl = 'https://pow.wildberries.ru/api/v1/short/verify-answer';
        const getTaskUrl = 'https://pow.wildberries.ru/api/v1/short/get-task';
        // Wait for the get-task API response
        const responseTask = await page.waitForResponse((response) => response.url().includes(getTaskUrl));
        const responseBodyTask = await responseTask.json();
        console.log('Received response from get-task API:', responseBodyTask);
        // Wait for the verify-answer API response
        const responsePow = await page.waitForResponse((response) => response.url().includes(verifyAnswerUrl));
        const responseBodyPow = await responsePow.json();
        console.log('Received response from verify-answer API:', responseBodyPow);
        return true;
    }
    else if (responseBody.result === 0) {
        console.log('Process result:', responseBody.result);
        // CAPTCHA not required
        return true;
    }
    else {
        // Success case or unexpected response
        console.log('Unexpected response:', responseBody);
        await (0,_utils_telegram__WEBPACK_IMPORTED_MODULE_3__.sendMessageToTelegram)(`Ошибка: ${(_a = responseBody.error) !== null && _a !== void 0 ? _a : 'Неизвестная ошибка'}`, telegramId);
        return false;
    }
};


/***/ }),

/***/ "./src/controllers/draftsController.ts":
/*!*********************************************!*\
  !*** ./src/controllers/draftsController.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   listDrafts: () => (/* binding */ listDrafts)
/* harmony export */ });
/* harmony import */ var _services_wildberriesService__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../services/wildberriesService */ "./src/services/wildberriesService.ts");
// nodejs-server/controllers/draftsController.ts

/**
 * List Drafts Endpoint
 * Expects a query parameter: userId
 */
const listDrafts = async (req, res) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid userId parameter.' });
        return;
    }
    try {
        const drafts = await (0,_services_wildberriesService__WEBPACK_IMPORTED_MODULE_0__.getDraftsForUser)(userId);
        res.status(200).json({
            message: `Found ${drafts.length} drafts with barcodeQuantity > 0.`,
            data: drafts,
        });
        return;
    }
    catch (error) {
        console.error('Error fetching drafts data:', error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
        return;
    }
};


/***/ }),

/***/ "./src/controllers/ordersController.ts":
/*!*********************************************!*\
  !*** ./src/controllers/ordersController.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createOrder: () => (/* binding */ createOrder),
/* harmony export */   listWarehouses: () => (/* binding */ listWarehouses)
/* harmony export */ });
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _services_wildberriesService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../services/wildberriesService */ "./src/services/wildberriesService.ts");
// nodejs-server/controllers/ordersController.ts




/**
 * Handler to create an order.
 * Expects a JSON body: { userId, draftId, warehouseId, boxTypeMask }
 */
const createOrder = async (req, res) => {
    const { userId, draftId, warehouseId, boxTypeMask } = req.body;
    // Validate request body
    if (!userId || !draftId || !warehouseId || !boxTypeMask) {
        res.status(400).json({ error: 'Missing userId, draftId, warehouseId, or boxTypeMask in request body.' });
        return;
    }
    try {
        const response = await (0,_services_wildberriesService__WEBPACK_IMPORTED_MODULE_3__.createOrderRequest)(userId, draftId, warehouseId, boxTypeMask);
        // Respond with success and the preorderID
        res.status(200).json({
            message: 'Order created successfully.',
            preorderID: response.preorderID,
        });
    }
    catch (error) {
        console.error('Error during order creation:', error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};
/**
 * Handler to list warehouses.
 * Expects query parameters: { userId, draftId }
 */
const listWarehouses = async (req, res) => {
    const { userId, draftId } = req.query;
    // Validate query parameters
    if (typeof userId !== 'string' || typeof draftId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid userId or draftId in query parameters.' });
        return;
    }
    try {
        // Construct the path to the user's state.json
        const statePath = path__WEBPACK_IMPORTED_MODULE_1__.join('/var/www/wb-back/storage/state', `${userId}.json`);
        // Check if the state file exists
        if (!fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(statePath)) {
            res.status(404).json({ error: 'User state not found.' });
            return;
        }
        // Read and parse the storage state
        const storageStateRaw = fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync(statePath, 'utf-8');
        const storageState = JSON.parse(storageStateRaw);
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
        const recommendationsResponse = await axios__WEBPACK_IMPORTED_MODULE_2___default().post(recommendationsUrl, recommendationsData, { headers });
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
    }
    catch (error) {
        console.error('Error during warehouse fetch:', error.message);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};


/***/ }),

/***/ "./src/routes/acceptance.ts":
/*!**********************************!*\
  !*** ./src/routes/acceptance.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../controllers/acceptanceController */ "./src/controllers/acceptanceController.ts");
// acceptance.ts


const router = (0,express__WEBPACK_IMPORTED_MODULE_0__.Router)();
/**
 * @route   GET /api/acceptance/fetchTimeslots
 * @desc    Fetch available timeslots
 * @query   userId: string
 *          preorderId: string
 */
router.get('/fetchTimeslots', _controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_1__.fetchTimeslots);
/**
 * @route   POST /api/acceptance/bookTimeslot
 * @desc    Book a specific timeslot
 * @body    userId: string
 *          preorderId: string
 *          timeslotId: string
 */
router.post('/bookTimeslot', _controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_1__.bookTimeslot);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (router);


/***/ }),

/***/ "./src/routes/auth.ts":
/*!****************************!*\
  !*** ./src/routes/auth.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _controllers_authController__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../controllers/authController */ "./src/controllers/authController.ts");
// nodejs-server/routes/authRoutes.ts


const router = (0,express__WEBPACK_IMPORTED_MODULE_0__.Router)();
// POST /api/auth/authenticate
router.post('/authenticate', _controllers_authController__WEBPACK_IMPORTED_MODULE_1__.authenticateUser);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (router);


/***/ }),

/***/ "./src/routes/drafts.ts":
/*!******************************!*\
  !*** ./src/routes/drafts.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _controllers_draftsController__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../controllers/draftsController */ "./src/controllers/draftsController.ts");


const router = (0,express__WEBPACK_IMPORTED_MODULE_0__.Router)();
// GET /api/drafts/list
router.get('/list', _controllers_draftsController__WEBPACK_IMPORTED_MODULE_1__.listDrafts);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (router);


/***/ }),

/***/ "./src/routes/orders.ts":
/*!******************************!*\
  !*** ./src/routes/orders.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _controllers_ordersController__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../controllers/ordersController */ "./src/controllers/ordersController.ts");
// nodejs-server/routes/ordersRoutes.ts


const router = (0,express__WEBPACK_IMPORTED_MODULE_0__.Router)();
// POST /api/orders/create
router.post('/create', _controllers_ordersController__WEBPACK_IMPORTED_MODULE_1__.createOrder);
// GET /api/orders/warehouses
router.get('/warehouses', _controllers_ordersController__WEBPACK_IMPORTED_MODULE_1__.listWarehouses);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (router);


/***/ }),

/***/ "./src/services/WarehouseService.ts":
/*!******************************************!*\
  !*** ./src/services/WarehouseService.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _wildberriesSuppliesApi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./wildberriesSuppliesApi */ "./src/services/wildberriesSuppliesApi.ts");

class WarehouseService {
    async getWarehouses(page = 1) {
        const warehouses = await _wildberriesSuppliesApi__WEBPACK_IMPORTED_MODULE_0__["default"].getWarehouses();
        // Define the prioritized warehouses in the desired order
        const prioritizedWarehouses = [
            { name: 'Коледино', id: 507 },
            { name: 'Электросталь', id: 120762 },
            { name: 'Подольск', id: 117501 },
            { name: 'Подольск 3', id: 218623 },
            { name: 'Подольск 4', id: 301229 },
            { name: 'Кузнецк', id: 302335 },
            { name: 'Казань', id: 117986 },
            { name: 'Краснодар (Тихорецкая)', id: 130744 },
            { name: 'Тула', id: 206348 },
            { name: 'Белые Столбы', id: 206236 },
            { name: 'Невинномысск', id: 208277 },
            { name: 'Екатеринбург - Испытателей 14г', id: 1733 },
            { name: 'Екатеринбург - Перспективный 12/2', id: 300571 },
            { name: 'Новосибирск', id: 686 },
            { name: 'Чашниково', id: 321932 },
            { name: 'Рязань (Тюшевское)', id: 301760 },
        ];
        // Separate and sort prioritized warehouses
        const prioritizedList = [];
        const otherWarehouses = [];
        for (const pWarehouse of prioritizedWarehouses) {
            for (const warehouse of warehouses) {
                if (warehouse.ID === pWarehouse.id && warehouse.name === pWarehouse.name) {
                    prioritizedList.push(warehouse);
                    break;
                }
            }
        }
        for (const warehouse of warehouses) {
            if (!prioritizedList.some(p => p.ID === warehouse.ID)) {
                otherWarehouses.push(warehouse);
            }
        }
        // Merge prioritized warehouses with the rest
        const sortedWarehouses = [...prioritizedList, ...otherWarehouses];
        // Paginate warehouses
        const perPage = 20;
        const totalPages = Math.ceil(sortedWarehouses.length / perPage);
        page = Math.max(1, Math.min(totalPages, page));
        const start = (page - 1) * perPage;
        const currentWarehouses = sortedWarehouses.slice(start, start + perPage);
        // Prepare response data for Telegram in two columns
        const keyboardButtons = [];
        for (let i = 0; i < currentWarehouses.length; i += 2) {
            const row = [
                {
                    text: currentWarehouses[i].name,
                    callback_data: `select_warehouse_${currentWarehouses[i].ID}`
                }
            ];
            if (i + 1 < currentWarehouses.length) {
                row.push({
                    text: currentWarehouses[i + 1].name,
                    callback_data: `select_warehouse_${currentWarehouses[i + 1].ID}`
                });
            }
            keyboardButtons.push(row);
        }
        // Add navigation buttons
        const navigationButtons = [];
        if (page > 1) {
            navigationButtons.push({ text: '← Назад', callback_data: `warehouses_prev` });
        }
        if (page < totalPages) {
            navigationButtons.push({ text: 'Вперед →', callback_data: `warehouses_next` });
        }
        if (navigationButtons.length) {
            keyboardButtons.push(navigationButtons);
        }
        const message = 'Выберите склад:'; // Пока не используется, но может пригодиться в будущем
        return {
            message,
            keyboard: keyboardButtons
        };
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new WarehouseService());


/***/ }),

/***/ "./src/services/authService.ts":
/*!*************************************!*\
  !*** ./src/services/authService.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   authenticateUserService: () => (/* binding */ authenticateUserService)
/* harmony export */ });
/* harmony import */ var _jobQueue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./jobQueue */ "./src/services/jobQueue.ts");
// src/services/authService.ts

// Service function to enqueue authentication job
const authenticateUserService = async (data) => {
    const { userId, telegramId, credentials, headless } = data;
    if (!userId || !credentials || !telegramId || !credentials.phone) {
        return { success: false, message: 'Missing userId, telegramId, or credentials.' };
    }
    try {
        // Add the job to the Bull queue
        await _jobQueue__WEBPACK_IMPORTED_MODULE_0__.authQueue.add(data, {
            backoff: 5000, // Wait 5 seconds before retrying
            removeOnComplete: true, // Remove job from queue on completion
            removeOnFail: true, // Remove failed jobs for inspection
        });
        return { success: true, message: 'Authentication job enqueued.' };
    }
    catch (error) {
        console.error('Failed to enqueue authentication job:', error.message);
        return { success: false, message: 'Failed to enqueue authentication job.' };
    }
};


/***/ }),

/***/ "./src/services/jobQueue.ts":
/*!**********************************!*\
  !*** ./src/services/jobQueue.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   authQueue: () => (/* binding */ authQueue)
/* harmony export */ });
/* harmony import */ var bull__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! bull */ "bull");
/* harmony import */ var bull__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(bull__WEBPACK_IMPORTED_MODULE_0__);
// src/services/jobQueue.ts

// Initialize Bull queue for authentication jobs
const authQueue = new (bull__WEBPACK_IMPORTED_MODULE_0___default())('authentication', {
    redis: {
        host: 'redis', // Update with your Redis host
        port: 6379, // Update with your Redis port
    },
});


/***/ }),

/***/ "./src/services/laravelService.ts":
/*!****************************************!*\
  !*** ./src/services/laravelService.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
// src/services/UserService.ts


class LaravelService {
    constructor() {
        const apiUrl = process.env.LARAVEL_API_URL;
        if (!apiUrl) {
            throw new Error('LARAVEL_API_URL is not defined in environment variables.');
        }
        this.laravelApiUrl = apiUrl;
    }
    /**
     * Retrieves a user by their Telegram ID.
     * Utilizes CacheService.rememberCacheValue for caching.
     *
     * @param telegramId - The Telegram ID of the user.
     * @returns A Promise that resolves to the User object or null if not found.
     */
    async getUserByTelegramId(telegramId) {
        const cacheKey = `user_telegram_id_${telegramId}`;
        try {
            const user = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchUserFromApi(telegramId), 3600 // Cache expiration set to 1 hour (3600 seconds)
            );
            console.log(`User fetched for Telegram ID ${telegramId}:`, user);
            return user;
        }
        catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }
    /**
     * Retrieves paginated notifications for a user by their Telegram ID.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param page - The page number to retrieve.
     * @param perPage - Number of notifications per page.
     * @param type - Either 'search' or 'booking'.
     * @returns A Promise that resolves to PaginatedNotifications or null if not found.
     */
    async getNotificationsByTelegramId(telegramId, page = 1, perPage = 1, type = 'search') {
        const cacheKey = `notifications_telegram_id_${telegramId}_page_${page}`;
        try {
            const notifications = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchNotificationsFromApi(telegramId, page, perPage, type), 60 // Cache expiration set to 2 hours (7200 seconds)
            );
            return notifications;
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            return null;
        }
    }
    async createNotificationByTelegramId(telegramId, settings) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/notifications/telegram/${telegramId}`, {
                settings
            });
            return response.data;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Error creating notification');
        }
    }
    /**
     * Creates a cabinet for a user identified by their Telegram ID.
     * Utilizes caching to store and update the user data.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param name - The name of the cabinet to be created.
     * @param phoneNumber - The phone number associated with the cabinet.
     * @param userId
     * @param statePath
     * @returns A Promise that resolves to the updated User object or null if an error occurs.
     */
    async createCabinetByTelegramId(telegramId, name, phoneNumber, userId, statePath) {
        const cacheKey = `user_new_cabinet_${telegramId}`;
        try {
            // Prepare the payload for the POST request
            const payload = {
                name,
                phone_number: phoneNumber,
                user_id: userId,
                state_path: statePath,
            };
            // Make the POST request to create a cabinet
            const response = await this.createCabinet(`/cabinets/telegram/${telegramId}`, payload);
            // Extract the updated user from the response
            const updatedUser = (response === null || response === void 0 ? void 0 : response.user) || null;
            // Update the cache with the new user data
            await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].set(cacheKey, updatedUser, 3600); // Cache expires in 1 hour
            console.log(`Cabinet "${name}" created for Telegram ID ${telegramId}. Updated user data cached.`);
            return updatedUser;
        }
        catch (error) {
            // Handle errors (e.g., user not found, validation errors)
            console.error(`Error creating cabinet for Telegram ID ${telegramId}:`, error);
            // Optionally, you can handle specific error types here
            // For example, if using Axios, you can check error.response.status
            return null;
        }
    }
    async deleteCabinetByTelegramId(telegramId, cabinetId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default()["delete"](`${this.laravelApiUrl}/cabinets/telegram/${telegramId}/${cabinetId}`);
            return response.data;
        }
        catch (error) {
            console.error('Error deleting cabinet:', error);
            throw new Error('Error deleting cabinet');
        }
    }
    async updateCabinetByTelegramId(telegramId, cabinetId, payload) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/cabinets/telegram/${telegramId}/${cabinetId}`, {
                name: payload.name,
                settings: payload.settings
            });
            return response.data;
        }
        catch (error) {
            console.error('Error updating cabinet:', error);
            throw new Error('Error updating cabinet');
        }
    }
    async deleteNotification(notificationId) {
        try {
            await axios__WEBPACK_IMPORTED_MODULE_0___default()["delete"](`${this.laravelApiUrl}/notifications/telegram/${notificationId}`);
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            throw new Error('Error deleting notification');
        }
    }
    /**
     * Fetches the user data from the Laravel API.
     *
     * @param telegramId - The Telegram ID of the user.
     * @returns A Promise that resolves to the User object.
     */
    async fetchUserFromApi(telegramId) {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/users/telegram/${telegramId}`);
        return response.data;
    }
    /**
     * Fetches paginated notifications from the Laravel API.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param page - The page number to retrieve.
     * @param perPage - Number of notifications per page.
     * @param type - Either 'search' or 'booking'.
     * @returns A Promise that resolves to PaginatedNotifications.
     */
    async fetchNotificationsFromApi(telegramId, page, perPage, type) {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/notifications/telegram/${telegramId}`, {
            params: {
                page,
                per_page: perPage,
                type
            },
        });
        return response.data;
    }
    /**
     * Makes a POST request to create a cabinet.
     *
     * @param url - The API endpoint URL.
     * @param data - The data to be sent in the request body.
     * @returns A Promise that resolves to the response data.
     * @template T - The type of the response data.
     * @private
     * */
    async createCabinet(url, data) {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}${url}`, data);
        return response.data;
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new LaravelService());


/***/ }),

/***/ "./src/services/wildberriesService.ts":
/*!********************************************!*\
  !*** ./src/services/wildberriesService.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createOrderRequest: () => (/* binding */ createOrderRequest),
/* harmony export */   getDraftsForUser: () => (/* binding */ getDraftsForUser)
/* harmony export */ });
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_2__);



const getDraftsForUser = async (userId) => {
    // Path to the user's state.json
    const statePath = path__WEBPACK_IMPORTED_MODULE_0___default().join('/var/www/wb-back/storage/state', `${userId}.json`);
    if (!fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(statePath)) {
        throw new Error('User state not found.');
    }
    const storageState = JSON.parse(fs__WEBPACK_IMPORTED_MODULE_1___default().readFileSync(statePath, 'utf-8'));
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Origin': 'https://seller.wildberries.ru',
        'Referer': 'https://seller.wildberries.ru/',
        'Accept-Language': 'ru,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    };
    // Make the API request using axios
    const response = await axios__WEBPACK_IMPORTED_MODULE_2___default().post(apiUrl, data, { headers });
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
const createOrderRequest = async (cabinetId, draftId, warehouseId, boxTypeMask) => {
    var _a, _b;
    // Validate request body
    if (!cabinetId || !draftId || !warehouseId || !boxTypeMask) {
        throw new Error('Missing required parameters.');
    }
    try {
        // Construct the path to the user's state.json
        const statePath = path__WEBPACK_IMPORTED_MODULE_0___default().join('/var/www/wb-back/storage/state', `${cabinetId}.json`);
        // Check if the state file exists
        if (!fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(statePath)) {
            throw new Error('User state not found.');
        }
        // Read and parse the storage state
        const storageStateRaw = fs__WEBPACK_IMPORTED_MODULE_1___default().readFileSync(statePath, 'utf-8');
        const storageState = JSON.parse(storageStateRaw);
        // Extract cookies and construct the Cookie header
        const cookies = storageState.cookies;
        let cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        // Find origin data for Wildberries seller
        const originData = storageState.origins.find(origin => origin.origin === 'https://seller.wildberries.ru');
        if (!originData) {
            throw new Error('Origin data not found in state.');
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
        const createSupplyResponse = await axios__WEBPACK_IMPORTED_MODULE_2___default().post(createSupplyUrl, createSupplyData, { headers });
        const createSupplyResult = createSupplyResponse.data;
        // Extract preorderID from the response
        const preorderID = (_b = (_a = createSupplyResult === null || createSupplyResult === void 0 ? void 0 : createSupplyResult.result) === null || _a === void 0 ? void 0 : _a.ids[0]) === null || _b === void 0 ? void 0 : _b.Id;
        console.log('createSupplyResult:', createSupplyResult);
        // Respond with success and the preorderID
        return {
            message: 'Order created successfully.',
            preorderID: preorderID,
        };
    }
    catch (error) {
        console.error('Error during order creation:', error.message);
        throw new Error('Internal Server Error.');
    }
};


/***/ }),

/***/ "./src/services/wildberriesSuppliesApi.ts":
/*!************************************************!*\
  !*** ./src/services/wildberriesSuppliesApi.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
// src/services/UserService.ts


class WildberriesSuppliesApi {
    constructor() {
        const apiUrl = process.env.LARAVEL_API_URL;
        if (!apiUrl) {
            throw new Error('LARAVEL_API_URL is not defined in environment variables.');
        }
        this.laravelApiUrl = apiUrl;
    }
    /**
     * Retrieves paginated notifications for a user by their Telegram ID.
     *
     * @param telegramId - The Telegram ID of the user.
     * @param page - The page number to retrieve.
     * @param perPage - Number of notifications per page.
     * @returns A Promise that resolves to PaginatedNotifications or null if not found.
     */
    async getWarehouses() {
        const cacheKey = `warehouses`;
        try {
            return await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchWarehousesFromApi(), 3600 * 24 // Cache expiration set to 2 hours (7200 seconds)
            );
        }
        catch (error) {
            console.error('Error fetching warehouses:', error);
            return null;
        }
    }
    /**
    * Fetches warehouses data from the Laravel API.
    *
    * @returns A Promise that resolves to the User object.
    */
    async fetchWarehousesFromApi() {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/warehouses`);
        return response.data.data;
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new WildberriesSuppliesApi());


/***/ }),

/***/ "./src/telegraf/controllers/telegramController.ts":
/*!********************************************************!*\
  !*** ./src/telegraf/controllers/telegramController.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createUserCabinetAndNotify: () => (/* binding */ createUserCabinetAndNotify),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   sendMessageToClient: () => (/* binding */ sendMessageToClient)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_warehouseBot__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../services/warehouseBot */ "./src/telegraf/services/warehouseBot.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @telegraf/session/redis */ "@telegraf/session/redis");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
/* harmony import */ var _services_scenes_mainScene__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../services/scenes/mainScene */ "./src/telegraf/services/scenes/mainScene.ts");
/* harmony import */ var _services_scenes_subscriptionScene__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../services/scenes/subscriptionScene */ "./src/telegraf/services/scenes/subscriptionScene.ts");
/* harmony import */ var _services_scenes_autoBookingScene__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../services/scenes/autoBookingScene */ "./src/telegraf/services/scenes/autoBookingScene.ts");
/* harmony import */ var _services_scenes_searchRequestsScene__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../services/scenes/searchRequestsScene */ "./src/telegraf/services/scenes/searchRequestsScene.ts");
/* harmony import */ var _services_scenes_createCabinetScene__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../services/scenes/createCabinetScene */ "./src/telegraf/services/scenes/createCabinetScene.ts");
/* harmony import */ var _services_scenes_searchSlotsScene__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../services/scenes/searchSlotsScene */ "./src/telegraf/services/scenes/searchSlotsScene.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_cabinetGate__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../utils/cabinetGate */ "./src/telegraf/utils/cabinetGate.ts");
/* harmony import */ var _services_scenes_showCabinetsScene__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../services/scenes/showCabinetsScene */ "./src/telegraf/services/scenes/showCabinetsScene.ts");
/* harmony import */ var _services_scenes_reauthCabinetScene__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../services/scenes/reauthCabinetScene */ "./src/telegraf/services/scenes/reauthCabinetScene.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_15__);


 // Ensure correct path

// Import mainScene from the new file












// If you have other scenes like subscriptionScene, consider importing them similarly
const botToken = process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW;
const bot = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Telegraf(botToken);
const warehouseBot = new _services_warehouseBot__WEBPACK_IMPORTED_MODULE_1__["default"](bot);
const store = (0,_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3__.Redis)({
    url: 'redis://redis:6379/2',
});
// Initialize the stage with imported scenes
const stage = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.Stage([_services_scenes_mainScene__WEBPACK_IMPORTED_MODULE_5__.mainScene, _services_scenes_subscriptionScene__WEBPACK_IMPORTED_MODULE_6__["default"], _services_scenes_autoBookingScene__WEBPACK_IMPORTED_MODULE_7__["default"], _services_scenes_searchRequestsScene__WEBPACK_IMPORTED_MODULE_8__.searchRequestsScene, _services_scenes_createCabinetScene__WEBPACK_IMPORTED_MODULE_9__["default"], _services_scenes_searchSlotsScene__WEBPACK_IMPORTED_MODULE_10__["default"], _services_scenes_showCabinetsScene__WEBPACK_IMPORTED_MODULE_13__["default"], _services_scenes_reauthCabinetScene__WEBPACK_IMPORTED_MODULE_14__["default"]]);
// Middleware to log incoming updates
bot.use((0,telegraf__WEBPACK_IMPORTED_MODULE_0__.session)({ store }));
bot.use(stage.middleware());
bot.use(async (ctx, next) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Received update', { update: ctx.update });
    await next();
});
// Handle /start command
bot.start(async (ctx) => {
    const startPayload = ctx.payload;
    if (startPayload) {
        if (startPayload === 'autobooking') {
            await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_12__.cabinetGate)(ctx, 'autoBookingWizard');
        }
        await ctx.scene.enter('main');
    }
    else {
        await ctx.scene.enter('main');
    }
});
// Handle 'mainmenu' action
bot.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('🏦Главная');
});
// Handle /ping command
bot.command('ping', (ctx) => {
    ctx.reply('pong!');
});
bot.command('autobooking', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_12__.cabinetGate)(ctx, 'autoBookingWizard');
});
_services_scenes_mainScene__WEBPACK_IMPORTED_MODULE_5__.mainScene.action('payments', async (ctx) => {
    await ctx.scene.enter('subscriptionWizard');
});
bot.on('callback_query', async (ctx) => {
    await ctx.answerCbQuery('👌');
});
bot.action('autobooking', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_12__.cabinetGate)(ctx, 'autoBookingWizard');
});
const createUserCabinetAndNotify = async (chatId, message, payload) => {
    const telegramId = payload.telegramId;
    const name = payload.credentials.name;
    const phoneNumber = payload.credentials.phone;
    const userId = payload.userId;
    const statePath = payload.credentials.statePath;
    try {
        const checkCabinetInCache = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_4__["default"].get(`reauth_cabinet_${telegramId}`);
        if (checkCabinetInCache) {
            const cabinet = JSON.parse(checkCabinetInCache);
            cabinet.settings.statePath = statePath;
            cabinet.is_active = true;
            await _services_laravelService__WEBPACK_IMPORTED_MODULE_11__["default"].updateCabinetByTelegramId(telegramId, cabinet.id, { name: cabinet.name, settings: cabinet.settings });
            await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_4__["default"].forget(`reauth_cabinet_${telegramId}`);
        }
        else {
            const cabinet = await _services_laravelService__WEBPACK_IMPORTED_MODULE_11__["default"].createCabinetByTelegramId(telegramId, name, phoneNumber, userId, statePath);
        }
    }
    catch (error) {
        console.error('Error creating user cabinet:', error);
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
        ]);
        await bot.telegram.sendMessage(chatId, '⚠️ Ошибка создания кабинета. Пожалуйста, попробуйте еще раз.', keyboard);
    }
    const messageText = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_15__.fmt) `🎉 Авторизация прошла успешно!

🫡 Данные вашего кабинета

📝 Название кабинета: ${name} 
📞 Номер телефона: ${phoneNumber};
    `;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📦 Перейти в автобронирование', 'autobooking')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    await bot.telegram.sendMessage(chatId, messageText, keyboard);
};
const sendMessageToClient = async (chatId, message, isButtonAvailable = true) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    try {
        const response = await bot.telegram.sendMessage(chatId, message, isButtonAvailable ? keyboard : null);
        console.log('Message sent to Telegram successfully!', response);
        return true;
    }
    catch (error) {
        console.error('Exception occurred while sending message:', error.message);
        return false;
    }
};
// Export the bot instance
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (bot);


/***/ }),

/***/ "./src/telegraf/services/scenes/actions/autoBookingActions.ts":
/*!********************************************************************!*\
  !*** ./src/telegraf/services/scenes/actions/autoBookingActions.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   sendBoxTypeSelection: () => (/* binding */ sendBoxTypeSelection),
/* harmony export */   sendCabinetSelection: () => (/* binding */ sendCabinetSelection),
/* harmony export */   sendCoefficientSelection: () => (/* binding */ sendCoefficientSelection),
/* harmony export */   sendCustomDatePrompt: () => (/* binding */ sendCustomDatePrompt),
/* harmony export */   sendDateSelection: () => (/* binding */ sendDateSelection),
/* harmony export */   sendDraftSelection: () => (/* binding */ sendDraftSelection),
/* harmony export */   sendErrorMessage: () => (/* binding */ sendErrorMessage),
/* harmony export */   sendFinalConfirmation: () => (/* binding */ sendFinalConfirmation),
/* harmony export */   sendInstructions: () => (/* binding */ sendInstructions),
/* harmony export */   sendOrderConfirmation: () => (/* binding */ sendOrderConfirmation),
/* harmony export */   sendPalletCountPrompt: () => (/* binding */ sendPalletCountPrompt),
/* harmony export */   sendSearchSlotMessage: () => (/* binding */ sendSearchSlotMessage),
/* harmony export */   sendWarehouseSelection: () => (/* binding */ sendWarehouseSelection)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_WarehouseService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/WarehouseService */ "./src/services/WarehouseService.ts");
/* harmony import */ var _services_wildberriesService__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../services/wildberriesService */ "./src/services/wildberriesService.ts");
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
/* harmony import */ var _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../utils/wildberries/consts */ "./src/utils/wildberries/consts.ts");
/* harmony import */ var _utils_dateUtils__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../../utils/dateUtils */ "./src/utils/dateUtils.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
// ./scenes/autoBookingActions.ts









// Default buttons with Back and Main Menu
const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const sendSearchSlotMessage = async (ctx) => {
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Поиск слотов
    
Поиск слотов — запуск отслеживания по вашим параметрам без автоматического бронирования. Как только нужный слот будет найден, вы получите уведомление.

Рекомендуем воспользоваться автобронирование поставки - /autobooking`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚀 Приступить', 'search_slot')],
        ...defaultButtonsMenuOnly
    ]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('🔍 Поиск слотов');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending search slot message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the cabinet selection message with available cabinets.
 */
const sendCabinetSelection = async (ctx, cabinets) => {
    const activeCabinets = cabinets.filter(cab => { var _a, _b; return ((_a = cab === null || cab === void 0 ? void 0 : cab.settings) === null || _a === void 0 ? void 0 : _a.cabinet_id) && ((_b = cab === null || cab === void 0 ? void 0 : cab.settings) === null || _b === void 0 ? void 0 : _b.is_active); });
    let cabinetsButtons = [];
    if (activeCabinets.length > 0) {
        cabinetsButtons = activeCabinets.map((cabinet) => {
            return [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`📦 ${cabinet.name}`, `select_cabinet_${cabinet.settings.cabinet_id}`)];
        });
    }
    else {
        cabinetsButtons = [
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➕ Добавить кабинет', 'create_cabinet')],
        ];
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...cabinetsButtons, ...defaultButtonsMenuOnly]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Выберите нужный кабинет`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('📦 Автобронирование');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending cabinet selection message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the draft selection message with available drafts.
 */
const sendDraftSelection = async (ctx) => {
    try {
        await ctx.answerCbQuery('😎 Ищем черновики');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error answering callback query:', error);
    }
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Entered draft selection');
    try {
        const cacheKey = `drafts_data_${ctx.from.id}`;
        const selectedCabinetId = ctx.session.autobookingForm.cabinetId;
        const drafts = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_5__["default"].rememberCacheValue(cacheKey, () => (0,_services_wildberriesService__WEBPACK_IMPORTED_MODULE_4__.getDraftsForUser)(selectedCabinetId), 10 // Cache expiration set to 2 hours
        );
        if (!drafts || drafts.length === 0) {
            await ctx.answerCbQuery('У вас нет доступных черновиков', {
                show_alert: true,
            });
            return;
        }
        const draftButtons = drafts.map((draft) => {
            const date = new Date(draft.createdAt).toLocaleDateString('ru-RU');
            const goodQuantity = draft.goodQuantity;
            const title = `${date} – кол-во товаров – ${goodQuantity} шт.`;
            return [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`· ${title}`, `select_draft_${draft.draftId}`)];
        });
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...draftButtons, ...defaultButtons]);
        const message = "🫡 Выберите необходимый черновик с заполненными товарами 👇";
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error getting drafts:', error);
        await ctx.reply('Произошла ошибка при получении черновиков. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
        throw error;
    }
};
/**
 * Sends the warehouse selection message with available warehouses.
 */
const sendWarehouseSelection = async (ctx) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Entered warehouse selection');
    try {
        const warehouses = await _services_WarehouseService__WEBPACK_IMPORTED_MODULE_3__["default"].getWarehouses(ctx.session.page);
        const warehouseButtons = warehouses.keyboard.map((row) => row.map((button) => {
            return telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(button.text, button.callback_data);
        }));
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...warehouseButtons, ...defaultButtons]);
        const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Выберите необходимый склад`;
        try {
            await ctx.answerCbQuery('😎 Выберите склад');
            await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending warehouse selection message:', error);
            await ctx.reply(message, keyboard);
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending warehouse selection message:', error);
        await ctx.reply('Произошла ошибка при получении складов. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtons));
    }
};
/**
 * Sends the coefficient selection message with available coefficients.
 */
const sendCoefficientSelection = async (ctx) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Выберите нужный коэффициент

Например, если вы выберете до ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(`x2`)}, бот будет искать варианты с коэффициентом до ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(`x2`)}, включая бесплатные, ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(`x1`)} и ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(`x2`)}.

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Данные по заявке`)}: 

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Склад`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.WAREHOUSES[warehouseId])}`;
    let coefficientsButtons = [];
    // Add the first button as a separate row
    coefficientsButtons.push([
        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS[0], `wh_coefficient_set_0`)
    ]);
    // Add the remaining buttons in pairs
    for (let i = 1; i < 7; i += 2) {
        let row = [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS[i], `wh_coefficient_set_${i}`)
        ];
        if (i + 1 < 7) {
            row.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS[i + 1], `wh_coefficient_set_${i + 1}`));
        }
        coefficientsButtons.push(row);
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...coefficientsButtons, ...defaultButtons]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('😎 Выберите коэффициент');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending coefficient selection message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the box type selection message with available box types.
 */
const sendBoxTypeSelection = async (ctx) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Выберите тип упаковки

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Данные по заявке`)}: 

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Склад`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.WAREHOUSES[warehouseId])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Коэффицент`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS_TEXT_ONLY[coefficient])}`;
    const boxTypes = [];
    for (const key in _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.BOX_TYPES) {
        boxTypes.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.BOX_TYPES[key], `wh_box_type_set_${key}`)]);
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...boxTypes, ...defaultButtons]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('😎 Выберите тип упаковки');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending box type selection message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the date selection message with available date options.
 */
const sendDateSelection = async (ctx) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Выберите подходящую дату

Если выбрана опция "неделя" или "месяц", вы задаёте период, и бот найдёт ближайшую доступную дату в этом диапазоне.

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Данные по заявке`)}: 

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Склад`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.WAREHOUSES[warehouseId])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Коэффицент`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS_TEXT_ONLY[coefficient])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Тип упаковки`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.BOX_TYPES_TEXT_ONLY[boxTypeId])}
${boxTypeId === '5' && ctx.session.autobookingForm.monopalletCount ? (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Кол-во монопаллетов')}: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.autobookingForm.monopalletCount)}` : ''}
`;
    const dates = [];
    for (const key in _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.DATES) {
        dates.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.DATES[key], `wh_date_set_${key}`)]);
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        ...dates,
        ...defaultButtons
    ]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('😎 Выберите дату');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending date selection message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the order confirmation message.
 */
const sendOrderConfirmation = async (ctx, selectedDate) => {
    let datesText = '';
    if (selectedDate === 'customdates') {
        datesText = ctx.session.autobookingForm.dates.join(', ');
    }
    else {
        const checkUntilDate = new Date();
        const todayDate = (0,_utils_dateUtils__WEBPACK_IMPORTED_MODULE_7__.formatDateDDMMYYYY)(new Date());
        let prefix = '';
        switch (selectedDate) {
            case 'today':
                checkUntilDate.setHours(23, 59, 59, 999);
                break;
            case 'tomorrow':
                checkUntilDate.setDate(checkUntilDate.getDate() + 1);
                checkUntilDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                checkUntilDate.setDate(checkUntilDate.getDate() + 7);
                checkUntilDate.setHours(23, 59, 59, 999);
                prefix = `${todayDate} - `;
                break;
            case 'month':
                checkUntilDate.setMonth(checkUntilDate.getMonth() + 1);
                checkUntilDate.setHours(23, 59, 59, 999);
                prefix = `${todayDate} - `;
                break;
        }
        ctx.session.autobookingForm.checkUntilDate = (0,_utils_dateUtils__WEBPACK_IMPORTED_MODULE_7__.formatDateDDMMYYYY)(checkUntilDate);
        datesText = `${prefix}${ctx.session.autobookingForm.checkUntilDate}`;
    }
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`🫡 Ваша заявка`)}: 

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Склад`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.WAREHOUSES[warehouseId])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Коэффицент`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS_TEXT_ONLY[coefficient])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Тип упаковки`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.BOX_TYPES_TEXT_ONLY[boxTypeId])}
${boxTypeId === '5' && ctx.session.autobookingForm.monopalletCount ? (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Кол-во монопаллетов')}: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.autobookingForm.monopalletCount)}` : ''}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Дата`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(datesText)}

`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚀 Подтвердить', 'confirm_order')],
        ...defaultButtons
    ]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('😎 Подтвердите заказ');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending order confirmation message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends the final confirmation message after the order is confirmed.
 */
const sendFinalConfirmation = async (ctx) => {
    let datesText = '';
    if (ctx.session.autobookingForm.dates.length > 0) {
        datesText = ctx.session.autobookingForm.dates.join(', ');
    }
    else {
        datesText = ctx.session.autobookingForm.checkUntilDate;
    }
    if (ctx.session.autobookingForm.isBooking) {
        //creating order in wb
        try {
            let userId = ctx.session.autobookingForm.cabinetId;
            let draftId = ctx.session.autobookingForm.draftId;
            let warehouseId = ctx.session.autobookingForm.warehouseId;
            let boxTypeMask = ctx.session.autobookingForm.boxTypeId;
            const response = await (0,_services_wildberriesService__WEBPACK_IMPORTED_MODULE_4__.createOrderRequest)(userId, draftId, warehouseId, boxTypeMask);
            ctx.session.autobookingForm.preorderId = response.preorderID;
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating order:', error);
            await ctx.reply('Произошла ошибка при создании заказа. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
            throw error;
        }
    }
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_8__["default"].createNotificationByTelegramId(ctx.from.id, ctx.session.autobookingForm);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
        throw error;
    }
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Ваша заявка готова 

Мы уже ищем тайм-слот для вашей поставки, как только найдем наша система автоматически забронирует поставку. Каждые 3 часа мы будем присылать статус заявки 🫶

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Данные по заявке`)}: 

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Склад`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.WAREHOUSES[warehouseId])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Коэффицент`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS_TEXT_ONLY[coefficient])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Тип упаковки`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.BOX_TYPES_TEXT_ONLY[boxTypeId])}
${boxTypeId === '5' && ctx.session.autobookingForm.monopalletCount ? (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Кол-во монопаллетов')}: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.autobookingForm.monopalletCount)}` : ''}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Дата`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(datesText)}
`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending final confirmation message:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends a prompt asking the user to input custom dates.
 */
const sendCustomDatePrompt = async (ctx) => {
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Введите несколько нужных дат через запятую в формате ДД.ММ.ГГГГ, например:
• ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('10.08.2025, 12.08.2025')}

На каждую дату будет создана отдельная заявка.`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('📝 Введите ваши даты');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending custom date prompt:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends a pallet count input prompt.
 */
const sendPalletCountPrompt = async (ctx) => {
    const warehouseId = ctx.session.autobookingForm.warehouseId;
    const coefficient = ctx.session.autobookingForm.coefficient;
    const boxTypeId = ctx.session.autobookingForm.boxTypeId;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `🫡 Введите кол-во монопаллетов
    
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Данные по заявке`)}:
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Склад`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.WAREHOUSES[warehouseId])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Коэффицент`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.COEFFICIENTS_TEXT_ONLY[coefficient])}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)(`Тип упаковки`)} — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(_utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_6__.BOX_TYPES_TEXT_ONLY[boxTypeId])}
    `;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('📝 Введите количество монопаллетов');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending pallet count prompt:', error);
        await ctx.reply(message, keyboard);
    }
};
/**
 * Sends an error message with a standard keyboard.
 */
const sendErrorMessage = async (ctx, errorMsg) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons]);
    try {
        await ctx.editMessageText(errorMsg, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending error message:', error);
        await ctx.reply(errorMsg, keyboard);
    }
};
const sendInstructions = async (ctx) => {
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Создайте в кабинете черновик поставки не выбирая дату и склад поставки и сохраните черновик.
Инструкции — ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.link)(`тут.`, 'https://telegra.ph/Instrukciya-po-avtobronirovaniyu-08-10')}`;
    const buttonCreate = [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🤞 Создать поставку из черновика', 'start_autobooking')];
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([buttonCreate, ...defaultButtons]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('📝 Инструкции');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending instructions:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/autoBookingScene.ts":
/*!**********************************************************!*\
  !*** ./src/telegraf/services/scenes/autoBookingScene.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./actions/autoBookingActions */ "./src/telegraf/services/scenes/actions/autoBookingActions.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_3__);
// ./scenes/autoBookingWizard.ts




// Default buttons with Back and Main Menu
const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
// Composer instances for each step
const handleCabinetSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCabinetSelection.action(/select_cabinet_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];
    ctx.session.autobookingForm.cabinetId = cabinetId;
    try {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendInstructions)(ctx);
        return ctx.wizard.next();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error sending draft selection:', error);
        return;
    }
});
const handleDraftSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDraftSelection.action(/select_draft_(.+)/, async (ctx) => {
    const draftId = ctx.match[1];
    ctx.session.autobookingForm.draftId = draftId;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
    return ctx.wizard.next();
});
const handleWarehouseSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleWarehouseSelection.action(/select_warehouse_(.+)/, async (ctx) => {
    const warehouseId = ctx.match[1];
    ctx.session.autobookingForm.warehouseId = warehouseId;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCoefficientSelection)(ctx);
    return ctx.wizard.next();
});
const handleCoefficientSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCoefficientSelection.action(/wh_coefficient_set_(.+)/, async (ctx) => {
    const coefficient = ctx.match[1];
    ctx.session.autobookingForm.coefficient = coefficient;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendBoxTypeSelection)(ctx);
    return ctx.wizard.next();
});
const handleBoxTypeSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBoxTypeSelection.action(/wh_box_type_set_(.+)/, async (ctx) => {
    const boxType = ctx.match[1];
    ctx.session.autobookingForm.boxTypeId = boxType;
    // If boxType === 5 (Monopallet), then prompt for pallet count
    if (boxType === '5') {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendPalletCountPrompt)(ctx);
        return ctx.wizard.next();
    }
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
    return ctx.wizard.selectStep(ctx.wizard.cursor + 2);
});
const handlePalletCount = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePalletCount.on('text', async (ctx) => {
    const text = ctx.message.text;
    const count = parseInt(text, 10);
    if (isNaN(count) || count < 1) {
        await ctx.reply('❌ Некорректное количество паллет. Пожалуйста, введите число больше 0.');
        return;
    }
    ctx.session.autobookingForm.monopalletCount = count;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
    return ctx.wizard.next();
});
const handleDateSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDateSelection.action(/wh_date_set_(.+)/, async (ctx) => {
    const date = ctx.match[1];
    if (date === 'customdates') {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCustomDatePrompt)(ctx); // Send prompt for custom dates
        return ctx.wizard.next(); // Move to handleCustomDateInput step
    }
    else {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendOrderConfirmation)(ctx, date);
        return ctx.wizard.selectStep(ctx.wizard.cursor + 2); // Skip custom date input step
    }
});
const handleCustomDateInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCustomDateInput.on('text', async (ctx) => {
    const input = ctx.message.text;
    const dates = input.split(',').map(date => date.trim());
    // Regular expression to match DD.MM.YYYY format
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    // Find dates that do not match the regex
    const invalidFormatDates = dates.filter(date => !dateRegex.test(date));
    if (invalidFormatDates.length > 0) {
        const errorMessage = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.fmt) `❌ Некорректный формат даты: ${invalidFormatDates.join(', ')}.
Пожалуйста, введите даты в формате ДД.ММ.ГГГГ, разделяя их запятыми. Например:
• 10.08.2025, 12.08.2025`;
        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, Object.assign(Object.assign({}, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons])), { link_preview_options: {
                is_disabled: true
            } }));
        return; // Stay on the current step
    }
    // Optional: Further validate if the dates are actual calendar dates
    const invalidDates = [];
    const validDates = [];
    dates.forEach(dateStr => {
        const [day, month, year] = dateStr.split('.').map(Number);
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() === year &&
            dateObj.getMonth() === month - 1 &&
            dateObj.getDate() === day) {
            validDates.push(dateStr);
        }
        else {
            invalidDates.push(dateStr);
        }
    });
    if (invalidDates.length > 0) {
        const errorMessage = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.fmt) `❌ Некорректные даты: ${invalidDates.join(', ')}.
Пожалуйста, убедитесь, что введённые даты существуют и находятся в формате ДД.ММ.ГГГГ.`;
        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, Object.assign(Object.assign({}, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons])), { link_preview_options: {
                is_disabled: true
            } }));
        return; // Stay on the current step
    }
    // If all dates are valid, save them to the session
    ctx.session.autobookingForm.dates = validDates;
    // Proceed to order confirmation
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendOrderConfirmation)(ctx, 'customdates');
    return ctx.wizard.next();
});
const handleOrderConfirmation = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleOrderConfirmation.action('confirm_order', async (ctx) => {
    try {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendFinalConfirmation)(ctx);
        return ctx.scene.leave();
    }
    catch (_a) {
        return;
    }
});
// Define the wizard scene
const autoBookingWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('autoBookingWizard', async (ctx) => {
    ctx.session.page = 1;
    ctx.session.autobookingForm = {
        draftId: null,
        cabinetId: null,
        warehouseId: null,
        coefficient: null,
        dates: [],
        checkUntilDate: null,
        boxTypeId: null,
        monopalletCount: null,
        isBooking: true,
    };
    let user = null;
    let state = ctx.scene.state;
    user = state.user;
    const cabinets = user.cabinets;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCabinetSelection)(ctx, cabinets);
    return ctx.wizard.next();
}, handleCabinetSelection, async (ctx) => {
    try {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDraftSelection)(ctx);
        return ctx.wizard.next();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error sending draft selection:', error);
        return;
    }
}, handleDraftSelection, handleWarehouseSelection, handleCoefficientSelection, handleBoxTypeSelection, handlePalletCount, handleDateSelection, handleCustomDateInput, handleOrderConfirmation);
// Handle actions outside the wizard
autoBookingWizard.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});
autoBookingWizard.action('back', async (ctx) => {
    const state = ctx.scene.state;
    // Так как у нас есть дополнительный шаг - ввод кастомной даты
    ctx.wizard.back();
    await ctx.answerCbQuery('👈 Назад');
    // Determine the new current step
    const currentStep = ctx.wizard.cursor;
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info(`Navigated back to step ${currentStep}`);
    // Call the appropriate send function based on the current step
    switch (currentStep) {
        case 1:
            // Initial step: sendCabinetSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCabinetSelection)(ctx, state.user.cabinets);
            break;
        case 2:
            // After Cabinet Selection: sendInstructions
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendInstructions)(ctx);
            break;
        case 3:
            // After Instructions: sendDraftSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDraftSelection)(ctx);
            break;
        case 4:
            // After Draft Selection: sendWarehouseSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
            break;
        case 5:
            // After Warehouse Selection: sendCoefficientSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCoefficientSelection)(ctx);
            break;
        case 6:
            // After Coefficient Selection: sendBoxTypeSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendBoxTypeSelection)(ctx);
            break;
        case 7:
            if (ctx.session.autobookingForm.boxTypeId === '5') {
                // After Monopallet Count: sendPalletCountPrompt
                await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendPalletCountPrompt)(ctx);
            }
            else {
                ctx.wizard.selectStep(6);
                await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendBoxTypeSelection)(ctx);
            }
            break;
        case 8:
            // After Box Type Selection: sendDateSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
            break;
        case 9:
            // After Date Selection (either standard or custom): sendDateSelection
            // currentStep is 7 because of the custom date input step, but we want to skip it to let user re-enter dates
            ctx.wizard.selectStep(8);
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
            break;
        case 10:
            // After Date Selection: sendOrderConfirmation
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendOrderConfirmation)(ctx, ctx.session.autobookingForm.checkUntilDate || 'customdates');
            break;
        default:
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].warn(`Unhandled step ${currentStep} in back action`);
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendErrorMessage)(ctx, 'Неизвестный шаг. Пожалуйста, попробуйте снова.');
            break;
    }
});
autoBookingWizard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
autoBookingWizard.action('warehouses_next', async (ctx) => {
    if (ctx.session.page) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Incrementing page number');
        ctx.session.page += 1;
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
    }
    else {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].warn('Page number not set');
        ctx.session.page = 1;
        await ctx.scene.reenter();
    }
});
autoBookingWizard.action('warehouses_prev', async (ctx) => {
    if (ctx.session.page && ctx.session.page > 1) {
        ctx.session.page -= 1;
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
    }
    else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});
autoBookingWizard.action('create_cabinet', async (ctx) => {
    await ctx.scene.enter('createCabinetWizzard');
});
// Export the scene
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (autoBookingWizard);


/***/ }),

/***/ "./src/telegraf/services/scenes/createCabinetScene.ts":
/*!************************************************************!*\
  !*** ./src/telegraf/services/scenes/createCabinetScene.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
/* harmony import */ var _services_authService__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../services/authService */ "./src/services/authService.ts");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! uuid */ "uuid");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(uuid__WEBPACK_IMPORTED_MODULE_5__);






const nameHandler = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
const phoneHandler = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
nameHandler.on('text', async (ctx) => {
    const name = ctx.message.text;
    ctx.scene.session.cabinetForm.name = name;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
    ]);
    const message = "👇🏻Введите номер телефона";
    await ctx.reply(message, keyboard);
    return ctx.wizard.next();
});
phoneHandler.on('text', async (ctx) => {
    const input = ctx.message.text;
    // Step 1: Extract all digits from the input
    const digits = input.replace(/\D/g, '');
    // Step 2: Validate the number of digits
    if (digits.length < 10) {
        await ctx.reply('❌ Пожалуйста, введите действительный номер телефона с 10 цифрами.');
        return;
    }
    // Step 3: Extract the last 10 digits
    const phoneNumber = digits.slice(-10);
    // Step 4: Save the validated phone number
    ctx.scene.session.cabinetForm.phoneNumber = phoneNumber;
    // Proceed with the next step
    await createCabinetSend(ctx);
});
const createCabinetSend = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
    ]);
    try {
        const credentials = {
            phone: ctx.scene.session.cabinetForm.phoneNumber,
            name: ctx.scene.session.cabinetForm.name,
        };
        const user_id = (0,uuid__WEBPACK_IMPORTED_MODULE_5__.v4)();
        const telegram_id = ctx.from.id;
        // Enqueue the authentication job
        const authResult = await (0,_services_authService__WEBPACK_IMPORTED_MODULE_4__.authenticateUserService)({ userId: user_id, telegramId: telegram_id, credentials });
        if (!authResult.success) {
            throw new Error(authResult.message);
        }
        await ctx.wizard.next();
        // Inform the user that the job has started
        await ctx.reply('🚀 Мы начали процесс аутентификации. \n Пожалуйста, ожидайте сообщений.');
    }
    catch (error) {
        console.log('Error authenticateUserService:', error.message);
        await ctx.reply('❌ Ошибка создания кабинета', keyboard);
        return ctx.scene.leave();
    }
    return;
};
const codeHandler = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
codeHandler.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (!/^\d{6}$/.test(text)) {
        await ctx.reply('❌ Некорректный код. Пожалуйста, введите 6 цифр.');
        return;
    }
    const channel = `verification_code_channel_${ctx.from.id}`;
    const message = {
        code: text,
        telegramId: ctx.from.id,
        action: 'collect_verification_code',
    };
    await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_3__["default"].pushToChannel(channel, JSON.stringify(message));
    //Ждем ответа от сервиса
    return;
});
const cabinetWizzard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('createCabinetWizzard', 
// Step 1: Show subscription options
async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
    ]);
    ctx.scene.session.cabinetForm = {
        name: null,
        phoneNumber: null,
    };
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_2__.fmt) `🫡 Введите название кабинета`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('🚀 Создайте кабинет');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
}, nameHandler, phoneHandler, codeHandler);
cabinetWizzard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
// Export the scene
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (cabinetWizzard);


/***/ }),

/***/ "./src/telegraf/services/scenes/mainScene.ts":
/*!***************************************************!*\
  !*** ./src/telegraf/services/scenes/mainScene.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mainScene: () => (/* binding */ mainScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_cabinetGate__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils/cabinetGate */ "./src/telegraf/utils/cabinetGate.ts");


const mainScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('main');
// Define the enter handler
mainScene.enter(async (ctx) => {
    const messageText = `⚡Я автоматически нахожу и бронирую доступные слоты на складах Wildberries. Выбирайте удобный тариф и бронируйте поставки.

Выберите пункт в меню 👇`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📦 Автобронирование', 'autobooking')
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⚡ Поиск слотов', 'searchslots'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🙌 Мои кабинеты', 'cabinets'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Мои задания', 'searchrequests'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('💎 Подписка', 'payments'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('💬 Поддержка', 'https://t.me/helpybot_support'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('📍 Инструкции', 'http://surl.li/awdppl')
        ]
    ]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        }
        catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    }
    else {
        // Otherwise, send a new message
        await ctx.reply(messageText, mainMenuKeyboard);
    }
});
// Handle 'autobooking' action
mainScene.action('autobooking', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_1__.cabinetGate)(ctx, 'autoBookingWizard');
});
mainScene.action('searchrequests', async (ctx) => {
    await ctx.scene.enter('searchRequests');
});
mainScene.action('searchslots', async (ctx) => {
    await ctx.scene.enter('searchSlotsWizard');
});
mainScene.action('cabinets', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_1__.cabinetGate)(ctx, 'showCabinetsScene');
});


/***/ }),

/***/ "./src/telegraf/services/scenes/reauthCabinetScene.ts":
/*!************************************************************!*\
  !*** ./src/telegraf/services/scenes/reauthCabinetScene.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
/* harmony import */ var _services_authService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../services/authService */ "./src/services/authService.ts");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! uuid */ "uuid");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(uuid__WEBPACK_IMPORTED_MODULE_3__);




const codeHandler = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
codeHandler.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (!/^\d{6}$/.test(text)) {
        await ctx.reply('❌ Некорректный код. Пожалуйста, введите 6 цифр.');
        return;
    }
    const channel = `verification_code_channel_${ctx.from.id}`;
    const message = {
        code: text,
        telegramId: ctx.from.id,
        action: 'collect_verification_code',
    };
    await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].pushToChannel(channel, JSON.stringify(message));
    //Ждем ответа от сервиса
    return;
});
const cabinetReauthWizzard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('reauthCabinetWizzard', 
// Step 1: Show subscription options
async (ctx) => {
    const state = ctx.scene.state;
    const cabinet = state.cabinet;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
    ]);
    try {
        const credentials = {
            phone: cabinet.settings.phone_number,
            name: cabinet.name,
        };
        // Save the credentials to the cache so we can update cabinet later
        await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].set(`reauth_cabinet_${ctx.from.id}`, JSON.stringify({ cabinet }));
        const user_id = (0,uuid__WEBPACK_IMPORTED_MODULE_3__.v4)();
        const telegram_id = ctx.from.id;
        // Enqueue the authentication job
        const authResult = await (0,_services_authService__WEBPACK_IMPORTED_MODULE_2__.authenticateUserService)({ userId: user_id, telegramId: telegram_id, credentials });
        if (!authResult.success) {
            throw new Error(authResult.message);
        }
        // Inform the user that the job has started
        await ctx.reply('🚀 Мы получили вашу информацию и начали процесс аутентификации. Пожалуйста, ожидайте сообщений.', keyboard);
        await ctx.answerCbQuery('🚀 Создание кабинета началось');
    }
    catch (error) {
        console.log('Error authenticateUserService:', error.message);
        await ctx.reply('❌ Ошибка создания кабинета', keyboard);
        return ctx.scene.leave();
    }
    return ctx.wizard.next();
}, codeHandler);
cabinetReauthWizzard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
// Export the scene
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (cabinetReauthWizzard);


/***/ }),

/***/ "./src/telegraf/services/scenes/searchRequestsScene.ts":
/*!*************************************************************!*\
  !*** ./src/telegraf/services/scenes/searchRequestsScene.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   searchRequestsScene: () => (/* binding */ searchRequestsScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../utils/wildberries/consts */ "./src/utils/wildberries/consts.ts");
// src/scenes/searchRequestsScene.ts





 // Adjust the import path if necessary
const searchRequestsScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('searchRequests');
const listBookingRequests = async (ctx, type = 'booking') => {
    var _a, _b;
    // Initialize page number in session if not set
    if (!ctx.session.searchRequestsPage) {
        ctx.session.searchRequestsPage = 1;
    }
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Entered searchRequestsScene', { session: ctx.scene.session });
    const currentPage = ctx.session.searchRequestsPage;
    const perPage = 1; // As per your requirement
    const typeText = type == 'booking' ? 'автобронь' : 'поиск слотов';
    const messageTextHeader = `🫡 Список активных заявок на ${typeText} (Страница ${currentPage})`;
    try {
        // Fetch paginated notifications
        const paginatedNotifications = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].getNotificationsByTelegramId(ctx.from.id, currentPage, perPage, type);
        if (!paginatedNotifications || paginatedNotifications.data.length === 0) {
            const noNotificationsText = `📭 У вас нет активных заявок на ${typeText}.`;
            const noKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
            ]);
            if (ctx.callbackQuery && ctx.callbackQuery.message) {
                await ctx.editMessageText(noNotificationsText, noKeyboard);
            }
            else {
                await ctx.reply(noNotificationsText, noKeyboard);
            }
            return;
        }
        let notification;
        try {
            notification = paginatedNotifications.data[0];
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error getting notifications:', error);
            await ctx.answerCbQuery('Произошла ошибка [0]', {
                show_alert: true,
            });
            return;
        }
        const warehouseName = _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_5__.WAREHOUSES[notification.settings.warehouseId];
        const boxTypeName = _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_5__.BOX_TYPES_TEXT_ONLY[notification.settings.boxTypeId];
        const dateText = notification.settings.checkUntilDate;
        const coefficientName = _utils_wildberries_consts__WEBPACK_IMPORTED_MODULE_5__.COEFFICIENTS_TEXT_ONLY[notification.settings.coefficient];
        // Format the notification message
        const messageTextBooking = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.fmt) `
🫡 ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Список активных заявок на ${typeText}`}

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Номер автоброни:`} ${notification.settings.preorderId}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Кабинет:`} ${(_b = (_a = notification.cabinet) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Не указан'}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Склад:`} ${warehouseName} 
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Тип упаковки:`} ${boxTypeName} 
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Время:`} ${dateText}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Коэффициент:`} ${coefficientName}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Статус:`} ${notification.status === 'started' ? 'ищем' : (notification.status === 'finished' ? 'нашли' : 'вышло время')}

Страница: ${currentPage} из ${paginatedNotifications.last_page}
`;
        const messageTextSearch = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.fmt) `
🫡 ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Список активных заявок на ${typeText}`}

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Номер поисковой заявки:`} ${notification.id}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Склад:`} ${warehouseName} 
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Тип упаковки:`} ${boxTypeName} 
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Время:`} ${dateText}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Коэффициент:`} ${coefficientName}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold) `Статус:`} ${notification.status === 'started' ? 'ищем' : (notification.status === 'finished' ? 'нашли' : 'вышло время')}

Страница: ${currentPage} из ${paginatedNotifications.last_page}
`;
        const messageText = type === 'booking' ? messageTextBooking : messageTextSearch;
        // Build pagination buttons
        const buttons = [];
        const buttonsPagination = [];
        if (paginatedNotifications.prev_page_url) {
            buttonsPagination.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⬅️', 'notifications_prev'));
        }
        if (paginatedNotifications.next_page_url) {
            buttonsPagination.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➡️', 'notifications_next'));
        }
        const buttonDelete = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Удалить', 'delete_' + notification.id);
        buttons.push([buttonDelete]);
        buttons.push(buttonsPagination);
        // Always show 'Main Menu' button
        buttons.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')]);
        buttons.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')]);
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons, { columns: 3 });
        if (ctx.callbackQuery && ctx.callbackQuery.message) {
            try {
                // Edit existing message if interaction is from a callback query
                await ctx.editMessageText(messageText, Object.assign(Object.assign({}, keyboard), { parse_mode: 'HTML' }));
            }
            catch (error) {
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending notifications message:', error);
                await ctx.reply(messageText, Object.assign(Object.assign({}, keyboard), { parse_mode: 'HTML' }));
            }
        }
        else {
            // Otherwise, send a new message
            await ctx.reply(messageText, Object.assign(Object.assign({}, keyboard), { parse_mode: 'Markdown' }));
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error getting notifications:', error);
        await ctx.answerCbQuery('Произошла ошибка при получении заявок.', {
            show_alert: true,
        });
    }
};
const listSearchRequests = async (ctx) => {
    await listBookingRequests(ctx, 'search');
};
searchRequestsScene.enter(async (ctx) => {
    const messageText = `🫡 Выберите тип заявок для просмотра:`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔍 Поиск', 'search'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚚 Автобронь', 'booking')
        ],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            await ctx.editMessageText(messageText, keyboard);
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending search requests message:', error);
            await ctx.reply(messageText, keyboard);
        }
    }
    else {
        await ctx.reply(messageText, keyboard);
    }
});
const searchAction = async (ctx) => {
    await listSearchRequests(ctx);
};
const bookingAction = async (ctx) => {
    await listBookingRequests(ctx);
};
searchRequestsScene.action('search', async (ctx) => {
    ctx.session.searchRequestsPage = 1; // Reset page number
    ctx.session.searchRequestsType = 'search';
    await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forgetByPattern(`notifications_telegram_id_${ctx.from.id}_page_*`);
    await searchAction(ctx);
});
searchRequestsScene.action('booking', async (ctx) => {
    ctx.session.searchRequestsPage = 1; // Reset page number
    ctx.session.searchRequestsType = 'booking';
    await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forgetByPattern(`notifications_telegram_id_${ctx.from.id}_page_*`);
    await bookingAction(ctx);
});
// Handle 'Next' button callback
searchRequestsScene.action('notifications_next', async (ctx) => {
    if (ctx.session.searchRequestsPage) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Incrementing page number');
        ctx.session.searchRequestsPage += 1;
        if (ctx.session.searchRequestsType === 'booking') {
            await bookingAction(ctx);
        }
        else {
            await searchAction(ctx);
        }
    }
    else {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].warn('Page number not set');
        // If for some reason the page isn't set, reset to page 1
        ctx.session.searchRequestsPage = 1;
        await ctx.scene.reenter();
    }
});
// Handle 'Previous' button callback
searchRequestsScene.action('notifications_prev', async (ctx) => {
    if (ctx.session.searchRequestsPage && ctx.session.searchRequestsPage > 1) {
        ctx.session.searchRequestsPage -= 1;
        if (ctx.session.searchRequestsType === 'booking') {
            await bookingAction(ctx);
        }
        else {
            await searchAction(ctx);
        }
    }
    else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});
searchRequestsScene.action(/delete_(.*)/, async (ctx) => {
    const notificationId = ctx.match[1];
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].deleteNotification(notificationId);
        await ctx.answerCbQuery('Заявка удалена', { show_alert: true });
        await ctx.scene.reenter();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error deleting notification:', error);
        await ctx.answerCbQuery('Произошла ошибка при удалении заявки.', { show_alert: true });
    }
});
searchRequestsScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});


/***/ }),

/***/ "./src/telegraf/services/scenes/searchSlotsScene.ts":
/*!**********************************************************!*\
  !*** ./src/telegraf/services/scenes/searchSlotsScene.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./actions/autoBookingActions */ "./src/telegraf/services/scenes/actions/autoBookingActions.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _utils_cabinetGate__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils/cabinetGate */ "./src/telegraf/utils/cabinetGate.ts");





// Default buttons with Back and Main Menu
const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const handleWarehouseSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleWarehouseSelection.action(/select_warehouse_(.+)/, async (ctx) => {
    const warehouseId = ctx.match[1];
    ctx.session.autobookingForm.warehouseId = warehouseId;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCoefficientSelection)(ctx);
    return ctx.wizard.next();
});
const handleCoefficientSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCoefficientSelection.action(/wh_coefficient_set_(.+)/, async (ctx) => {
    const coefficient = ctx.match[1];
    ctx.session.autobookingForm.coefficient = coefficient;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendBoxTypeSelection)(ctx);
    return ctx.wizard.next();
});
const handleBoxTypeSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBoxTypeSelection.action(/wh_box_type_set_(.+)/, async (ctx) => {
    const boxType = ctx.match[1];
    ctx.session.autobookingForm.boxTypeId = boxType;
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
    return ctx.wizard.next();
});
const handleDateSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDateSelection.action(/wh_date_set_(.+)/, async (ctx) => {
    const date = ctx.match[1];
    console.log('date', date);
    if (date === 'customdates') {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCustomDatePrompt)(ctx); // Send prompt for custom dates
        return ctx.wizard.next(); // Move to handleCustomDateInput step
    }
    else {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendOrderConfirmation)(ctx, date);
        return ctx.wizard.selectStep(ctx.wizard.cursor + 2); // Skip custom date input step
    }
});
const handleCustomDateInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCustomDateInput.on('text', async (ctx) => {
    const input = ctx.message.text;
    const dates = input.split(',').map(date => date.trim());
    // Regular expression to match YYYY.MM.DD format
    const dateRegex = /^\d{4}\.\d{2}\.\d{2}$/;
    // Find dates that do not match the regex
    const invalidFormatDates = dates.filter(date => !dateRegex.test(date));
    if (invalidFormatDates.length > 0) {
        const errorMessage = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.fmt) `❌ Некорректный формат даты: ${invalidFormatDates.join(', ')}.
Пожалуйста, введите даты в формате ГГГГ.ММ.ДД, разделяя их запятыми. Например:
• 2025.08.10, 2025.08.12`;
        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, Object.assign(Object.assign({}, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons])), { link_preview_options: {
                is_disabled: true
            } }));
        return; // Stay on the current step
    }
    // Optional: Further validate if the dates are actual calendar dates
    const invalidDates = [];
    const validDates = [];
    dates.forEach(dateStr => {
        const [year, month, day] = dateStr.split('.').map(Number);
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() === year &&
            dateObj.getMonth() === month - 1 &&
            dateObj.getDate() === day) {
            validDates.push(dateStr);
        }
        else {
            invalidDates.push(dateStr);
        }
    });
    if (invalidDates.length > 0) {
        const errorMessage = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.fmt) `❌ Некорректные даты: ${invalidDates.join(', ')}.
Пожалуйста, убедитесь, что введённые даты существуют и находятся в формате ГГГГ.ММ.ДД.`;
        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, Object.assign(Object.assign({}, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons])), { link_preview_options: {
                is_disabled: true
            } }));
        return; // Stay on the current step
    }
    // If all dates are valid, save them to the session
    ctx.session.autobookingForm.dates = validDates;
    // Proceed to order confirmation
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendOrderConfirmation)(ctx, 'customdates');
    return ctx.wizard.next();
});
const handleOrderConfirmation = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleOrderConfirmation.action('confirm_order', async (ctx) => {
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendFinalConfirmation)(ctx);
    return;
});
// Define the wizard scene
const searchSlotsWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('searchSlotsWizard', async (ctx) => {
    ctx.session.page = 1;
    ctx.session.autobookingForm = {
        draftId: null,
        cabinetId: null,
        warehouseId: null,
        coefficient: null,
        dates: [],
        checkUntilDate: null,
        boxTypeId: null,
        monopalletCount: null,
        isBooking: false,
    };
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendSearchSlotMessage)(ctx);
    return ctx.wizard.next();
}, async (ctx) => {
    await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
    return ctx.wizard.next();
}, handleWarehouseSelection, handleCoefficientSelection, handleBoxTypeSelection, handleDateSelection, handleCustomDateInput, handleOrderConfirmation);
// Handle actions outside the wizard
searchSlotsWizard.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});
searchSlotsWizard.action('back', async (ctx) => {
    const state = ctx.scene.state;
    // Так как у нас есть дополнительный шаг - ввод кастомной даты
    ctx.wizard.back();
    await ctx.answerCbQuery('👈 Назад');
    // Determine the new current step
    const currentStep = ctx.wizard.cursor;
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info(`Navigated back to step ${currentStep}`);
    // Call the appropriate send function based on the current step
    switch (currentStep) {
        case 1:
            // Initial step: sendSearchSlotMessage
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendSearchSlotMessage)(ctx);
            break;
        case 2:
            // After Draft Selection: sendWarehouseSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
            break;
        case 3:
            // After Warehouse Selection: sendCoefficientSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendCoefficientSelection)(ctx);
            break;
        case 4:
            // After Coefficient Selection: sendBoxTypeSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendBoxTypeSelection)(ctx);
            break;
        case 5:
            // After Box Type Selection: sendDateSelection
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
            break;
        case 6:
            // After Date Selection (either standard or custom): sendDateSelection
            // currentStep is 7 because of the custom date input step, but we want to skip it to let user re-enter dates
            ctx.wizard.selectStep(5);
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendDateSelection)(ctx);
            break;
        case 7:
            // After Date Selection: sendOrderConfirmation
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendOrderConfirmation)(ctx, ctx.session.autobookingForm.checkUntilDate || 'customdates');
            break;
        default:
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].warn(`Unhandled step ${currentStep} in back action`);
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendErrorMessage)(ctx, 'Неизвестный шаг. Пожалуйста, попробуйте снова.');
            break;
    }
});
searchSlotsWizard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
searchSlotsWizard.action('warehouses_next', async (ctx) => {
    if (ctx.session.page) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Incrementing page number');
        ctx.session.page += 1;
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
    }
    else {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].warn('Page number not set');
        ctx.session.page = 1;
        await ctx.scene.reenter();
    }
});
searchSlotsWizard.action('warehouses_prev', async (ctx) => {
    if (ctx.session.page && ctx.session.page > 1) {
        ctx.session.page -= 1;
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_2__.sendWarehouseSelection)(ctx);
    }
    else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});
searchSlotsWizard.command('autobooking', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_4__.cabinetGate)(ctx, 'autoBookingWizard');
});
// Export the scene
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (searchSlotsWizard);


/***/ }),

/***/ "./src/telegraf/services/scenes/showCabinetsScene.ts":
/*!***********************************************************!*\
  !*** ./src/telegraf/services/scenes/showCabinetsScene.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./actions/autoBookingActions */ "./src/telegraf/services/scenes/actions/autoBookingActions.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _services_wildberriesService__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../services/wildberriesService */ "./src/services/wildberriesService.ts");






// Default buttons with Back and Main Menu
const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsAuth = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔐 Авторизация', 'auth')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const sendListCabinets = async (ctx) => {
    let user = null;
    let state = ctx.scene.state;
    user = state.user;
    const cabinets = user.cabinets;
    const cabinetsButtons = cabinets.map((cabinet) => {
        const cabinetStatus = cabinet.settings.is_active ? '🟢' : '🔴';
        return [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`${cabinetStatus} ${cabinet.name}`, `select_cabinet_${cabinet.id}`)];
    });
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...cabinetsButtons,
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➕ Добавить кабинет', 'create_cabinet')],
        ...defaultButtonsMenuOnly]);
    try {
        await ctx.editMessageText('🫡 Список ваших кабинетов', keyboard);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error showing cabinets:', error);
        await ctx.reply('🫡 Список ваших кабинетов', keyboard);
        return;
    }
};
const showCabinet = async (ctx, cabinetId) => {
    const state = ctx.scene.state;
    ctx.scene.session.selectedCabinetId = cabinetId;
    const user = state.user;
    const cabinet = user.cabinets.find(cabinet => cabinet.id == cabinetId);
    if (!cabinet) {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_3__.sendErrorMessage)(ctx, 'Кабинет не найден');
        return;
    }
    let actionButton = [];
    if (cabinet.settings.is_active) {
        actionButton = [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔍 Проверить подключение', 'check_connection_' + cabinet.id)];
    }
    else {
        actionButton = [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔐 Авторизация', 'auth')];
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        actionButton,
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Удалить', 'delete_cabinet_' + cabinet.id)],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.fmt) `🫡 ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_4__.bold)(`Ваш кабинет`)}
    
📝Название кабинета — ${cabinet.name}
Статус — ${cabinet.settings.is_active ? '🟢 Активен' : '🔴 Не активен'}
`;
    try {
        await ctx.editMessageText(message, keyboard);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error showing cabinet:', error);
        await ctx.reply(message, keyboard);
        return;
    }
};
const handleCabinetSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCabinetSelection.action(/select_cabinet_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];
    await showCabinet(ctx, cabinetId);
    return ctx.wizard.next();
});
// Define the wizard scene
const showCabinetsScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('showCabinetsScene', async (ctx) => {
    await sendListCabinets(ctx);
    return ctx.wizard.next();
}, handleCabinetSelection);
// Handle actions outside the wizard
showCabinetsScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});
showCabinetsScene.action('back', async (ctx) => {
    const state = ctx.scene.state;
    // Так как у нас есть дополнительный шаг - ввод кастомной даты
    ctx.wizard.back();
    await ctx.answerCbQuery('👈 Назад');
    // Determine the new current step
    const currentStep = ctx.wizard.cursor;
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info(`Navigated back to step ${currentStep}`);
    // Call the appropriate send function based on the current step
    switch (currentStep) {
        case 1:
            // Initial step: sendListCabinets
            await sendListCabinets(ctx);
            break;
        default:
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].warn(`Unhandled step ${currentStep} in back action`);
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_3__.sendErrorMessage)(ctx, 'Неизвестный шаг. Пожалуйста, попробуйте снова.');
            break;
    }
});
showCabinetsScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
showCabinetsScene.action('create_cabinet', async (ctx) => {
    await ctx.scene.enter('createCabinetWizzard');
});
showCabinetsScene.action(/delete_cabinet_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].deleteCabinetByTelegramId(ctx.from.id, cabinetId);
        await ctx.answerCbQuery('Кабинет удален', {
            show_alert: true,
        });
        await ctx.scene.enter('main');
        // await cabinetGate(ctx, 'showCabinetsScene');
    }
    catch (error) {
        await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_3__.sendErrorMessage)(ctx, '❌ Ошибка удаления кабинета');
        return;
    }
    return;
});
showCabinetsScene.action(/check_connection_(.+)/, async (ctx) => {
    const cabinetId = ctx.match[1];
    const cabinetIdDb = ctx.scene.session.selectedCabinetId;
    try {
        const response = await (0,_services_wildberriesService__WEBPACK_IMPORTED_MODULE_5__.getDraftsForUser)(cabinetId);
        await ctx.answerCbQuery(`Подключение успешно. \nОбнаружено ${response.length} черновиков`, {
            show_alert: true,
        });
    }
    catch (error) {
        try {
            const state = ctx.scene.state;
            const cabinet = state.user.cabinets.find(cabinet => cabinet.id == cabinetIdDb);
            cabinet.settings.state_path = null;
            cabinet.settings.is_active = false;
            await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].updateCabinetByTelegramId(ctx.from.id, cabinetIdDb, { name: cabinet.name, settings: cabinet.settings });
        }
        catch (error) {
            console.log('Error updating cabinet:', error);
            await (0,_actions_autoBookingActions__WEBPACK_IMPORTED_MODULE_3__.sendErrorMessage)(ctx, '❌ Ошибка обновления кабинета');
            return;
        }
        const errorMsg = '❌ Ошибка подключения, пожалуйста, авторизуйтесь заново.';
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtonsAuth]);
        try {
            await ctx.editMessageText(errorMsg, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error sending error message:', error);
            await ctx.reply(errorMsg, keyboard);
        }
        return;
    }
    return;
});
showCabinetsScene.action('auth', async (ctx) => {
    const state = ctx.scene.state;
    const cabinetId = ctx.scene.session.selectedCabinetId;
    const cabinet = state.user.cabinets.find(cabinet => cabinet.id == cabinetId);
    await ctx.scene.enter('reauthCabinetWizzard', { cabinet });
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (showCabinetsScene);


/***/ }),

/***/ "./src/telegraf/services/scenes/subscriptionScene.ts":
/*!***********************************************************!*\
  !*** ./src/telegraf/services/scenes/subscriptionScene.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");


const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const tariffHandler = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
tariffHandler.action(/tariff_\d+/, async (ctx) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Tariff selected:', { tariffId: ctx.match.input });
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Received update', { update: ctx.update });
    const tariffId = ctx.match.input.split('_')[1];
    ctx.session.selectedTariff = tariffId;
    await ctx.answerCbQuery('😎 Выбран тариф' + tariffId);
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('entered confirm payment');
    try {
        // Simulate payment confirmation
        // In reality, you would handle this via a webhook endpoint
        const paymentSuccessful = true; // Replace with actual payment status
        if (paymentSuccessful) {
            // Update session or database as needed
            ctx.session.count = (ctx.session.count || 0) + 1;
            // answer notification
            await ctx.answerCbQuery('Оплата прошла успешно!', {
                show_alert: true,
            });
            return ctx.scene.enter('subscriptionWizard');
        }
        else {
            await ctx.editMessageText('Оплата не прошла. Пожалуйста, попробуйте снова.');
            await ctx.scene.enter('subscriptionWizard');
            return ctx.scene.leave();
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error confirming payment:', error);
        await ctx.reply('Произошла ошибка при подтверждении оплаты. Пожалуйста, попробуйте позже.');
        return ctx.scene.enter('main');
    }
});
const sendStartMessage = async (ctx) => {
    const message = `🫡 Подписка
Доступно автообронирований: ${ctx.session.count || 0}
Выберете необходимое кол-во автобронирований 🙌

1 автобронь – 250₽  
5 автоброней – 1.000₽  
10 автоброней – 1.850₽  
20 автоброней – 3.500₽  
50 автоброней – 6.800₽`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('😎 Выбрать тариф', 'choose_tariff')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        // If the interaction is from a callback query, edit the existing message
        await ctx.editMessageText(message, keyboard);
        await ctx.answerCbQuery('💎 Подписка');
    }
    else {
        // Otherwise, send a new message
        await ctx.reply(message, keyboard);
    }
};
const subscriptionWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('subscriptionWizard', 
// Step 1: Show subscription options
async (ctx) => {
    await sendStartMessage(ctx);
    return ctx.wizard.next();
}, 
// Step 2: Handle tariff selection
async (ctx) => {
    // Игнорируем сообщения, не являющиеся callbackQuery
    if (!ctx.callbackQuery)
        return undefined;
    const tariffs = [
        { id: 1, name: '1 автобронь', price: 250 },
        { id: 5, name: '5 автоброней', price: 1000 },
        { id: 10, name: '10 автоброней', price: 1850 },
        { id: 20, name: '20 автоброней', price: 3500 },
        { id: 50, name: '50 автоброней', price: 6800 },
    ];
    const webUrl = 'https://botcomment.xyz';
    const tariffButtons = tariffs.map((tariff) => [
        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url(`${tariff.name} – ${tariff.price}₽`, `${webUrl}/payment_link/${ctx.from.id}/${tariff.id}`)
    ]);
    await ctx.editMessageText('🫡 Выберите тариф:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...tariffButtons, ...defaultButtons]));
    await ctx.answerCbQuery('😎 Выберите тариф');
    return ctx.wizard.next();
}, tariffHandler);
// Handle actions within the wizard
subscriptionWizard.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
    await ctx.answerCbQuery('👌 Главное меню');
});
subscriptionWizard.action('back', async (ctx) => {
    await ctx.wizard.back();
    await sendStartMessage(ctx);
});
subscriptionWizard.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
// Export the scene
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (subscriptionWizard);


/***/ }),

/***/ "./src/telegraf/services/warehouseBot.ts":
/*!***********************************************!*\
  !*** ./src/telegraf/services/warehouseBot.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");

class WarehouseBot {
    constructor(bot) {
        this.bot = bot;
    }
    async handleStart(chatId) {
        const message = "⚡Я автоматически нахожу и бронирую доступные слоты на складах Wildberries. Выбирайте удобный тариф и бронируйте поставки." +
            "\n\nВыберите пункт в меню 👇";
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📦 Автобронирование', callback_data: 'wh_notification' },
                ],
                [
                    { text: '⚡ Поиск слотов', callback_data: 'wh_notification' },
                    { text: '📝 Заявки на поиск слотов', callback_data: 'wh_notification' },
                ],
                [
                    { text: '🙌 Мои кабинеты', callback_data: 'wh_payment' },
                    { text: '💎 Подписка', callback_data: 'wh_payment' },
                ],
                [
                    { text: '💬 Поддержка', url: 'https://t.me/dmitrynovikov21' },
                    { text: '📍 Инструкции', url: 'https://t.me/dmitrynovikov21' },
                ],
            ],
        };
        await this.bot.telegram.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    }
    async fetchUserByTelegramId(telegramId) {
        try {
            return await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_0__["default"].getUserByTelegramId(telegramId);
        }
        catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (WarehouseBot);


/***/ }),

/***/ "./src/telegraf/utils/cabinetGate.ts":
/*!*******************************************!*\
  !*** ./src/telegraf/utils/cabinetGate.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cabinetGate: () => (/* binding */ cabinetGate)
/* harmony export */ });
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");


const cabinetGate = async (ctx, scene) => {
    let user = null;
    try {
        user = await _services_laravelService__WEBPACK_IMPORTED_MODULE_0__["default"].getUserByTelegramId(ctx.from.id);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error getting user:', error);
        await ctx.reply('Произошла ошибка при получении данных пользователя. Попробуйте позже');
    }
    if (user && user.cabinets.length === 0) {
        await ctx.scene.enter('createCabinetWizzard');
    }
    else {
        await ctx.scene.enter(scene, { user });
    }
};


/***/ }),

/***/ "./src/utils/clusterManager.ts":
/*!*************************************!*\
  !*** ./src/utils/clusterManager.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initializeCluster: () => (/* binding */ initializeCluster),
/* harmony export */   shutdownCluster: () => (/* binding */ shutdownCluster)
/* harmony export */ });
/* harmony import */ var playwright_cluster__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! playwright-cluster */ "playwright-cluster");
/* harmony import */ var playwright_cluster__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(playwright_cluster__WEBPACK_IMPORTED_MODULE_0__);
// nodejs-server/utils/clusterManager.ts

let cluster;
const initializeCluster = async () => {
    if (cluster) {
        return cluster;
    }
    cluster = await playwright_cluster__WEBPACK_IMPORTED_MODULE_0__.Cluster.launch({
        concurrency: playwright_cluster__WEBPACK_IMPORTED_MODULE_0__.Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 5,
        timeout: 120000,
        playwrightOptions: {
            headless: true,
        },
    });
    cluster.on('taskerror', (err, data, willRetry) => {
        if (willRetry) {
            console.warn(`Error processing ${data}: ${err.message}. Retrying...`);
        }
        else {
            console.error(`Failed to process ${data}: ${err.message}`);
        }
    });
    cluster.on('active', () => {
        console.log('A new task has started. Active tasks:', cluster.idle);
    });
    cluster.on('idle', () => {
        console.log('All tasks are complete. Cluster is idle.');
    });
    return cluster;
};
const shutdownCluster = async () => {
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



/***/ }),

/***/ "./src/utils/dateUtils.ts":
/*!********************************!*\
  !*** ./src/utils/dateUtils.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   formatDateDDMMYYYY: () => (/* binding */ formatDateDDMMYYYY),
/* harmony export */   formatDateYYYYMMDD: () => (/* binding */ formatDateYYYYMMDD)
/* harmony export */ });
/**
 * Formats a Date object into 'YYYY.MM.DD' string format.
 * @param date - The Date object to format.
 * @returns A string representing the formatted date.
 */
const formatDateYYYYMMDD = (date) => {
    const year = date.getFullYear();
    // Months are zero-based in JavaScript, so add 1 and pad with zero if needed
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
};
/**
 * Formats a Date object into 'DD.MM.YYYY' string format.
 * @param date - The Date object to format.
 * @returns A string representing the formatted date.
 */
const formatDateDDMMYYYY = (date) => {
    // Months are zero-based in JavaScript, so add 1 and pad with zero if needed
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};


/***/ }),

/***/ "./src/utils/logger/loggerTelegram.ts":
/*!********************************************!*\
  !*** ./src/utils/logger/loggerTelegram.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var winston__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! winston */ "winston");
/* harmony import */ var winston__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(winston__WEBPACK_IMPORTED_MODULE_0__);

const loggerTelegram = (0,winston__WEBPACK_IMPORTED_MODULE_0__.createLogger)({
    level: 'info',
    format: winston__WEBPACK_IMPORTED_MODULE_0__.format.json(),
    defaultMeta: { service: 'nodejs-server' },
    transports: [
        new winston__WEBPACK_IMPORTED_MODULE_0__.transports.Console({
            format: winston__WEBPACK_IMPORTED_MODULE_0__.format.combine(winston__WEBPACK_IMPORTED_MODULE_0__.format.timestamp(), winston__WEBPACK_IMPORTED_MODULE_0__.format.simple()),
        }),
        new winston__WEBPACK_IMPORTED_MODULE_0__.transports.File({
            filename: 'telegram.log',
            format: winston__WEBPACK_IMPORTED_MODULE_0__.format.json(),
        }),
    ],
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (loggerTelegram);


/***/ }),

/***/ "./src/utils/pow/solveTask.ts":
/*!************************************!*\
  !*** ./src/utils/pow/solveTask.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   solveTaskInNode: () => (/* binding */ solveTaskInNode),
/* harmony export */   wasmPath: () => (/* binding */ wasmPath)
/* harmony export */ });
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var vm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! vm */ "vm");
/* harmony import */ var vm__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(vm__WEBPACK_IMPORTED_MODULE_2__);
// src/utils/pow/solveTask.ts



// Step 1: Load wasm_exec.js (adjust the path to where you store the wasm_exec.js file)
const wasmExecPath = path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, 'wasm_exec.js');
const wasmExecCode = fs__WEBPACK_IMPORTED_MODULE_1___default().readFileSync(wasmExecPath, 'utf8');
vm__WEBPACK_IMPORTED_MODULE_2___default().runInThisContext(wasmExecCode); // This defines `global.Go`
// Step 2: Create a function to run WebAssembly in Node.js
async function solveTaskInNode(wasmPath, taskInput) {
    const go = new Go();
    // Load the WebAssembly file from the file system
    const wasmBuffer = fs__WEBPACK_IMPORTED_MODULE_1___default().readFileSync(wasmPath);
    // Instantiate WebAssembly with the Go import object
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    go.run(instance);
    // Now call solveTask
    try {
        const solveTaskResult = global.solveTask(taskInput);
        return solveTaskResult;
    }
    catch (error) {
        throw error;
    }
}
// Step 3: Define the wasmPath and taskInput
const wasmPath = path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, 'solve.wasm'); // Path to your solve.wasm file
// Export the function



/***/ }),

/***/ "./src/utils/redis/Cache/Cache.ts":
/*!****************************************!*\
  !*** ./src/utils/redis/Cache/Cache.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _redisClient__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../redisClient */ "./src/utils/redis/redisClient.ts");
/* harmony import */ var php_serialize__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! php-serialize */ "php-serialize");
/* harmony import */ var php_serialize__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(php_serialize__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_2__);
// src/cache/Cache.ts



class Cache {
    constructor() {
        this.prefix = 'wb_app_database_';
    }
    /**
     * Sets a value in the Redis cache.
     * @param key - The key under which the value is stored.
     * @param value - The value to store; can be any serializable type.
     * @param expirationInSeconds - Time in seconds before the key expires. Defaults to 3600 seconds (1 hour).
     */
    async set(key, value, expirationInSeconds = 3600) {
        const fullKey = `${this.prefix}${key}`;
        try {
            const serializedValue = (0,php_serialize__WEBPACK_IMPORTED_MODULE_1__.serialize)(value);
            await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].set(fullKey, serializedValue, {
                EX: expirationInSeconds, // Expiration time in seconds
            });
            console.log(`Value set for key: ${fullKey}`);
        }
        catch (err) {
            console.error(`Error setting cache value for key ${fullKey}:`, err);
        }
    }
    /**
     * Retrieves a value from the Redis cache.
     * @param key - The key of the value to retrieve.
     * @returns The deserialized value if found, raw value if deserialization fails, or null if not found.
     */
    async get(key) {
        const fullKey = `${this.prefix}${key}`;
        try {
            const value = await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].get(fullKey);
            if (value !== null) {
                try {
                    const deserializedValue = (0,php_serialize__WEBPACK_IMPORTED_MODULE_1__.unserialize)(value);
                    // console.log(`Value retrieved for key ${fullKey}:`, deserializedValue);
                    return deserializedValue;
                }
                catch (error) {
                    console.warn(`Failed to deserialize value for key ${fullKey}. Returning raw value.`);
                    return value;
                }
            }
            else {
                console.log(`Key ${fullKey} not found in cache.`);
                return null;
            }
        }
        catch (err) {
            console.error(`Error getting cache value for key ${fullKey}:`, err);
            return null;
        }
    }
    /**
     * Retrieves a value from the cache. If it doesn't exist, computes it using the provided function,
     * stores it in the cache, and then returns it.
     *
     * @param key - The cache key.
     * @param computeFn - An asynchronous function to compute the value if it's not cached.
     * @param expirationInSeconds - Cache expiration time in seconds. Defaults to 3600 (1 hour).
     * @returns A promise that resolves with the cached or computed value.
     */
    async rememberCacheValue(key, computeFn, expirationInSeconds = 3600) {
        try {
            // Attempt to retrieve the cached value
            const cachedValue = await this.get(key);
            if (cachedValue !== null) {
                console.log(`Cache hit for key: ${key}`);
                return cachedValue;
            }
            console.log(`Cache miss for key: ${key}. Computing value...`);
            // Compute the value using the provided function
            const computedValue = await computeFn();
            // Store the computed value in the cache
            await this.set(key, computedValue, expirationInSeconds);
            console.log(`Computed and cached value for key: ${key}`);
            return computedValue;
        }
        catch (err) {
            console.error(`Error in rememberCacheValue for key ${key}:`, err);
            throw err; // Rethrow the error after logging
        }
    }
    /**
     * Retrieves a user by their Telegram ID, first checking the cache before making an API call.
     * @param telegramId - The Telegram ID of the user.
     * @returns The user data if found, or null otherwise.
     */
    async getUserByTelegramId(telegramId) {
        const cacheKey = `user_telegram_id_${telegramId}`;
        try {
            let user = await this.get(cacheKey);
            console.log('User retrieved from cache:', user);
            if (user) {
                return user;
            }
            const laravelApiUrl = process.env.LARAVEL_API_URL;
            if (!laravelApiUrl) {
                console.error('LARAVEL_API_URL is not defined in environment variables.');
                return null;
            }
            const response = await axios__WEBPACK_IMPORTED_MODULE_2___default().get(`${laravelApiUrl}/users/telegram/${telegramId}`);
            user = response.data;
            console.log('User retrieved from API:', user);
            // Optionally, cache the user data after fetching from the API
            await this.set(cacheKey, user, 3600); // Cache for 1 hour
            return user;
        }
        catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }
    /**
     * Deletes a key from the Redis cache.
     * @param key - The key to delete.
     * @returns True if the key was deleted, false otherwise.
     */
    async forget(key) {
        const fullKey = `${this.prefix}${key}`;
        try {
            const result = await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].del(fullKey);
            if (result === 1) {
                console.log(`Successfully deleted key: ${fullKey}`);
                return true;
            }
            else {
                console.log(`Key ${fullKey} does not exist or could not be deleted.`);
                return false;
            }
        }
        catch (err) {
            console.error(`Error deleting cache value for key ${fullKey}:`, err);
            return false;
        }
    }
    async forgetByPattern(pattern) {
        const fullPattern = `${this.prefix}${pattern}`;
        console.log(`Deleting keys matching pattern: ${fullPattern}`);
        try {
            let cursor = 0;
            do {
                const result = await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].scan(cursor, {
                    MATCH: fullPattern,
                    COUNT: 100
                });
                console.log('Scan result:', result);
                // Adjusted to match the actual response structure
                const nextCursor = result.cursor;
                const keys = result.keys;
                cursor = nextCursor;
                if (keys && keys.length > 0) { // Added a check to ensure keys is defined
                    await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].del(keys);
                    console.log(`Successfully deleted keys matching pattern: ${fullPattern}`);
                }
            } while (cursor !== 0);
            return true;
        }
        catch (err) {
            console.error(`Error deleting cache values for pattern ${fullPattern}:`, err);
            return false;
        }
    }
    /**
     * Publishes a message to a Redis channel.
     * @param channel - The channel to publish the message to.
     * @param message - The message to publish.
     */
    async pushToChannel(channel, message) {
        const fullChannel = `${this.prefix}${channel}`;
        try {
            await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].publish(fullChannel, message);
            console.log(`Message published to channel ${channel}: ${message}`);
        }
        catch (err) {
            console.error(`Error publishing message to channel ${channel}:`, err);
        }
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new Cache());


/***/ }),

/***/ "./src/utils/redis/cacheHelper.ts":
/*!****************************************!*\
  !*** ./src/utils/redis/cacheHelper.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearCacheValue: () => (/* binding */ clearCacheValue),
/* harmony export */   getCacheValue: () => (/* binding */ getCacheValue),
/* harmony export */   rememberCacheValue: () => (/* binding */ rememberCacheValue),
/* harmony export */   setCacheValue: () => (/* binding */ setCacheValue)
/* harmony export */ });
/* harmony import */ var _redisClient__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./redisClient */ "./src/utils/redis/redisClient.ts");
/* harmony import */ var php_serialize__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! php-serialize */ "php-serialize");
/* harmony import */ var php_serialize__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(php_serialize__WEBPACK_IMPORTED_MODULE_1__);
// utils/cacheHelper.ts


/**
 * Serialize values to match Laravel's expected format (PHP serialization).
 * Sets a value in Redis with an optional expiration time.
 *
 * @param key - The cache key.
 * @param value - The value to cache.
 * @param expirationInSeconds - Expiration time in seconds (default is 3600 seconds or 1 hour).
 * @returns A promise that resolves when the value is set.
 */
async function setCacheValue(key, value, expirationInSeconds = 3600) {
    try {
        // Custom key format: wb_app_database_{key}
        const formattedKey = `wb_app_database_${key}`;
        const serializedValue = (0,php_serialize__WEBPACK_IMPORTED_MODULE_1__.serialize)(value);
        const options = {
            EX: expirationInSeconds, // Expiration time in seconds
        };
        await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].set(formattedKey, serializedValue, options);
        console.log(`Value set for key: ${formattedKey}`);
    }
    catch (err) {
        console.error(`Error setting cache value for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}
/**
 * Retrieves a value from the Laravel Redis cache.
 * Attempts to unserialize the value; if unsuccessful, returns the raw value.
 *
 * @param key - The cache key.
 * @returns A promise that resolves with the cached value or null if not found.
 */
async function getCacheValue(key) {
    try {
        // Custom key format: wb_app_database_{key}
        const formattedKey = `wb_app_database_${key}`;
        const value = await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].get(formattedKey);
        if (value !== null) {
            try {
                const deserializedValue = (0,php_serialize__WEBPACK_IMPORTED_MODULE_1__.unserialize)(value);
                console.log(`Value retrieved for key ${formattedKey}:`, deserializedValue);
                return deserializedValue;
            }
            catch (error) {
                console.warn(`Failed to deserialize, returning raw value for key ${formattedKey}:`, value);
                return value; // If not serialized, return raw value
            }
        }
        else {
            console.log(`Key ${formattedKey} not found in cache.`);
            return null;
        }
    }
    catch (err) {
        console.error(`Error getting cache value for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}
/**
 * Clears (deletes) a specific cache key from Redis.
 *
 * @param key - The cache key to delete.
 * @returns A promise that resolves to true if the key was deleted, false otherwise.
 */
async function clearCacheValue(key) {
    try {
        // Custom key format: wb_app_database_{key}
        const formattedKey = `wb_app_database_${key}`;
        const result = await _redisClient__WEBPACK_IMPORTED_MODULE_0__["default"].del(formattedKey);
        if (result === 1) {
            console.log(`Successfully deleted key: ${formattedKey}`);
            return true;
        }
        else {
            console.log(`Key ${formattedKey} does not exist or could not be deleted.`);
            return false;
        }
    }
    catch (err) {
        console.error(`Error deleting cache value for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}
/**
 * Retrieves a value from the cache. If it doesn't exist, computes it using the provided function,
 * stores it in the cache, and then returns it.
 *
 * @param key - The cache key.
 * @param computeFn - An asynchronous function to compute the value if it's not cached.
 * @param expirationInSeconds - Cache expiration time in seconds. Defaults to 3600 (1 hour).
 * @returns A promise that resolves with the cached or computed value.
 */
async function rememberCacheValue(key, computeFn, expirationInSeconds = 3600) {
    try {
        // Attempt to retrieve the cached value
        const cachedValue = await getCacheValue(key);
        if (cachedValue !== null) {
            console.log(`Cache hit for key: ${key}`);
            return cachedValue;
        }
        console.log(`Cache miss for key: ${key}. Computing value...`);
        // Compute the value using the provided function
        const computedValue = await computeFn();
        // Store the computed value in the cache
        await setCacheValue(key, computedValue, expirationInSeconds);
        console.log(`Computed and cached value for key: ${key}`);
        return computedValue;
    }
    catch (err) {
        console.error(`Error in rememberCacheValue for key ${key}:`, err);
        throw err; // Rethrow the error after logging
    }
}


/***/ }),

/***/ "./src/utils/redis/redisClient.ts":
/*!****************************************!*\
  !*** ./src/utils/redis/redisClient.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var redis__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! redis */ "redis");
/* harmony import */ var redis__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(redis__WEBPACK_IMPORTED_MODULE_0__);
// utils/redisClient.ts

/**
 * Configuration options for the Redis client.
 */
const redisConfig = {
    url: 'redis://redis:6379/1', // Use Redis container name as host
};
/**
 * Create a Redis client instance.
 */
const redisClient = (0,redis__WEBPACK_IMPORTED_MODULE_0__.createClient)(redisConfig);
/**
 * Connect to Redis.
 */
const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    }
    catch (error) {
        console.error('Redis connection error:', error);
        // Optionally, handle reconnection logic or exit the process
        process.exit(1);
    }
};
// Initiate the connection
connectRedis();
/**
 * Gracefully handle application termination signals to disconnect Redis client.
 */
const gracefulShutdown = async () => {
    try {
        await redisClient.disconnect();
        console.log('Disconnected from Redis');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during Redis disconnection:', error);
        process.exit(1);
    }
};
// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (redisClient);


/***/ }),

/***/ "./src/utils/redis/redisHelper.ts":
/*!****************************************!*\
  !*** ./src/utils/redis/redisHelper.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   waitForVerificationCode: () => (/* binding */ waitForVerificationCode)
/* harmony export */ });
/* harmony import */ var _redisSubscriber__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./redisSubscriber */ "./src/utils/redis/redisSubscriber.ts");
// utils/redisHelper.ts

/**
 * Waits for a verification code from Redis on a specific channel.
 * @param telegramId - The user's Telegram ID.
 * @param timeoutMs - Timeout in milliseconds (default is 300000 ms or 5 minutes).
 * @returns A promise that resolves with the verification code.
 */
function waitForVerificationCode(telegramId, timeoutMs = 300000) {
    return new Promise(async (resolve, reject) => {
        // Construct the channel name with the given Telegram ID
        let channel = `verification_code_channel_${telegramId}`;
        channel = `wb_app_database_${channel}`;
        /**
         * Handler for incoming messages on the Redis channel.
         * @param message - The message received from Redis.
         */
        const messageHandler = (message) => {
            if (message && message.action === 'collect_verification_code') {
                console.log(`Received verification code for Telegram ID ${telegramId}: ${message.code}`);
                cleanup();
                resolve(message.code);
            }
        };
        /**
         * Cleans up by unsubscribing from the Redis channel and clearing the timeout.
         */
        const cleanup = async () => {
            try {
                await _redisSubscriber__WEBPACK_IMPORTED_MODULE_0__["default"].unsubscribe(channel, messageHandler);
            }
            catch (error) {
                console.error(`Error during cleanup: ${error}`);
            }
            clearTimeout(timer);
        };
        // Set up a timeout to reject the promise if no verification code is received in time
        const timer = setTimeout(async () => {
            try {
                await _redisSubscriber__WEBPACK_IMPORTED_MODULE_0__["default"].unsubscribe(channel, messageHandler);
            }
            catch (error) {
                console.error(`Error during timeout cleanup: ${error}`);
            }
            reject(new Error('Verification code timeout.'));
        }, timeoutMs);
        try {
            await _redisSubscriber__WEBPACK_IMPORTED_MODULE_0__["default"].subscribe(channel, messageHandler);
            console.log(`Waiting for verification code on channel: ${channel}`);
        }
        catch (error) {
            clearTimeout(timer);
            reject(error);
        }
    });
}


/***/ }),

/***/ "./src/utils/redis/redisSubscriber.ts":
/*!********************************************!*\
  !*** ./src/utils/redis/redisSubscriber.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var redis__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! redis */ "redis");
/* harmony import */ var redis__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(redis__WEBPACK_IMPORTED_MODULE_0__);
// redisSubscriber.ts

/**
 * RedisSubscriber is a singleton class responsible for managing Redis subscriptions.
 */
class RedisSubscriber {
    constructor() {
        this.subscriber = (0,redis__WEBPACK_IMPORTED_MODULE_0__.createClient)({
            url: 'redis://redis:6379/1', // Ensure using Database 1
        });
        this.isConnected = false;
        this.messageHandlers = {};
        this.subscriber.on('error', (err) => {
            console.error('Redis subscription error:', err);
        });
    }
    /**
     * Establishes a connection to the Redis server if not already connected.
     */
    async connect() {
        if (!this.isConnected) {
            try {
                await this.subscriber.connect();
                this.isConnected = true;
                console.log('Connected to Redis.');
            }
            catch (error) {
                console.error('Failed to connect to Redis:', error);
                throw error;
            }
        }
    }
    /**
     * Subscribes to a Redis channel with a specific message handler.
     * @param channel - The Redis channel to subscribe to.
     * @param messageHandler - The function to handle incoming messages.
     */
    async subscribe(channel, messageHandler) {
        await this.connect();
        if (!this.messageHandlers[channel]) {
            this.messageHandlers[channel] = [];
            // Subscribe with a callback that iterates over all handlers for this channel
            try {
                await this.subscriber.subscribe(channel, async (message) => {
                    const parsedMessage = this.parseMessage(message, channel);
                    if (parsedMessage === null) {
                        // Parsing failed; optionally handle this scenario
                        return;
                    }
                    // Execute all handlers for this channel
                    for (const handler of this.messageHandlers[channel]) {
                        try {
                            await handler(parsedMessage);
                        }
                        catch (handlerError) {
                            console.error(`Error in handler for channel ${channel}:`, handlerError);
                        }
                    }
                });
                console.log(`Subscribed to Redis channel: ${channel}`);
            }
            catch (subscribeError) {
                console.error(`Failed to subscribe to channel ${channel}:`, subscribeError);
                throw subscribeError;
            }
        }
        this.messageHandlers[channel].push(messageHandler);
    }
    /**
     * Unsubscribes a specific message handler from a Redis channel.
     * @param channel - The Redis channel to unsubscribe from.
     * @param messageHandler - The handler to remove.
     */
    async unsubscribe(channel, messageHandler) {
        if (this.messageHandlers[channel]) {
            this.messageHandlers[channel] = this.messageHandlers[channel].filter((handler) => handler !== messageHandler);
            if (this.messageHandlers[channel].length === 0) {
                delete this.messageHandlers[channel];
                try {
                    await this.subscriber.unsubscribe(channel);
                    console.log(`Unsubscribed from Redis channel: ${channel}`);
                }
                catch (unsubscribeError) {
                    console.error(`Failed to unsubscribe from channel ${channel}:`, unsubscribeError);
                    throw unsubscribeError;
                }
            }
        }
    }
    /**
     * Parses the incoming message and handles JSON parsing errors.
     * @param message - The raw message string from Redis.
     * @param channel - The Redis channel name.
     * @returns The parsed message object or null if parsing fails.
     */
    parseMessage(message, channel) {
        try {
            const parsed = JSON.parse(message);
            console.log(`Message received from ${channel}:`, parsed);
            return parsed;
        }
        catch (error) {
            console.error(`Error parsing message from channel ${channel}:`, error);
            return null;
        }
    }
    /**
     * Disconnects the Redis subscriber gracefully.
     */
    async disconnect() {
        if (this.isConnected) {
            try {
                await this.subscriber.disconnect();
                this.isConnected = false;
                console.log('Redis subscriber disconnected.');
            }
            catch (error) {
                console.error('Error disconnecting Redis subscriber:', error);
                throw error;
            }
        }
    }
}
// Exporting a singleton instance of RedisSubscriber
const redisSubscriber = new RedisSubscriber();
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (redisSubscriber);


/***/ }),

/***/ "./src/utils/telegram.ts":
/*!*******************************!*\
  !*** ./src/utils/telegram.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   sendMessageToTelegram: () => (/* binding */ sendMessageToTelegram)
/* harmony export */ });
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var form_data__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! form-data */ "form-data");
/* harmony import */ var form_data__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(form_data__WEBPACK_IMPORTED_MODULE_1__);


// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7237021957:AAEBwCsrCFNLFGArfGys3rJgzqitL9Wsg8k';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '782919745';
/**
 * Sends a text message to the specified Telegram chat.
 * @param message - The message text to send.
 * @param telegram_chat_id - Optional chat ID to send the message to.
 * @returns Returns true if sent successfully, else false.
 */
async function sendMessageToTelegram(message, telegram_chat_id = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const form = new (form_data__WEBPACK_IMPORTED_MODULE_1___default())();
    form.append('chat_id', telegram_chat_id || TELEGRAM_CHAT_ID);
    form.append('text', message);
    try {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(url, form, {
            headers: form.getHeaders(),
        });
        if (response.data.ok) {
            console.log('Message sent to Telegram successfully!');
            return true;
        }
        else {
            console.error('Failed to send message:', response.data);
            return false;
        }
    }
    catch (error) {
        console.error('Exception occurred while sending message:', error.message);
        return false;
    }
}
/**
 * Retrieves updates from the Telegram Bot API.
 * @param offset - The update ID to start fetching from.
 * @returns Returns the JSON response or null on failure.
 */
async function getUpdates(offset = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const params = { timeout: 100 };
    if (offset !== null) {
        params.offset = offset;
    }
    try {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(url, { params });
        if (response.data.ok) {
            return response.data;
        }
        else {
            console.error('Failed to get updates:', response.data);
            return null;
        }
    }
    catch (error) {
        console.error('Exception occurred while getting updates:', error.message);
        return null;
    }
}



/***/ }),

/***/ "./src/utils/wildberries/consts.ts":
/*!*****************************************!*\
  !*** ./src/utils/wildberries/consts.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BOX_TYPES: () => (/* binding */ BOX_TYPES),
/* harmony export */   BOX_TYPES_TEXT_ONLY: () => (/* binding */ BOX_TYPES_TEXT_ONLY),
/* harmony export */   COEFFICIENTS: () => (/* binding */ COEFFICIENTS),
/* harmony export */   COEFFICIENTS_TEXT_ONLY: () => (/* binding */ COEFFICIENTS_TEXT_ONLY),
/* harmony export */   DATES: () => (/* binding */ DATES),
/* harmony export */   WAREHOUSES: () => (/* binding */ WAREHOUSES)
/* harmony export */ });
const BOX_TYPES = {
    2: '📦 Короба',
    5: '⚡  Монопаллеты',
    6: '🗄 Суперсейфф',
};
const BOX_TYPES_TEXT_ONLY = {
    2: 'Короба',
    5: 'Монопаллеты',
    6: 'Суперсейфф',
};
const COEFFICIENTS = {
    0: 'Бесплатная',
    1: '1️⃣ До х1',
    2: '2️⃣ До х2',
    3: '3️⃣ До х3',
    4: '4️⃣ До х4',
    5: '5️⃣ До х5',
    6: '6️⃣ До х6',
};
const COEFFICIENTS_TEXT_ONLY = {
    0: 'Бесплатная',
    1: 'До х1',
    2: 'До х2',
    3: 'До х3',
    4: 'До х4',
    5: 'До х5',
    6: 'До х6',
};
const DATES = {
    today: 'Сегодня',
    tomorrow: 'Завтра',
    week: 'В течение недели',
    month: 'В течение месяца',
    customdates: '🔄 Ввести свои даты',
};
const WAREHOUSES = {
    218987: 'Алматы Атакент',
    204939: 'Астана',
    324108: 'Астана 2',
    206236: 'Белые Столбы',
    301983: 'Волгоград',
    317470: 'Голицыно СГТ',
    300461: 'Гомель 2',
    208941: 'Домодедово',
    1733: 'Екатеринбург - Испытателей 14г',
    300571: 'Екатеринбург - Перспективный 12/2',
    117986: 'Казань',
    206844: 'Калининград',
    303295: 'Клин',
    507: 'Коледино',
    301809: 'Котовск',
    130744: 'Краснодар (Тихорецкая)',
    6145: 'Красноярск',
    211622: 'Минск',
    208277: 'Невинномысск',
    301805: 'Новосемейкино',
    686: 'Новосибирск',
    218210: 'Обухово',
    312617: 'Обухово СГТ',
    106476: 'Оренбург',
    117501: 'Подольск',
    218623: 'Подольск 3',
    301229: 'Подольск 4',
    300169: 'Радумля СГТ',
    301760: 'Рязань (Тюшевское)',
    206298: 'СЦ Абакан',
    300862: 'СЦ Абакан 2',
    316879: 'СЦ Актобе',
    214951: 'СЦ Артем',
    209207: 'СЦ Архангельск',
    302769: 'СЦ Архангельск (ул Ленина)',
    169872: 'СЦ Астрахань',
    302988: 'СЦ Астрахань (Солянка)',
    215020: 'СЦ Байсерке',
    302737: 'СЦ Барнаул',
    172430: 'СЦ Барнаул old',
    210557: 'СЦ Белогорск',
    216476: 'СЦ Бишкек',
    300363: 'СЦ Брест',
    172940: 'СЦ Брянск',
    302856: 'СЦ Видное',
    158751: 'СЦ Владикавказ',
    144649: 'СЦ Владимир',
    210127: 'СЦ Внуково',
    301516: 'СЦ Волгоград 2',
    6144: 'СЦ Волгоград old',
    203631: 'СЦ Вологда',
    300219: 'СЦ Вологда 2',
    211415: 'СЦ Воронеж',
    210515: 'СЦ Вёшки',
    211644: 'СЦ Екатеринбург 2 (Альпинистов)',
    218402: 'СЦ Иваново',
    203632: 'СЦ Иваново (до 03.05.23)',
    218628: 'СЦ Ижевск',
    158140: 'СЦ Ижевск (до 29.05)',
    131643: 'СЦ Иркутск',
    117442: 'СЦ Калуга',
    213849: 'СЦ Кемерово',
    303219: 'СЦ Киров',
    205205: 'СЦ Киров (old)',
    154371: 'СЦ Комсомольская',
    6159: 'СЦ Красногорск',
    205985: 'СЦ Крыловская',
    302335: 'СЦ Кузнецк',
    140302: 'СЦ Курск',
    156814: 'СЦ Курьяновская',
    160030: 'СЦ Липецк',
    117289: 'СЦ Лобня',
    313214: 'СЦ Магнитогорск',
    209211: 'СЦ Махачкала',
    117393: 'СЦ Минск',
    121700: 'СЦ Минск 2',
    205349: 'СЦ Мурманск',
    204952: 'СЦ Набережные Челны',
    118535: 'СЦ Нижний Новгород',
    211470: 'СЦ Нижний Тагил',
    141637: 'СЦ Новокосино',
    206708: 'СЦ Новокузнецк',
    161520: 'СЦ Новосибирск Пасечная',
    303221: 'СЦ Ноябрьск',
    312807: 'СЦ Обухово 2',
    168458: 'СЦ Омск',
    206319: 'СЦ Оренбург',
    315199: 'СЦ Оренбург Центральная',
    218732: 'СЦ Ош',
    216566: 'СЦ Пермь 2',
    208647: 'СЦ Печатники',
    124716: 'СЦ Подрезково',
    209209: 'СЦ Псков',
    207743: 'СЦ Пушкино',
    158311: 'СЦ Пятигорск',
    301920: 'СЦ Пятигорск (Этока)',
    300168: 'СЦ Радумля',
    218616: 'СЦ Ростов-на-Дону',
    118019: 'СЦ Ростов-на-Дону old-1',
    133533: 'СЦ Ростов-на-Дону old-2',
    6156: 'СЦ Рязань',
    117230: 'СЦ Самара',
    158929: 'СЦ Саратов',
    303189: 'СЦ Семей',
    169537: 'СЦ Серов',
    144154: 'СЦ Симферополь',
    210937: 'СЦ Симферополь 2',
    207803: 'СЦ Смоленск 2',
    300987: 'СЦ Смоленск 3',
    209596: 'СЦ Солнцево',
    161003: 'СЦ Сургут',
    209208: 'СЦ Сыктывкар',
    117866: 'СЦ Тамбов',
    218636: 'СЦ Ташкент',
    117456: 'СЦ Тверь',
    204615: 'СЦ Томск',
    117819: 'СЦ Тюмень',
    205104: 'СЦ Ульяновск',
    300711: 'СЦ Уральск',
    149445: 'СЦ Уфа',
    218644: 'СЦ Хабаровск',
    203799: 'СЦ Чебоксары',
    218916: 'СЦ Чебоксары 2',
    132508: 'СЦ Челябинск',
    218225: 'СЦ Челябинск 2',
    311895: 'СЦ Череповец',
    218674: 'СЦ Чита 2',
    207022: 'СЦ Чёрная Грязь',
    312259: 'СЦ Шушары',
    218698: 'СЦ Шымкент',
    158328: 'СЦ Южные Ворота',
    207404: 'СЦ Ярославль',
    2737: 'Санкт-Петербург (Уткина Заводь)',
    159402: 'Санкт-Петербург (Шушары)',
    1680: 'Саратов Депутатская РЦ',
    122259: 'Склад поставщика КБТ 96 ч',
    217081: 'Сц Брянск 2',
    302445: 'Сынково',
    206348: 'Тула',
    303024: 'Улан-Удэ, Ботаническая',
    302222: 'Уфа, Зубово',
    1193: 'Хабаровск',
    321932: 'Чашниково',
    206968: 'Чехов 1, Новоселки вл 11 стр 2',
    210001: 'Чехов 2, Новоселки вл 11 стр 7',
    300864: 'Шелепаново',
    120762: 'Электросталь',
};


/***/ }),

/***/ "@telegraf/session/redis":
/*!******************************************!*\
  !*** external "@telegraf/session/redis" ***!
  \******************************************/
/***/ ((module) => {

module.exports = require("@telegraf/session/redis");

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");

/***/ }),

/***/ "body-parser":
/*!******************************!*\
  !*** external "body-parser" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("body-parser");

/***/ }),

/***/ "bull":
/*!***********************!*\
  !*** external "bull" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("bull");

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");

/***/ }),

/***/ "form-data":
/*!****************************!*\
  !*** external "form-data" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("form-data");

/***/ }),

/***/ "php-serialize":
/*!********************************!*\
  !*** external "php-serialize" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("php-serialize");

/***/ }),

/***/ "playwright-cluster":
/*!*************************************!*\
  !*** external "playwright-cluster" ***!
  \*************************************/
/***/ ((module) => {

module.exports = require("playwright-cluster");

/***/ }),

/***/ "redis":
/*!************************!*\
  !*** external "redis" ***!
  \************************/
/***/ ((module) => {

module.exports = require("redis");

/***/ }),

/***/ "telegraf":
/*!***************************!*\
  !*** external "telegraf" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("telegraf");

/***/ }),

/***/ "telegraf/format":
/*!**********************************!*\
  !*** external "telegraf/format" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("telegraf/format");

/***/ }),

/***/ "uuid":
/*!***********************!*\
  !*** external "uuid" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("uuid");

/***/ }),

/***/ "winston":
/*!**************************!*\
  !*** external "winston" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("winston");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "vm":
/*!*********************!*\
  !*** external "vm" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("vm");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   logger: () => (/* binding */ logger)
/* harmony export */ });
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var body_parser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! body-parser */ "body-parser");
/* harmony import */ var body_parser__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(body_parser__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var winston__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! winston */ "winston");
/* harmony import */ var winston__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(winston__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils_clusterManager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/clusterManager */ "./src/utils/clusterManager.ts");
/* harmony import */ var _telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./telegraf/controllers/telegramController */ "./src/telegraf/controllers/telegramController.ts");
/* harmony import */ var _routes_drafts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./routes/drafts */ "./src/routes/drafts.ts");
/* harmony import */ var _routes_orders__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./routes/orders */ "./src/routes/orders.ts");
/* harmony import */ var _routes_acceptance__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./routes/acceptance */ "./src/routes/acceptance.ts");
/* harmony import */ var _routes_auth__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./routes/auth */ "./src/routes/auth.ts");


 // For logging


// Import Routes




const app = express__WEBPACK_IMPORTED_MODULE_0___default()();
const PORT = process.env.PORT || 3000;
// Configure Winston (optional)
const logger = winston__WEBPACK_IMPORTED_MODULE_2___default().createLogger({
    level: 'info',
    format: winston__WEBPACK_IMPORTED_MODULE_2___default().format.json(),
    defaultMeta: { service: 'nodejs-server' },
    transports: [
        new (winston__WEBPACK_IMPORTED_MODULE_2___default().transports).Console({
            format: winston__WEBPACK_IMPORTED_MODULE_2___default().format.simple(),
        }),
        new (winston__WEBPACK_IMPORTED_MODULE_2___default().transports).File({
            filename: 'combined.log', // Log file name
            format: winston__WEBPACK_IMPORTED_MODULE_2___default().format.json(), // Optional: Can also use format like simple or custom formats
        }),
        // Add more transports like File if needed
    ],
});
// Middleware
app.use(body_parser__WEBPACK_IMPORTED_MODULE_1___default().json());
// Routes
// Webhook route
app.use(_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_4__["default"].webhookCallback('/webhook/telegram'));
app.use('/api/drafts', _routes_drafts__WEBPACK_IMPORTED_MODULE_5__["default"]);
app.use('/api/orders', _routes_orders__WEBPACK_IMPORTED_MODULE_6__["default"]);
app.use('/api/acceptance', _routes_acceptance__WEBPACK_IMPORTED_MODULE_7__["default"]);
app.use('/api/auth', _routes_auth__WEBPACK_IMPORTED_MODULE_8__["default"]);
// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'OK' });
});
// Start Server After Initializing Cluster
const startServer = async () => {
    try {
        await (0,_utils_clusterManager__WEBPACK_IMPORTED_MODULE_3__.initializeCluster)(); // Initialize Playwright Cluster
        app.listen(PORT, () => {
            console.log(`Node.js server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to initialize Playwright cluster:', error.message);
        process.exit(1); // Exit process with failure
    }
};
startServer();
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await (0,_utils_clusterManager__WEBPACK_IMPORTED_MODULE_3__.shutdownCluster)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    await (0,_utils_clusterManager__WEBPACK_IMPORTED_MODULE_3__.shutdownCluster)();
    process.exit(0);
});

})();

/******/ })()
;
//# sourceMappingURL=main.js.map