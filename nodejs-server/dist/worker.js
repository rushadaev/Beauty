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
     * @param ex
     * @returns A Promise that resolves to the User object or null if not found.
     */
    async getUserByTelegramId(telegramId, ex = 3600) {
        const cacheKey = `user_telegram_id_${telegramId}`;
        try {
            const user = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchUserFromApi(telegramId), ex // Cache expiration set to 1 hour (3600 seconds)
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
     * @param id
     * @returns A Promise that resolves to PaginatedNotifications or null if not found.
     */
    async getNotificationsByTelegramId(telegramId, page = 1, perPage = 1, type = 'search', id = null) {
        const cacheKey = `notifications_${type}_telegram_id_${telegramId}_page_${page}`;
        try {
            const notifications = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchNotificationsFromApi(telegramId, page, perPage, type, id), 60 // Cache expiration set to 2 hours (7200 seconds)
            );
            return notifications;
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            return null;
        }
    }
    async createNotificationByTelegramId(telegramId, settings, type = 'notification') {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/notifications/telegram/${telegramId}`, {
                settings: Object.assign(Object.assign({}, settings), { type })
            });
            return response.data;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Error creating notification');
        }
    }
    async updateNotificationById(notificationId, settings) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/notifications/telegram/update/${notificationId}`, {
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
     * @param id
     * @returns A Promise that resolves to PaginatedNotifications.
     */
    async fetchNotificationsFromApi(telegramId, page, perPage, type, id) {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/notifications/telegram/${telegramId}`, {
            params: {
                page,
                per_page: perPage,
                type,
                id
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
    async getProductsByTelegramId(telegramId, page = 1, perPage = 10) {
        const cacheKey = `products_telegram_id_${telegramId}`;
        try {
            // Fetch products from cache or API
            const products = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchProductsFromApi(telegramId), 3600 * 24 // Cache expiration set to 24 hours (86400 seconds)
            );
            // Paginate products
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / perPage);
            page = Math.max(1, Math.min(totalPages, page));
            const start = (page - 1) * perPage;
            const currentProducts = products.slice(start, start + perPage);
            // Prepare response with pagination details
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                products: currentProducts,
                allProducts: products
            };
        }
        catch (error) {
            console.error('Error fetching products:', error);
            return null;
        }
    }
    async getTaskByTelegramId(telegramId, page = 1, perPage = 10) {
        const cacheKey = `task_telegram_id_${telegramId}`;
        try {
            // Fetch products from cache or API
            const tasks = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchTasksFromApi(telegramId), 10 // Cache expiration set to 24 hours (86400 seconds)
            );
            // Paginate products
            const totalTasks = tasks.length;
            const totalPages = Math.ceil(totalTasks / perPage);
            page = Math.max(1, Math.min(totalPages, page));
            const start = (page - 1) * perPage;
            const currentTasks = tasks.slice(start, start + perPage);
            // Prepare response with pagination details
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                tasks: currentTasks,
                allTasks: tasks
            };
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
    }
    async closeTask(taskId, telegramId) {
        try {
            const cacheKey = `task_telegram_id_${telegramId}_task_id_${taskId}`;
            const cacheKey2 = `task_telegram_id_${telegramId}`;
            cacheKey && await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forget(cacheKey);
            cacheKey2 && await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forget(cacheKey2);
            await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/tasks/close/${taskId}`);
        }
        catch (error) {
            console.error('Error closing task:', error);
            throw new Error('Error closing task');
        }
    }
    async getTaskById(telegramId, task_id) {
        const cacheKey = `task_telegram_id_${telegramId}_task_id_${task_id}`;
        try {
            // Fetch products from cache or API
            const task = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchTasksFromApi(telegramId, task_id), 10 // Cache expiration set to 24 hours (86400 seconds)
            );
            // Prepare response with pagination details
            return task;
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
    }
    async getOneProductByTelegramId(telegramId, product_id) {
        const cacheKey = `product_telegram_id_${telegramId}_product_id_${product_id}`;
        try {
            // Fetch products from cache or API
            const product = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchProductsFromApi(telegramId, product_id), 86400 // Cache expiration set to 24 hours (86400 seconds)
            );
            // Prepare response with pagination details
            return product;
        }
        catch (error) {
            console.error('Error fetching products:', error);
            return null;
        }
    }
    async fetchProductsFromApi(telegramId, product_id = null) {
        try {
            if (product_id === null) {
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/yclients/goods/${telegramId}`);
                return response.data;
            }
            else {
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/yclients/goods/${telegramId}&product_id=${product_id}`);
                return response.data;
            }
        }
        catch (error) {
            console.error('Error fetching products:', error);
            throw new Error('Error fetching products');
        }
    }
    async fetchTasksFromApi(telegramId, task_id = null) {
        try {
            if (task_id === null) {
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/tasks?telegram_id=${telegramId}`);
                return response.data;
            }
            else {
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/tasks?telegram_id=${telegramId}&task_id=${task_id}`);
                return response.data;
            }
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            throw new Error('Error fetching tasks');
        }
    }
    async getUsersByTelegramId(telegramId, page = 1, perPage = 10) {
        const cacheKey = `users_telegram_id_${telegramId}`;
        try {
            // Fetch products from cache or API
            const users = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchUsersFromApi(telegramId), 10 // Cache expiration set to 24 hours (86400 seconds)
            );
            // Paginate products
            const totalUsers = users.length;
            const totalPages = Math.ceil(totalUsers / perPage);
            page = Math.max(1, Math.min(totalPages, page));
            const start = (page - 1) * perPage;
            const currentUsers = users.slice(start, start + perPage);
            // Prepare response with pagination details
            return {
                actual_amounts: undefined,
                currentPage: page,
                totalPages,
                tasks: currentUsers,
                allTasks: users
            };
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
    }
    async getUserById(telegramId, user_id) {
        const cacheKey = `user_telegram_id_${telegramId}_user_id_${user_id}`;
        try {
            // Fetch products from cache or API
            const user = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchUsersFromApi(telegramId, user_id), 10 // Cache expiration set to 24 hours (86400 seconds)
            );
            // Prepare response with pagination details
            return user;
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            return null;
        }
    }
    async submitRegistration(data) {
        var _a;
        try {
            const formattedData = {
                full_name: data.fullName,
                birth_date: this.formatDate(data.birthDate),
                passport_series_number: data.passport,
                passport_issued_by: (_a = data.issuedBy) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
                passport_issue_date: this.formatDate(data.issueDate),
                passport_division_code: data.divisionCode,
                registration_address: data.registrationAddress,
                inn: data.inn,
                account_number: data.accountNumber,
                bank_name: data.bankName,
                bik: data.bik,
                correspondent_account: data.corrAccount,
                bank_inn: data.bankInn,
                bank_kpp: data.bankKpp,
                phone: data.phone,
                email: data.email,
                has_med_book: data.hasMedBook,
                med_book_expiry: data.medBookExpiry ? this.formatDate(data.medBookExpiry) : null,
                has_education_cert: data.hasEducationCert,
                education_cert_photo: data.educationCertPhoto,
                is_self_employed: data.isSelfEmployed,
                status: 'pending'
            };
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations`, formattedData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error submitting registration:', error);
            throw error;
        }
    }
    // Добавьте также вспомогательный метод, если его еще нет
    formatDate(dateStr) {
        if (!dateStr)
            return null;
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month}-${day}`;
    }
    async generateContract(data) {
        var _a;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/generate-contract`, data, {
                headers: {
                    'Accept': 'application/zip',
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });
            if (!response.data || response.data.length === 0) {
                throw new Error('Empty response received');
            }
            // Проверяем заголовки ответа
            const contentType = response.headers['content-type'];
            if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json')) {
                // Если получили JSON с ошибкой
                const errorText = new TextDecoder().decode(response.data);
                const error = JSON.parse(errorText);
                throw new Error(error.message || 'Contract generation failed');
            }
            return Buffer.from(response.data);
        }
        catch (error) {
            console.error('Contract generation error:', {
                message: error.message,
                response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data
            });
            throw error;
        }
    }
    async logout(telegramId) {
        try {
            // Очищаем токен в Redis через бэкенд
            await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/auth/logout`, {
                telegram_id: telegramId
            });
            // Очищаем локальный кэш
            const cacheKey = `user_telegram_id_${telegramId}`;
            await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forget(cacheKey);
        }
        catch (error) {
            console.error('Logout error:', error);
            // Даже если запрос завершился с ошибкой, очищаем локальный кэш
            const cacheKey = `user_telegram_id_${telegramId}`;
            await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forget(cacheKey);
            // Не пробрасываем ошибку дальше, просто логируем
        }
    }
    async updateMasterDescription(phone, password, description) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        try {
            console.log('Starting master description update:', {
                phone,
                descriptionLength: description.length
            });
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/masters/update-description`, {
                phone,
                password,
                description
            });
            console.log('Full update description response:', {
                status: response.status,
                success: (_a = response.data) === null || _a === void 0 ? void 0 : _a.success,
                message: (_b = response.data) === null || _b === void 0 ? void 0 : _b.message,
                debug: (_c = response.data) === null || _c === void 0 ? void 0 : _c.debug // Для отладочной информации с бэкенда
            });
            if (!((_d = response.data) === null || _d === void 0 ? void 0 : _d.success)) {
                console.error('Update description failed:', {
                    message: (_e = response.data) === null || _e === void 0 ? void 0 : _e.message,
                    debug: (_f = response.data) === null || _f === void 0 ? void 0 : _f.debug,
                    responseData: response.data
                });
                return false;
            }
            return true;
        }
        catch (error) {
            // Расширенное логирование ошибки
            console.error('Error updating master description:', {
                errorMessage: error === null || error === void 0 ? void 0 : error.message,
                errorResponse: {
                    status: (_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.status,
                    statusText: (_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.statusText,
                    data: (_j = error === null || error === void 0 ? void 0 : error.response) === null || _j === void 0 ? void 0 : _j.data,
                    debug: (_l = (_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.debug
                },
                requestData: {
                    phone,
                    descriptionLength: description.length,
                    url: `${this.laravelApiUrl}/masters/update-description`
                }
            });
            // Специфичные ошибки
            if (((_m = error === null || error === void 0 ? void 0 : error.response) === null || _m === void 0 ? void 0 : _m.status) === 401) {
                throw new Error('Неверный логин или пароль');
            }
            if (((_o = error === null || error === void 0 ? void 0 : error.response) === null || _o === void 0 ? void 0 : _o.status) === 404) {
                throw new Error('Мастер не найден в системе');
            }
            throw new Error('Не удалось обновить описание: ' +
                (((_q = (_p = error === null || error === void 0 ? void 0 : error.response) === null || _p === void 0 ? void 0 : _p.data) === null || _q === void 0 ? void 0 : _q.message) || error.message));
        }
    }
    async fetchUsersFromApi(telegramId, user_id = null) {
        try {
            if (user_id === null) {
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/staff?telegram_id=${telegramId}`);
                return response.data;
            }
            else {
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/staff?telegram_id=${telegramId}&user_id=${user_id}`);
                return response.data;
            }
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            throw new Error('Error fetching tasks');
        }
    }
    async auth(phone, password, telegram_id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/auth`, {
                phone,
                password,
                telegram_id
            });
            return response.data;
        }
        catch (error) {
            console.error('Error authenticating:', error);
            throw new Error('Error authenticating');
        }
    }
    // В LaravelService добавляем новый метод:
    async uploadSignedDocuments(registrationId, files) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/${registrationId}/upload-signed-documents`, {
                files,
                status: 'documents_uploaded' // Обновляем статус регистрации
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error uploading signed documents:', error);
            throw error;
        }
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new LaravelService());


/***/ }),

/***/ "./src/telegraf/controllers/telegramController.ts":
/*!********************************************************!*\
  !*** ./src/telegraf/controllers/telegramController.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   sendMessageToClient: () => (/* binding */ sendMessageToClient)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_warehouseBot__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../services/warehouseBot */ "./src/telegraf/services/warehouseBot.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @telegraf/session/redis */ "@telegraf/session/redis");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _services_scenes_mainScene__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../services/scenes/mainScene */ "./src/telegraf/services/scenes/mainScene.ts");
/* harmony import */ var _services_scenes_tasks_tasksScene__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../services/scenes/tasks/tasksScene */ "./src/telegraf/services/scenes/tasks/tasksScene.ts");
/* harmony import */ var _utils_cabinetGate__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../utils/cabinetGate */ "./src/telegraf/utils/cabinetGate.ts");
/* harmony import */ var _services_scenes_salary_salaryScene__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../services/scenes/salary/salaryScene */ "./src/telegraf/services/scenes/salary/salaryScene.ts");
/* harmony import */ var _services_scenes_notifications_notificationsScene__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../services/scenes/notifications/notificationsScene */ "./src/telegraf/services/scenes/notifications/notificationsScene.ts");
/* harmony import */ var _services_scenes_employment_employmentScene__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../services/scenes/employment/employmentScene */ "./src/telegraf/services/scenes/employment/employmentScene.ts");
/* harmony import */ var _services_scenes_warehouse_warehouseScene__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../services/scenes/warehouse/warehouseScene */ "./src/telegraf/services/scenes/warehouse/warehouseScene.ts");
/* harmony import */ var _services_scenes_staff_staffScene__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../services/scenes/staff/staffScene */ "./src/telegraf/services/scenes/staff/staffScene.ts");
/* harmony import */ var _services_scenes_notifications_createNotificationScene__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../services/scenes/notifications/createNotificationScene */ "./src/telegraf/services/scenes/notifications/createNotificationScene.ts");
/* harmony import */ var _services_scenes_notifications_notificationsListScene__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../services/scenes/notifications/notificationsListScene */ "./src/telegraf/services/scenes/notifications/notificationsListScene.ts");
/* harmony import */ var _services_scenes_notifications_editNotificationScene__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../services/scenes/notifications/editNotificationScene */ "./src/telegraf/services/scenes/notifications/editNotificationScene.ts");
/* harmony import */ var _services_scenes_warehouse_createNotificationScene__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../services/scenes/warehouse/createNotificationScene */ "./src/telegraf/services/scenes/warehouse/createNotificationScene.ts");
/* harmony import */ var _services_scenes_warehouse_editNotificationScene__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../services/scenes/warehouse/editNotificationScene */ "./src/telegraf/services/scenes/warehouse/editNotificationScene.ts");


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
const stage = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.Stage([
    _services_scenes_mainScene__WEBPACK_IMPORTED_MODULE_4__.mainScene,
    _services_scenes_tasks_tasksScene__WEBPACK_IMPORTED_MODULE_5__.tasksScene,
    _services_scenes_salary_salaryScene__WEBPACK_IMPORTED_MODULE_7__.salaryScene,
    _services_scenes_notifications_notificationsScene__WEBPACK_IMPORTED_MODULE_8__.notifictationsScene,
    _services_scenes_notifications_createNotificationScene__WEBPACK_IMPORTED_MODULE_12__.createNotifictationScene,
    _services_scenes_notifications_notificationsListScene__WEBPACK_IMPORTED_MODULE_13__.notificationsListScene,
    _services_scenes_employment_employmentScene__WEBPACK_IMPORTED_MODULE_9__.employmentScene,
    _services_scenes_warehouse_warehouseScene__WEBPACK_IMPORTED_MODULE_10__.warehouseScene,
    _services_scenes_staff_staffScene__WEBPACK_IMPORTED_MODULE_11__.staffScene,
    _services_scenes_notifications_editNotificationScene__WEBPACK_IMPORTED_MODULE_14__.editNotificationScene,
    _services_scenes_warehouse_warehouseScene__WEBPACK_IMPORTED_MODULE_10__.warehouseScene,
    _services_scenes_warehouse_createNotificationScene__WEBPACK_IMPORTED_MODULE_15__.createNotifictationScene,
    _services_scenes_warehouse_editNotificationScene__WEBPACK_IMPORTED_MODULE_16__.editNotificationScene
]);
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
    await ctx.scene.enter('main');
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
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_6__.cabinetGate)(ctx, 'autoBookingWizard');
});
_services_scenes_mainScene__WEBPACK_IMPORTED_MODULE_4__.mainScene.action('payments', async (ctx) => {
    await ctx.scene.enter('subscriptionWizard');
});
bot.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});
bot.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('active_notifications');
});
bot.action('warehouse_notification', async (ctx) => {
    await ctx.scene.enter('warehouse_create_notification');
});
bot.action('warehouse_list', async (ctx) => {
    await ctx.scene.enter('warehouse_edit_notification');
});
bot.on('callback_query', async (ctx) => {
    await ctx.answerCbQuery('👌');
});
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

/***/ "./src/telegraf/services/scenes/employment/employmentActions.ts":
/*!**********************************************************************!*\
  !*** ./src/telegraf/services/scenes/employment/employmentActions.ts ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   showApplications: () => (/* binding */ showApplications),
/* harmony export */   showEmployment: () => (/* binding */ showEmployment)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);

const defaultButtons = [
    //Посмотреть заявки
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Заявки', 'viewApplications')],
    //Трудоустроить
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Трудоустроить', 'employment')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const messageText = `[трудоустройство]`;
    const buttonsArray = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, buttonsArray);
        }
        catch (error) {
            await ctx.reply(messageText, buttonsArray);
        }
    }
    else {
        await ctx.reply(messageText, buttonsArray);
    }
};
const showApplications = async (ctx) => {
    const messageText = `Тут выводим активные заявки на трудоустройство`;
    const buttonsArray = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtonsMenuOnly]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, buttonsArray);
        }
        catch (error) {
            await ctx.reply(messageText, buttonsArray);
        }
    }
    else {
        await ctx.reply(messageText, buttonsArray);
    }
};
const showEmployment = async (ctx) => {
    const messageText = `Перейдите в @Beauty_bot_master_bot по кнопке ниже, чтобы подать заявку на трудоустройство`;
    //@Beauty_bot_master_bot
    const go_to_bot = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('Перейти в бота', 'https://t.me/Beauty_bot_master_bot?start=registration');
    const buttonsArray = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[go_to_bot], ...defaultButtonsMenuOnly]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, buttonsArray);
        }
        catch (error) {
            await ctx.reply(messageText, buttonsArray);
        }
    }
    else {
        await ctx.reply(messageText, buttonsArray);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/employment/employmentScene.ts":
/*!********************************************************************!*\
  !*** ./src/telegraf/services/scenes/employment/employmentScene.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   employmentScene: () => (/* binding */ employmentScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _employmentActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./employmentActions */ "./src/telegraf/services/scenes/employment/employmentActions.ts");


const employmentScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('employment');
const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
// Define the enter handler
employmentScene.enter(async (ctx) => {
    await (0,_employmentActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
});
employmentScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});
//viewApplications
//employment
employmentScene.action('viewApplications', async (ctx) => {
    await (0,_employmentActions__WEBPACK_IMPORTED_MODULE_1__.showApplications)(ctx);
});
employmentScene.action('employment', async (ctx) => {
    await (0,_employmentActions__WEBPACK_IMPORTED_MODULE_1__.showEmployment)(ctx);
});


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
    const messageText = `главный экран для управляющего`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('задачи', 'tasks')
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('расчет зп', 'salary'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('уведомления', 'notifications'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('трудоустройство', 'employment'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('управление складом', 'warehouse'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('управление персоналом', 'staff'),
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
mainScene.action('tasks', async (ctx) => {
    await ctx.scene.enter('tasks');
});
mainScene.action('salary', async (ctx) => {
    await ctx.scene.enter('salary');
});
mainScene.action('notifications', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_1__.cabinetGate)(ctx, 'notifications');
});
mainScene.action('employment', async (ctx) => {
    await ctx.scene.enter('employment');
});
mainScene.action('warehouse', async (ctx) => {
    await ctx.scene.enter('warehouse');
});
mainScene.action('staff', async (ctx) => {
    await ctx.scene.enter('staff');
});
mainScene.action('cabinets', async (ctx) => {
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_1__.cabinetGate)(ctx, 'showCabinetsScene');
});


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/createNotificationActions.ts":
/*!*********************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/createNotificationActions.ts ***!
  \*********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   promptForDateTime: () => (/* binding */ promptForDateTime),
/* harmony export */   promptForNotificationType: () => (/* binding */ promptForNotificationType),
/* harmony export */   promptForSum: () => (/* binding */ promptForSum),
/* harmony export */   sendSuccessMessage: () => (/* binding */ sendSuccessMessage)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");




const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Создать уведомление

Введите данные по уведомлению: 
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Название уведомления')}`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите название уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForSum = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_sum')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Какая сумма для оплаты?
(если суммы нет, то пропустите это поле)`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите сумму для оплаты');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForDateTime = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Введите дату и время уведомления в формате:
dd.mm.yyyy hh:mm`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите дату и время уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForNotificationType = async (ctx) => {
    //keyboard one time or constant notification
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Одноразовое уведомление', 'notification_one_time')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Постоянное уведомление', 'notification_constant')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Уведомление разовое или постоянное?`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Выберите тип уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const sendSuccessMessage = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Создать еще', 'create_notification')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Все уведомления', 'active_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Уведомление создано
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Название уведомления')}: ${ctx.scene.session.notificationForm.name}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Сумма для оплаты')}: ${ctx.scene.session.notificationForm.sum}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Дата и время уведомления')}: ${ctx.scene.session.notificationForm.dateTime}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Тип уведомления')}: ${ctx.scene.session.notificationForm.type}`;
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].createNotificationByTelegramId(ctx.from.id, ctx.scene.session.notificationForm);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Уведомление создано');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/createNotificationScene.ts":
/*!*******************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/createNotificationScene.ts ***!
  \*******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createNotifictationScene: () => (/* binding */ createNotifictationScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _createNotificationActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./createNotificationActions */ "./src/telegraf/services/scenes/notifications/createNotificationActions.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_2__);



const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const handleNameInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleNameInput.on('text', async (ctx) => {
    const name = ctx.message.text;
    ctx.scene.session.notificationForm.name = name;
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForSum)(ctx);
});
const handleSumInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForDateTime)(ctx);
});
handleSumInput.action('notification_skip_sum', async (ctx) => {
    ctx.scene.session.notificationForm.sum = null;
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForDateTime)(ctx);
});
const handleDateTimeInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDateTimeInput.on('text', async (ctx) => {
    //date in format dd.mm.yyyy hh:mm
    const input = ctx.message.text;
    // Regular expression to match dd.mm.yyyy hh:mm
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;
    // Find dates that do not match the regex
    const invalidFormatDate = !dateRegex.test(input);
    if (invalidFormatDate) {
        const errorMessage = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_2__.fmt) `❌ Некорректный формат даты: ${invalidFormatDate}.
Пожалуйста, введите дату в формате ГГГГ.ММ.ДД. Например:
• 2025.08.10 12:00`;
        // Send the error message with the default navigation buttons
        await ctx.reply(errorMessage, Object.assign(Object.assign({}, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(noKeyboard)), { link_preview_options: {
                is_disabled: true
            } }));
        return; // Stay on the current step
    }
    // If all dates are valid, save them to the session
    ctx.scene.session.notificationForm.dateTime = ctx.message.text;
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForNotificationType)(ctx);
});
const handleNotificationTypeInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleNotificationTypeInput.action('notification_one_time', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'one_time';
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
handleNotificationTypeInput.action('notification_constant', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'constant';
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
const createNotifictationScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('create_notification', 
// Step 1: Prompt to enter name
async (ctx) => {
    ctx.scene.session.notificationForm = {
        name: null,
        sum: null,
        dateTime: null,
        type: null,
    };
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
}, 
// Step 2: Save name and prompt to enter sum
handleNameInput, 
// Step 3: Save sum and prompt to enter date
handleSumInput, 
// Step 4: Save date and prompt to enter type
handleDateTimeInput, 
// Step 5: Save type and sucecss
handleNotificationTypeInput);
createNotifictationScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
createNotifictationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/editNotificationActions.ts":
/*!*******************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/editNotificationActions.ts ***!
  \*******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   promptForDateTime: () => (/* binding */ promptForDateTime),
/* harmony export */   promptForNotificationType: () => (/* binding */ promptForNotificationType),
/* harmony export */   promptForSum: () => (/* binding */ promptForSum),
/* harmony export */   sendSuccessMessage: () => (/* binding */ sendSuccessMessage)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");




const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_name')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    ctx.scene.session.notificationForm = ctx.session.notificationForm;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Редактировать уведомление

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Текущее название уведомления: ')} ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.notificationForm.name)}

Введите новое название уведомления или нажмите пропустить
`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите название уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForSum = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_sum')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Какая сумма для оплаты?

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Текущая сумма оплаты: ')} ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.notificationForm.sum)}

Введите новую сумму для оплаты или нажмите пропустить
`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите сумму для оплаты');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForDateTime = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_date')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Введите дату и время уведомления в формате:
dd.mm.yyyy hh:mm

 ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Текущая дата и время: ')} ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.notificationForm.dateTime)}
 
 Введите новую дату и время или нажмите пропустить
`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите дату и время уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForNotificationType = async (ctx) => {
    //keyboard one time or constant notification
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_type')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Одноразовое уведомление', 'notification_one_time')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Постоянное уведомление', 'notification_constant')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Уведомление разовое или постоянное?
    
    ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Текущий тип уведомления: ')} ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.notificationForm.type)}
    
    Выберите тип уведомления или нажмите пропустить
    `;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Выберите тип уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const sendSuccessMessage = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Все уведомления', 'active_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Уведомление обновлено: 
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Название уведомления')}: ${ctx.scene.session.notificationForm.name}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Сумма для оплаты')}: ${ctx.scene.session.notificationForm.sum}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Дата и время уведомления')}: ${ctx.scene.session.notificationForm.dateTime}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Тип уведомления')}: ${ctx.scene.session.notificationForm.type}`;
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].updateNotificationById(ctx.session.notificationForm.id, ctx.scene.session.notificationForm);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Уведомление создано');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/editNotificationScene.ts":
/*!*****************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/editNotificationScene.ts ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   editNotificationScene: () => (/* binding */ editNotificationScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _editNotificationActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./editNotificationActions */ "./src/telegraf/services/scenes/notifications/editNotificationActions.ts");


const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const handleNameInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleNameInput.on('text', async (ctx) => {
    const name = ctx.message.text;
    ctx.scene.session.notificationForm.name = name;
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForSum)(ctx);
});
const handleSumInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForDateTime)(ctx);
});
//notification_skip_name
handleNameInput.action('notification_skip_name', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForSum)(ctx);
});
handleSumInput.action('notification_skip_sum', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForDateTime)(ctx);
});
const handleDateTimeInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDateTimeInput.on('text', async (ctx) => {
    ctx.scene.session.notificationForm.dateTime = ctx.message.text;
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForNotificationType)(ctx);
});
//notification_skip_date
handleDateTimeInput.action('notification_skip_date', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForNotificationType)(ctx);
});
const handleNotificationTypeInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleNotificationTypeInput.action('notification_one_time', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'one_time';
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
//notification_skip_type
handleNotificationTypeInput.action('notification_skip_type', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
handleNotificationTypeInput.action('notification_constant', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'constant';
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
const editNotificationScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('edit_notification', 
// Step 1: Prompt to enter name
async (ctx) => {
    ctx.scene.session.notificationForm = {
        name: null,
        sum: null,
        dateTime: null,
        type: null,
    };
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
}, 
// Step 2: Save name and prompt to enter sum
handleNameInput, 
// Step 3: Save sum and prompt to enter date
handleSumInput, 
// Step 4: Save date and prompt to enter type
handleDateTimeInput, 
// Step 5: Save type and sucecss
handleNotificationTypeInput);
editNotificationScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
editNotificationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/notificationActions.ts":
/*!***************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/notificationActions.ts ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   notificationListHandler: () => (/* binding */ notificationListHandler)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");



const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Создать уведомление', 'create_notification')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Активные уведомления', 'active_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `что хотите сделать?`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};
const notificationListHandler = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Активные уведомления:`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Активные уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending notification list message:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/notificationsListScene.ts":
/*!******************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/notificationsListScene.ts ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   notificationsListScene: () => (/* binding */ notificationsListScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_3__);




const notificationsListScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('active_notifications');
// Since type is always 'notifications', no need for type mapping
const listNotifications = async (ctx) => {
    // Initialize page number in session if not set
    if (!ctx.session.searchRequestsPage) {
        ctx.session.searchRequestsPage = 1;
    }
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Entered searchRequestsScene', { session: ctx.scene.session });
    const currentPage = ctx.session.searchRequestsPage;
    const perPage = 1; // Adjust as needed
    const typeText = 'уведомлений'; // Since type is always 'notifications'
    const messageTextHeader = `🫡 Список активных заявок на ${typeText} (Страница ${currentPage})`;
    try {
        // Fetch paginated notifications
        const paginatedNotifications = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getNotificationsByTelegramId(ctx.from.id, currentPage, perPage, 'notification' // Fixed type
        );
        console.log('paginatedNotifications:', paginatedNotifications);
        if (!paginatedNotifications || paginatedNotifications.data.length === 0) {
            const noNotificationsText = `📭 У вас нет активных ${typeText}.`;
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
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error getting notifications:', error);
            await ctx.answerCbQuery('Произошла ошибка [0]', {
                show_alert: true,
            });
            return;
        }
        const name = notification.settings.name;
        const sum = notification.settings.sum;
        const dateTime = notification.settings.dateTime;
        const notificationType = notification.settings.type;
        // Assuming 'status' field exists
        const statusText = notification.status === 'started'
            ? 'ищем'
            : (notification.status === 'finished' ? 'нашли' : 'вышло время');
        // Format the notification message
        const messageText = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.fmt) `
🫡 ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.bold) `Список активных ${typeText}`}

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.bold) `Название:`} ${name}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.bold) `Сумма:`} ${sum}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.bold) `Время:`} ${dateTime}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.bold) `Тип:`} ${notificationType}
${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.bold) `Статус:`} ${statusText}

Страница: ${currentPage} из ${paginatedNotifications.last_page}
        `;
        // Build pagination buttons
        const buttons = [];
        const buttonsPagination = [];
        if (paginatedNotifications.prev_page_url) {
            buttonsPagination.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⬅️', 'notifications_prev'));
        }
        if (paginatedNotifications.next_page_url) {
            buttonsPagination.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➡️', 'notifications_next'));
        }
        const buttonDelete = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Удалить', `delete_${notification.id}`);
        const buttonEdit = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Редактировать', `edit_${notification.id}`);
        buttons.push([buttonDelete]);
        buttons.push([buttonEdit]);
        if (buttonsPagination.length > 0) {
            buttons.push(buttonsPagination);
        }
        // Always show 'Main Menu' and 'Back' buttons
        buttons.push([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]);
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons, { columns: 2 }); // Adjust columns as per button arrangement
        ctx.session.notifications = paginatedNotifications.data;
        if (ctx.callbackQuery && ctx.callbackQuery.message) {
            try {
                // Edit existing message if interaction is from a callback query
                await ctx.editMessageText(messageText, Object.assign(Object.assign({}, keyboard), { parse_mode: 'Markdown' }));
            }
            catch (error) {
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error sending notifications message:', error);
                await ctx.reply(messageText, Object.assign(Object.assign({}, keyboard), { parse_mode: 'Markdown' }));
            }
        }
        else {
            // Otherwise, send a new message
            await ctx.reply(messageText, Object.assign(Object.assign({}, keyboard), { parse_mode: 'Markdown' }));
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error getting notifications:', error);
    }
};
notificationsListScene.enter(async (ctx) => {
    // Since there's only one type, no need to ask user to select type
    await listNotifications(ctx);
});
const listNotificationsAction = async (ctx) => {
    await listNotifications(ctx);
};
notificationsListScene.action('notifications_next', async (ctx) => {
    if (ctx.session.searchRequestsPage) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Incrementing page number');
        ctx.session.searchRequestsPage += 1;
        await listNotificationsAction(ctx);
    }
    else {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].warn('Page number not set');
        // If for some reason the page isn't set, reset to page 1
        ctx.session.searchRequestsPage = 1;
        await ctx.scene.reenter();
    }
});
// Handle 'Previous' button callback
notificationsListScene.action('notifications_prev', async (ctx) => {
    if (ctx.session.searchRequestsPage && ctx.session.searchRequestsPage > 1) {
        ctx.session.searchRequestsPage -= 1;
        await listNotificationsAction(ctx);
    }
    else {
        await ctx.answerCbQuery('Вы уже на первой странице.', { show_alert: true });
    }
});
notificationsListScene.action(/delete_(.*)/, async (ctx) => {
    const notificationId = ctx.match[1];
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].deleteNotification(notificationId);
        await ctx.answerCbQuery('Заявка удалена', { show_alert: true });
        await ctx.scene.reenter();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error deleting notification:', error);
        await ctx.answerCbQuery('Произошла ошибка при удалении заявки.', { show_alert: true });
    }
});
notificationsListScene.action(/edit_(.*)/, async (ctx) => {
    const notificationId = ctx.match[1];
    ctx.session.notificationId = notificationId;
    console.log('notificationId:', notificationId);
    console.log('ctx.session.notifications:', ctx.session.notifications);
    console.log('ctx.session.notifications.find((n: any) => n.id == notificationId):', ctx.session.notifications.find((n) => n.id == notificationId).settings.name);
    ctx.session.notificationForm = {
        id: notificationId,
        name: ctx.session.notifications.find((n) => n.id == notificationId).settings.name,
        sum: ctx.session.notifications.find((n) => n.id == notificationId).settings.sum,
        dateTime: ctx.session.notifications.find((n) => n.id == notificationId).settings.dateTime,
        type: ctx.session.notifications.find((n) => n.id == notificationId).settings.type,
    };
    await ctx.scene.enter('edit_notification');
});
notificationsListScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (notificationsListScene);


/***/ }),

/***/ "./src/telegraf/services/scenes/notifications/notificationsScene.ts":
/*!**************************************************************************!*\
  !*** ./src/telegraf/services/scenes/notifications/notificationsScene.ts ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   notifictationsScene: () => (/* binding */ notifictationsScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _notificationActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./notificationActions */ "./src/telegraf/services/scenes/notifications/notificationActions.ts");


const notifictationsScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('notifications');
// Define the enter handler
notifictationsScene.enter(async (ctx) => {
    await (0,_notificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
});
const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
notifictationsScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
notifictationsScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});
notifictationsScene.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});
notifictationsScene.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('active_notifications');
});


/***/ }),

/***/ "./src/telegraf/services/scenes/salary/salaryActions.ts":
/*!**************************************************************!*\
  !*** ./src/telegraf/services/scenes/salary/salaryActions.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);

const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const messageText = `Тут будет расчет зп`;
    const buttonsArray = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtonsMenuOnly]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, buttonsArray);
        }
        catch (error) {
            await ctx.reply(messageText, buttonsArray);
        }
    }
    else {
        await ctx.reply(messageText, buttonsArray);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/salary/salaryScene.ts":
/*!************************************************************!*\
  !*** ./src/telegraf/services/scenes/salary/salaryScene.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   salaryScene: () => (/* binding */ salaryScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _salaryActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./salaryActions */ "./src/telegraf/services/scenes/salary/salaryActions.ts");


const salaryScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('salary');
const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
// Define the enter handler
salaryScene.enter(async (ctx) => {
    await (0,_salaryActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
});
salaryScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});


/***/ }),

/***/ "./src/telegraf/services/scenes/staff/staffActions.ts":
/*!************************************************************!*\
  !*** ./src/telegraf/services/scenes/staff/staffActions.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   userBlockHandler: () => (/* binding */ userBlockHandler)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");



const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const page = ctx.session.page || 1; // Store page in session for navigation
    const perPage = 10; // Adjust perPage if needed
    try {
        const productData = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getUsersByTelegramId(ctx.from.id, page, perPage);
        console.log('productData', productData);
        if (!productData || productData.tasks.length === 0) {
            await ctx.reply('Нет доступных сотрудников', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }
        const { tasks, currentPage, totalPages } = productData;
        // Generate buttons for products
        const buttons = tasks.map(task => {
            return [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(task.name, `user_${task.id}`)
            ];
        });
        // Add navigation buttons
        const navigationButtons = [];
        if (currentPage > 1) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('← Назад', `tasks_page_${currentPage - 1}`));
        }
        if (currentPage < totalPages) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Вперед →', `tasks_page_${currentPage + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }
        buttons.push(...defaultButtonsMenuOnly);
        const message = `[управление персоналом]
В этом блоке вы можете увидеть всех мастеров

[списком в кнопках выводи карточки персонала]`;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons);
        try {
            await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
            await ctx.answerCbQuery('Персонал');
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }
        await ctx.answerCbQuery();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке персонала', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
};
const userBlockHandler = async (ctx) => {
    const user_id = ctx.scene.session.user_id;
    const userOne = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getUserById(ctx.from.id, user_id);
    const user = userOne[0];
    const message = `[карточка персонала]
    
Имя: ${user.name}
Телефон: ${user.phone}
Email: ${user.email}
`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Персонал');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/staff/staffScene.ts":
/*!**********************************************************!*\
  !*** ./src/telegraf/services/scenes/staff/staffScene.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   staffScene: () => (/* binding */ staffScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _staffActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./staffActions */ "./src/telegraf/services/scenes/staff/staffActions.ts");


const staffScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('staff');
const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
// Define the enter handler
staffScene.enter(async (ctx) => {
    await (0,_staffActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
});
staffScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});
staffScene.action(/^user_(\d+)$/, async (ctx) => {
    const user_id = parseInt(ctx.match[1], 10);
    ctx.scene.session.user_id = user_id;
    return (0,_staffActions__WEBPACK_IMPORTED_MODULE_1__.userBlockHandler)(ctx);
});


/***/ }),

/***/ "./src/telegraf/services/scenes/tasks/tasksActions.ts":
/*!************************************************************!*\
  !*** ./src/telegraf/services/scenes/tasks/tasksActions.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   taskBlockHandler: () => (/* binding */ taskBlockHandler)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_3__);




const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const page = ctx.session.page || 1; // Store page in session for navigation
    const perPage = 10; // Adjust perPage if needed
    try {
        const productData = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getTaskByTelegramId(ctx.from.id, page, perPage);
        console.log('productData', productData);
        if (!productData || productData.tasks.length === 0) {
            await ctx.reply('Нет доступных товаров.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }
        const { tasks, currentPage, totalPages } = productData;
        // Generate buttons for products
        const buttons = tasks.map(task => {
            const statusEmoji = task.status == 'open' ? '🟡' : '🟢';
            return [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(statusEmoji + ' ' + task.name, `task_${task.id}`)
            ];
        });
        // Add navigation buttons
        const navigationButtons = [];
        if (currentPage > 1) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('← Назад', `tasks_page_${currentPage - 1}`));
        }
        if (currentPage < totalPages) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Вперед →', `tasks_page_${currentPage + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }
        buttons.push(...defaultButtonsMenuOnly);
        const message = `[задачи]

В этом блоке будут все задачи

[списком в кнопках выводи задачи]`;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons);
        try {
            await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
            await ctx.answerCbQuery('Введите сумму для оплаты');
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }
        await ctx.answerCbQuery();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
};
const taskBlockHandler = async (ctx) => {
    const task_id = ctx.scene.session.task_id;
    try {
        const tasks = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getTaskById(ctx.from.id, task_id);
        const task = tasks[0];
        const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.fmt) `
        [задача]
Название: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.name)}
Описание: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.description)}
Описание: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.description)}
Номер задачи: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.task_number)}
Ответственный: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.responsible)}
Срок: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.deadline)}
Дата назначения: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.assigned_date)}
Статус: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_3__.code)(task.status)}
`;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Закрыть задачу', 'close_task')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
        ]);
        try {
            await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
            await ctx.answerCbQuery('Загрузка товаров');
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке задач', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/tasks/tasksScene.ts":
/*!**********************************************************!*\
  !*** ./src/telegraf/services/scenes/tasks/tasksScene.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   tasksScene: () => (/* binding */ tasksScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _tasksActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./tasksActions */ "./src/telegraf/services/scenes/tasks/tasksActions.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");



const tasksScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('tasks');
const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
// Define the enter handler
tasksScene.enter(async (ctx) => {
    await (0,_tasksActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
});
tasksScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});
tasksScene.action(/^products_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    ctx.session.page = page;
    return (0,_tasksActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx); // Reload the handler with the new page
});
//task_(*
tasksScene.action(/^task_(\d+)$/, async (ctx) => {
    const task_id = parseInt(ctx.match[1], 10);
    ctx.scene.session.task_id = task_id;
    return (0,_tasksActions__WEBPACK_IMPORTED_MODULE_1__.taskBlockHandler)(ctx);
});
tasksScene.action('close_task', async (ctx) => {
    const task_id = ctx.scene.session.task_id;
    _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].closeTask(task_id, ctx.from.id);
    // Close the task
    await ctx.reply('Задача закрыта');
});


/***/ }),

/***/ "./src/telegraf/services/scenes/warehouse/createNotificationActions.ts":
/*!*****************************************************************************!*\
  !*** ./src/telegraf/services/scenes/warehouse/createNotificationActions.ts ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   promptForDateTime: () => (/* binding */ promptForDateTime),
/* harmony export */   promptForNotificationType: () => (/* binding */ promptForNotificationType),
/* harmony export */   promptForSum: () => (/* binding */ promptForSum),
/* harmony export */   sendSuccessMessage: () => (/* binding */ sendSuccessMessage)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");




const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const page = ctx.session.page || 1; // Store page in session for navigation
    const perPage = 10; // Adjust perPage if needed
    ctx.scene.session.notificationForm.product_id = null;
    ctx.scene.session.notificationForm.product_name = null;
    ctx.scene.session.notificationForm.sum = null;
    ctx.scene.session.notificationForm.type = null;
    try {
        const productData = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].getProductsByTelegramId(ctx.from.id, page, perPage);
        if (!productData || productData.products.length === 0) {
            await ctx.reply('Нет доступных товаров.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }
        const { products, currentPage, totalPages } = productData;
        // Generate buttons for products
        const buttons = products.map(product => [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(product.title, `warehouse_product_${product.good_id}`)
        ]);
        // Add navigation buttons
        const navigationButtons = [];
        if (currentPage > 1) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('← Назад', `products_page_${currentPage - 1}`));
        }
        if (currentPage < totalPages) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Вперед →', `products_page_${currentPage + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }
        buttons.push(...defaultButtonsMenuOnly);
        const message = 'Выберите товар, для которого нужно отслеживать остаток:';
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons);
        try {
            await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
            await ctx.answerCbQuery('Введите сумму для оплаты');
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }
        await ctx.answerCbQuery();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
};
const promptForSum = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Назад', 'warehouse_notification')],
    ]);
    const product_name = ctx.scene.session.notificationForm.product_name;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Введите минимальное количество для товара ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(product_name)}`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Минимальное количество для товара');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForDateTime = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Введите дату и время уведомления в формате:
dd.mm.yyyy hh:mm`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите дату и время уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForNotificationType = async (ctx) => {
    //keyboard one time or constant notification
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Одноразовое уведомление', 'notification_one_time')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Постоянное уведомление', 'notification_constant')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Уведомление разовое или постоянное?`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Выберите тип уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const sendSuccessMessage = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Создать еще', 'create_notification')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Все уведомления', 'active_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `
    Вы установили минимальное количество для товара ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.scene.session.notificationForm.product_name)} : ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.scene.session.notificationForm.sum)}. 

Как только остаток товара достигнет этого количества, вы получите уведомление.
`;
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].createNotificationByTelegramId(ctx.from.id, ctx.scene.session.notificationForm, 'product_balance');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Уведомление создано');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/warehouse/createNotificationScene.ts":
/*!***************************************************************************!*\
  !*** ./src/telegraf/services/scenes/warehouse/createNotificationScene.ts ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createNotifictationScene: () => (/* binding */ createNotifictationScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _createNotificationActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./createNotificationActions */ "./src/telegraf/services/scenes/warehouse/createNotificationActions.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");



const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const handleSumInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;
    console.log('ctx.scene.session.notificationForm', ctx.scene.session.notificationForm);
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
const createNotifictationScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('warehouse_create_notification', 
// Step 1: Prompt to enter name
async (ctx) => {
    ctx.scene.session.notificationForm = {
        name: null,
        sum: null,
        dateTime: null,
        type: null,
    };
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
}, 
// Step 3: Save sum and prompt to enter date
handleSumInput);
createNotifictationScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
createNotifictationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});
createNotifictationScene.action(/^products_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    ctx.session.page = page;
    return (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx); // Reload the handler with the new page
});
createNotifictationScene.action(/^warehouse_product_(\d+)$/, async (ctx) => {
    console.log('warehouse_product_');
    const product_id = parseInt(ctx.match[1], 10);
    console.log('product_id', product_id);
    ctx.scene.session.notificationForm.product_id = product_id;
    const products = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getProductsByTelegramId(ctx.from.id);
    const product = products.allProducts.find(product => product.good_id === product_id);
    ctx.scene.session.notificationForm.product_name = product.title;
    await (0,_createNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForSum)(ctx);
});


/***/ }),

/***/ "./src/telegraf/services/scenes/warehouse/editNotificationActions.ts":
/*!***************************************************************************!*\
  !*** ./src/telegraf/services/scenes/warehouse/editNotificationActions.ts ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deleteNotification: () => (/* binding */ deleteNotification),
/* harmony export */   enterHandler: () => (/* binding */ enterHandler),
/* harmony export */   promptForAction: () => (/* binding */ promptForAction),
/* harmony export */   promptForDateTime: () => (/* binding */ promptForDateTime),
/* harmony export */   promptForNotificationType: () => (/* binding */ promptForNotificationType),
/* harmony export */   promptForSum: () => (/* binding */ promptForSum),
/* harmony export */   sendSuccessMessage: () => (/* binding */ sendSuccessMessage)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../utils/redis/Cache/Cache */ "./src/utils/redis/Cache/Cache.ts");





const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    const page = ctx.session.page || 1; // Store page in session for navigation
    const perPage = 10; // Adjust perPage if needed
    ctx.scene.session.notificationForm.product_id = null;
    ctx.scene.session.notificationForm.product_name = null;
    ctx.scene.session.notificationForm.sum = null;
    ctx.scene.session.notificationForm.type = null;
    try {
        await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_4__["default"].forgetByPattern(`notifications_product_balance_telegram_id_${ctx.from.id}_page_*`);
        const notificationData = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].getNotificationsByTelegramId(ctx.from.id, page, perPage, 'product_balance');
        if (!notificationData || notificationData.data.length === 0) {
            await ctx.reply('Нет доступных товаров.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
            ]));
            return ctx.wizard.next();
        }
        const { data, current_page, last_page: total } = notificationData;
        // Generate buttons for products
        const buttons = data.map(notification => [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(notification.settings.product_name, `edit_warehouse_product_${notification.id}`)
        ]);
        // Add navigation buttons
        const navigationButtons = [];
        if (current_page > 1) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('← Назад', `edit_products_page_${current_page - 1}`));
        }
        if (current_page < total) {
            navigationButtons.push(telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Вперед →', `edit_products_page_${current_page + 1}`));
        }
        if (navigationButtons.length) {
            buttons.push(navigationButtons);
        }
        buttons.push(...defaultButtonsMenuOnly);
        const message = `Выберите товар чтобы изменить или удалить отслеживание:`;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons);
        try {
            await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                    is_disabled: true
                } }));
            await ctx.answerCbQuery('Введите товар');
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
            await ctx.reply(message, keyboard);
        }
        await ctx.answerCbQuery();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error fetching products:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')]
        ]));
    }
    return ctx.wizard.next();
};
const promptForSum = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Назад', 'warehouse_product_' + ctx.scene.session.notificationForm.product_id)],
    ]);
    const product_name = ctx.scene.session.notificationForm.product_name;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Введите минимальное количество для товара ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(product_name)}`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Минимальное количество для товара');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};
const promptForAction = async (ctx) => {
    var _a;
    const product = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].getOneProductByTelegramId(ctx.from.id, ctx.scene.session.notificationForm.product_id);
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Изменить минимальное количество', 'change_minimal_sum')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Удалить уведомление', 'delete_notification')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const amount = (_a = product.actual_amounts[0].amount) !== null && _a !== void 0 ? _a : 0;
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `
Название товара - ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.scene.session.notificationForm.product_name)} 
Фактическое кол-во на складе - ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(amount)}
Мин кол-во для уведомления: ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.scene.session.notificationForm.sum)}`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Выберите действие');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};
const promptForDateTime = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_date')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Введите дату и время уведомления в формате:
dd.mm.yyyy hh:mm

 ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Текущая дата и время: ')} ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.notificationForm.dateTime)}
 
 Введите новую дату и время или нажмите пропустить
`;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Введите дату и время уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const promptForNotificationType = async (ctx) => {
    //keyboard one time or constant notification
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Пропустить', 'notification_skip_type')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Одноразовое уведомление', 'notification_one_time')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Постоянное уведомление', 'notification_constant')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Уведомление разовое или постоянное?
    
    ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.bold)('Текущий тип уведомления: ')} ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.session.notificationForm.type)}
    
    Выберите тип уведомления или нажмите пропустить
    `;
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Выберите тип уведомления');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
    return ctx.wizard.next();
};
const deleteNotification = async (ctx) => {
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].deleteNotification(ctx.scene.session.notificationForm.notification_id);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error deleting notification:', error);
        await ctx.reply('Произошла ошибка при удалении уведомления. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }
    await ctx.reply('Уведомление удалено', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
};
const sendSuccessMessage = async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Все уведомления', 'active_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Главное меню', 'mainmenu')],
    ]);
    const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `
    Вы установили минимальное количество для товара ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.scene.session.notificationForm.product_name)} : ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(ctx.scene.session.notificationForm.sum)}. 

Как только остаток товара достигнет этого количества, вы получите уведомление.
`;
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].updateNotificationById(ctx.scene.session.notificationForm.notification_id, ctx.scene.session.notificationForm);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(defaultButtonsMenuOnly));
    }
    try {
        await ctx.editMessageText(message, Object.assign(Object.assign({}, keyboard), { link_preview_options: {
                is_disabled: true
            } }));
        await ctx.answerCbQuery('Уведомление создано');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error sending autobooking message:', error);
        await ctx.reply(message, keyboard);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/warehouse/editNotificationScene.ts":
/*!*************************************************************************!*\
  !*** ./src/telegraf/services/scenes/warehouse/editNotificationScene.ts ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   editNotificationScene: () => (/* binding */ editNotificationScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _editNotificationActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./editNotificationActions */ "./src/telegraf/services/scenes/warehouse/editNotificationActions.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");



const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const handleActionInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
const handleSumInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSumInput.on('text', async (ctx) => {
    const sum = ctx.message.text;
    ctx.scene.session.notificationForm.sum = sum;
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
const handleDateTimeInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDateTimeInput.on('text', async (ctx) => {
    ctx.scene.session.notificationForm.dateTime = ctx.message.text;
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForNotificationType)(ctx);
});
//notification_skip_date
handleDateTimeInput.action('notification_skip_date', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForNotificationType)(ctx);
});
const handleNotificationTypeInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleNotificationTypeInput.action('notification_one_time', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'one_time';
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
//notification_skip_type
handleNotificationTypeInput.action('notification_skip_type', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
handleNotificationTypeInput.action('notification_constant', async (ctx) => {
    ctx.scene.session.notificationForm.type = 'constant';
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.sendSuccessMessage)(ctx);
});
const editNotificationScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('warehouse_edit_notification', 
// Step 1: Prompt to enter name
async (ctx) => {
    ctx.scene.session.notificationForm = {
        name: null,
        sum: null,
        dateTime: null,
        type: null,
    };
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
}, 
// Step 2: Save name and prompt to enter sum
handleActionInput, 
// Step 3: Save sum and prompt to enter date
handleSumInput);
editNotificationScene.command('start', async (ctx) => {
    await ctx.scene.enter('main');
});
editNotificationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('main');
});
editNotificationScene.action(/^products_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    ctx.session.page = page;
    return (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx); // Reload the handler with the new page
});
handleActionInput.action(/^edit_warehouse_product_(\d+)$/, async (ctx) => {
    const notification_id = parseInt(ctx.match[1], 10);
    ctx.scene.session.notificationForm.notification_id = notification_id;
    const productData = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getNotificationsByTelegramId(ctx.from.id, 1, 1, 'product_balance', notification_id);
    const notification = productData.data.find(notification => notification.id === notification_id);
    if (notification.settings.product_name) {
        ctx.scene.session.notificationForm.product_name = notification.settings.product_name;
    }
    if (notification.settings.sum) {
        ctx.scene.session.notificationForm.sum = notification.settings.sum;
    }
    if (notification.settings.product_id) {
        ctx.scene.session.notificationForm.product_id = notification.settings.product_id;
    }
    if (notification.settings.type) {
        ctx.scene.session.notificationForm.type = notification.settings.type;
    }
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForAction)(ctx);
});
handleActionInput.action('change_minimal_sum', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.promptForSum)(ctx);
    return ctx.wizard.next();
});
// delete
handleActionInput.action('delete_notification', async (ctx) => {
    await (0,_editNotificationActions__WEBPACK_IMPORTED_MODULE_1__.deleteNotification)(ctx);
});


/***/ }),

/***/ "./src/telegraf/services/scenes/warehouse/warehouseActions.ts":
/*!********************************************************************!*\
  !*** ./src/telegraf/services/scenes/warehouse/warehouseActions.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enterHandler: () => (/* binding */ enterHandler)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);

const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Уведомление на остаток', 'warehouse_notification')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Работа с остатком', 'warehouse_list')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
const enterHandler = async (ctx) => {
    ctx.session.page = 1; // Store page in session for navigation
    const messageText = `Выберите действие`;
    const buttonsArray = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([...defaultButtons]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
        try {
            // If the interaction is from a callback query, edit the existing message
            await ctx.editMessageText(messageText, buttonsArray);
        }
        catch (error) {
            await ctx.reply(messageText, buttonsArray);
        }
    }
    else {
        await ctx.reply(messageText, buttonsArray);
    }
};


/***/ }),

/***/ "./src/telegraf/services/scenes/warehouse/warehouseScene.ts":
/*!******************************************************************!*\
  !*** ./src/telegraf/services/scenes/warehouse/warehouseScene.ts ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   warehouseScene: () => (/* binding */ warehouseScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _warehouseActions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./warehouseActions */ "./src/telegraf/services/scenes/warehouse/warehouseActions.ts");


const warehouseScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('warehouse');
const noKeyboard = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reenter')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
];
// Define the enter handler
warehouseScene.enter(async (ctx) => {
    await (0,_warehouseActions__WEBPACK_IMPORTED_MODULE_1__.enterHandler)(ctx);
});
warehouseScene.action('warehouse_notification', async (ctx) => {
    await ctx.scene.enter('warehouse_create_notification');
});
warehouseScene.action('warehouse_list', async (ctx) => {
    await ctx.scene.enter('warehouse_edit_notification');
});
warehouseScene.action('reenter', async (ctx) => {
    await ctx.scene.reenter();
});


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
        user = await _services_laravelService__WEBPACK_IMPORTED_MODULE_0__["default"].getUserByTelegramId(ctx.from.id, 10);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error getting user:', error);
        await ctx.reply('Произошла ошибка при получении данных пользователя. Попробуйте позже');
    }
    if (!user) {
        await ctx.reply('Пользователь не найден. Пожалуйста, зарегистрируйтесь');
        return;
    }
    // if no phone then auth
    if (!user.phone_number) {
        await ctx.scene.enter('login_wizard');
        return;
    }
    ctx.session.user = user;
    console.log('user', user);
    await ctx.scene.enter(scene, { user });
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
        this.prefix = 'beauty_database_';
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
        // Custom key format: beauty_database_{key}
        const formattedKey = `beauty_database_${key}`;
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
        // Custom key format: beauty_database_{key}
        const formattedKey = `beauty_database_${key}`;
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
        // Custom key format: beauty_database_{key}
        const formattedKey = `beauty_database_${key}`;
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
        channel = `beauty_database_${channel}`;
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

/***/ "bull":
/*!***********************!*\
  !*** external "bull" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("bull");

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
/*!***********************************!*\
  !*** ./src/workers/authWorker.ts ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _services_jobQueue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../services/jobQueue */ "./src/services/jobQueue.ts");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils_clusterManager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/clusterManager */ "./src/utils/clusterManager.ts");
/* harmony import */ var _utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/redis/cacheHelper */ "./src/utils/redis/cacheHelper.ts");
/* harmony import */ var _utils_redis_redisHelper__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/redis/redisHelper */ "./src/utils/redis/redisHelper.ts");
/* harmony import */ var _controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../controllers/acceptanceController */ "./src/controllers/acceptanceController.ts");
/* harmony import */ var _telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../telegraf/controllers/telegramController */ "./src/telegraf/controllers/telegramController.ts");
// src/workers/authWorker.ts







 // Implement notification to Laravel
/**
 * Asks the user for the verification code via Telegram.
 * @param {Page} page - Playwright page instance.
 * @param {string} telegramId - Telegram ID for communication.
 * @returns {Promise<boolean>} - Returns true if code submission is successful, else false.
 */
const askUserForCode = async (page, telegramId) => {
    // Set action in cache
    await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_4__.setCacheValue)(`session_${telegramId}`, { action: 'collect_verification_code' }, 300);
    // Send a Telegram message requesting the verification code
    const messageSent = await (0,_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__.sendMessageToClient)(telegramId, 'Пожалуйста, введите код подтверждения для входа в Wildberries Seller Portal.', false);
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
                await (0,_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__.sendMessageToClient)(telegramId, 'Превышено количество попыток ввода кода. Попробуйте позже.');
                break;
            }
            await (0,_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__.sendMessageToClient)(telegramId, 'Неверный код. Попробуйте еще раз.', false);
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
const handleCaptcha = async (page, telegramId) => {
    var _a;
    // Wait for the window.CAPTCHA_CLIENT_ID to be defined
    await page.waitForFunction(() => window.CAPTCHA_CLIENT_ID !== undefined);
    // Retrieve the value of window.CAPTCHA_CLIENT_ID
    const captchaClientId = await page.evaluate(() => window.CAPTCHA_CLIENT_ID);
    console.log('CAPTCHA client ID:', captchaClientId);
    // Perform CAPTCHA Solving
    const task = await (0,_controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_6__.getPowTask)(captchaClientId);
    const startTime = Date.now();
    const answers = await (0,_controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_6__.solvePowTask)(task);
    console.log('answers', answers);
    const captchaToken = await (0,_controllers_acceptanceController__WEBPACK_IMPORTED_MODULE_6__.verifyPowAnswer)(task, answers);
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
        await (0,_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__.sendMessageToClient)(telegramId, 'Wildberries заблокировал вас на 3 часа. Попробуйте позже.');
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
        await (0,_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__.sendMessageToClient)(telegramId, `Ошибка: ${(_a = responseBody.error) !== null && _a !== void 0 ? _a : 'Неизвестная ошибка'}`);
        return false;
    }
};
/**
 * Notifies the Laravel application about the authentication status.
 * @param {string} telegramId - The ID of telegram user.
 * @param {string} status - The status of the authentication ('success' or 'error').
 * @param {object} payload - Additional data to send.
 */
const notifyAuthResult = async (telegramId, status, payload) => {
    try {
        await (0,_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_7__.sendMessageToClient)(telegramId, `Статус аутентификации: ${status}\n Пожалуйста, попробуйте еще раз`);
    }
    catch (error) {
        console.error('Failed to notify Laravel:', error.message);
    }
};
// Process jobs from the 'authentication' queue
_services_jobQueue__WEBPACK_IMPORTED_MODULE_0__.authQueue.process(async (job) => {
    const { userId, telegramId, credentials, headless } = job.data;
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
        // Initialize the cluster
        const cluster = await (0,_utils_clusterManager__WEBPACK_IMPORTED_MODULE_3__.initializeCluster)();
        // Define the task for authentication
        cluster.queue({
            userId,
            telegramId,
            credentials,
            headless: headless !== undefined ? headless : true,
        }, async ({ page, data }) => {
            const { userId, telegramId, credentials, headless } = data;
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
                // Intercept and modify auth requests
                await page.route('**/auth/v2/auth/slide-v3', async (route) => {
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
                // Intercept and modify auth requests
                await page.route('**/auth/v2/auth/slide-v3-confirm', async (route) => {
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
                const statePath = path__WEBPACK_IMPORTED_MODULE_1___default().join('/var/www/wb-back/storage/state', `${userId}.json`);
                fs__WEBPACK_IMPORTED_MODULE_2___default().writeFileSync(statePath, JSON.stringify(storageState, null, 2));
                console.log(`Authentication state saved to ${statePath}`);
                // Store success in Redis cache using setCacheValue and return path to Laravel state
                await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_4__.setCacheValue)(`auth_state_${userId}`, {
                    success: true,
                    statePath,
                }, 3600);
                credentials.statePath = statePath;
                await notifyAuthResult(telegramId, 'success', { userId, telegramId, credentials });
                console.log(`Authentication job for user ${userId} completed.`);
            }
            catch (error) {
                console.error(`Error during authentication process: ${error.message}`);
                // Store failure in Redis cache using setCacheValue
                await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_4__.setCacheValue)(`auth_state_${telegramId}`, {
                    success: false,
                    error: error.message,
                }, 3600);
                await notifyAuthResult(telegramId, 'error', { error: error.message });
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
        console.error('Error during cluster execution:', error.message);
        // Store failure in Redis cache using setCacheValue
        await (0,_utils_redis_cacheHelper__WEBPACK_IMPORTED_MODULE_4__.setCacheValue)(`auth_state_${telegramId}`, {
            success: false,
            error: error.message,
        }, 3600);
        await notifyAuthResult(telegramId, 'error', { error: error.message });
    }
});

})();

/******/ })()
;
//# sourceMappingURL=worker.js.map