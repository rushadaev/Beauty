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
/* harmony import */ var form_data__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! form-data */ "form-data");
/* harmony import */ var form_data__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(form_data__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! node:fs */ "node:fs");
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_3__);
// src/services/UserService.ts




class LaravelService {
    constructor() {
        const apiUrl = process.env.LARAVEL_API_URL;
        if (!apiUrl) {
            throw new Error('LARAVEL_API_URL is not defined in environment variables.');
        }
        this.laravelApiUrl = apiUrl;
    }
    async getTasks(params) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/admin-tasks`, { params });
            return response.data;
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }
    async sendTaskNotificationToAdmin(taskId) {
        try {
            // Отправляем уведомление через NodeJS API
            await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-notifications/send`, {
                task_id: taskId,
                type: 'new_task'
            });
        }
        catch (error) {
            console.error('Error sending notification to admin:', error);
        }
    }
    async getMasterPhoto(phone) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/masters/get-photo`, {
                phone: phone
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting master photo:', error);
            return {
                success: false,
                message: 'Ошибка при получении фото мастера'
            };
        }
    }
    async getTaskById(id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/admin-tasks/${id}`);
            return response.data;
        }
        catch (error) {
            console.error('Error fetching task:', error);
            throw error;
        }
    }
    async completeTask(taskId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-tasks/${taskId}/complete`);
            return response.data;
        }
        catch (error) {
            console.error('Error completing task:', error);
            throw error;
        }
    }
    async updateTaskStatus(taskId, status) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/admin-tasks/${taskId}/status`, { status });
            return response.data;
        }
        catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    }
    async createTaskForMaster({ type, masterPhone, masterName, description = null }) {
        try {
            // Формируем заголовок в зависимости от типа задачи
            const titles = {
                'description_update': `Обновить описание мастера ${masterName}`,
                'photo_update': `Обновить фото мастера ${masterName}`,
                'schedule_update': `Обновить расписание мастера ${masterName}`
            };
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-tasks`, {
                type,
                master_phone: masterPhone,
                master_name: masterName,
                description,
                title: titles[type]
            });
            if (response.data.success && response.data.data) {
                // Отправляем уведомление админам
                await this.sendAdminNotification(response.data.data.id, type);
            }
            return response.data;
        }
        catch (error) {
            console.error('Error creating task for master:', error);
            throw error;
        }
    }
    async sendAdminNotification(taskId, type) {
        try {
            await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-notifications/send`, {
                task_id: taskId,
                type: type
            });
        }
        catch (error) {
            console.error('Error sending admin notification:', error);
            // Не выбрасываем ошибку, чтобы не прерывать основной процесс
        }
    }
    async getMasterByPhone(phone) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/masters/info`, { phone });
            if (response.data.success) {
                return {
                    name: response.data.data.name,
                    id: response.data.data.id
                };
            }
            return null;
        }
        catch (error) {
            console.error('Error getting master info:', error);
            return null;
        }
    }
    async deleteTask(taskId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default()["delete"](`${this.laravelApiUrl}/admin-tasks/${taskId}`);
            return response.data;
        }
        catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
    // Метод для изменения приоритета задачи
    async updateTaskPriority(taskId, priority) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/admin-tasks/${taskId}/priority`, { priority });
            return response.data;
        }
        catch (error) {
            console.error('Error updating task priority:', error);
            throw error;
        }
    }
    // Метод для добавления комментария к задаче
    async addTaskComment(taskId, comment) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-tasks/${taskId}/comments`, { comment });
            return response.data;
        }
        catch (error) {
            console.error('Error adding task comment:', error);
            throw error;
        }
    }
    // Метод для обновления дедлайна задачи
    async updateTaskDeadline(taskId, deadline) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/admin-tasks/${taskId}/deadline`, { deadline });
            return response.data;
        }
        catch (error) {
            console.error('Error updating task deadline:', error);
            throw error;
        }
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
    // Создание уведомления об остатках
    async createWarehouseNotification(telegramId, data) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/warehouse-notifications`, {
                telegram_id: telegramId,
                product_id: data.productId,
                min_amount: data.minAmount,
                branch_id: data.branchId // Добавляем branch_id
            });
            if (!response.data.success) {
                throw new Error('Failed to create warehouse notification');
            }
            return response.data.data;
        }
        catch (error) {
            console.error('Error creating warehouse notification:', error);
            throw error;
        }
    }
    async getWarehouseNotification(id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/warehouse-notifications/${id}`);
            return response.data;
        }
        catch (error) {
            console.error('Error getting single warehouse notification:', error);
            return null;
        }
    }
    // Получение списка уведомлений
    async getWarehouseNotifications(telegramId, branchId = null, page = 1, perPage = 10) {
        try {
            console.log('Fetching warehouse notifications:', { telegramId, branchId, page, perPage });
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/warehouse-notifications`, {
                params: {
                    telegram_id: telegramId,
                    branch_id: branchId,
                    page,
                    per_page: perPage
                }
            });
            console.log('Warehouse notifications response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Error getting warehouse notifications:', error);
            return null;
        }
    }
    // Обновление уведомления
    async updateWarehouseNotification(id, data) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/warehouse-notifications/${id}`, data);
            // Если получили ответ с данными - значит запрос успешен
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            throw new Error('Failed to update notification');
        }
    }
    // Удаление уведомления
    async deleteWarehouseNotification(id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default()["delete"](`${this.laravelApiUrl}/warehouse-notifications/${id}`);
            return response.data.success || false;
        }
        catch (error) {
            console.error('Error deleting warehouse notification:', error);
            throw error;
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
    async rescheduleNotification(notificationId, newDateTime) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().patch(`${this.laravelApiUrl}/admin-notifications/${notificationId}/reschedule`, {
                notification_datetime: newDateTime
            });
            return response.data;
        }
        catch (error) {
            console.error('Error rescheduling notification:', error);
            throw error;
        }
    }
    async createNotificationByTelegramId(telegramId, settings) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-notifications`, {
                telegram_id: telegramId,
                name: settings.name,
                sum: settings.sum,
                notification_datetime: this.formatDateTime(settings.dateTime),
                type: settings.type,
                frequency: settings.frequency,
                frequency_value: settings.frequency_value,
                is_active: true
            });
            if (!response.data.success) {
                throw new Error('Failed to create notification');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    // Вспомогательный метод для форматирования даты и времени
    formatDateTime(dateTimeStr) {
        const [date, time] = dateTimeStr.split(' ');
        const [day, month, year] = date.split('.');
        return `${year}-${month}-${day} ${time}:00`;
    }
    // Получение списка уведомлений
    async getAdminNotifications(telegramId, page = 1, perPage = 10) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/admin-notifications`, {
                params: {
                    telegram_id: telegramId,
                    page,
                    per_page: perPage
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting admin notifications:', error);
            return null;
        }
    }
    // Получение конкретного уведомления
    async getAdminNotification(id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/admin-notifications/${id}`);
            return response.data;
        }
        catch (error) {
            console.error('Error getting admin notification:', error);
            return null;
        }
    }
    // Обновление уведомления
    async updateAdminNotification(id, settings) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/admin-notifications/${id}`, settings);
            return response.data;
        }
        catch (error) {
            console.error('Error updating admin notification:', error);
            throw error;
        }
    }
    // Удаление уведомления
    async deleteAdminNotification(id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default()["delete"](`${this.laravelApiUrl}/admin-notifications/${id}`);
            return response.data.success || false;
        }
        catch (error) {
            console.error('Error deleting admin notification:', error);
            throw error;
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
            // Получаем данные из кэша или API
            const response = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchProductsFromApi(telegramId), 3600 * 24);
            // Извлекаем массив продуктов из поля data
            const products = Array.isArray(response === null || response === void 0 ? void 0 : response.data) ? response.data : [];
            // Пагинация
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / perPage);
            page = Math.max(1, Math.min(totalPages || 1, page));
            const start = (page - 1) * perPage;
            const currentProducts = products.slice(start, start + perPage);
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
            return {
                actual_amounts: undefined,
                currentPage: 1,
                totalPages: 0,
                products: [],
                allProducts: []
            };
        }
    }
    async getTaskByTelegramId(telegramId, page = 1, perPage = 10) {
        const cacheKey = `task_telegram_id_${telegramId}`;
        try {
            // Получаем задачи из кеша или API с правильной типизацией
            const response = await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].rememberCacheValue(cacheKey, () => this.fetchTasksFromApi(telegramId), 10);
            if (!response || !Array.isArray(response.data)) {
                return this.createEmptyResponse(page, perPage);
            }
            // Пагинация
            const tasks = response.data;
            const totalTasks = tasks.length;
            const totalPages = Math.max(1, Math.ceil(totalTasks / perPage));
            const validPage = Math.max(1, Math.min(totalPages, page));
            const start = (validPage - 1) * perPage;
            const currentTasks = tasks.slice(start, start + perPage);
            // Возвращаем данные в формате TaskPaginatedResponse
            return {
                success: true,
                data: {
                    current_page: validPage,
                    data: currentTasks,
                    total: totalTasks,
                    per_page: perPage
                },
                meta: {
                    total: totalTasks
                }
            };
        }
        catch (error) {
            console.error('Error fetching tasks:', {
                error,
                telegram_id: telegramId,
                page,
                per_page: perPage
            });
            return this.createEmptyResponse(page, perPage);
        }
    }
    // Вспомогательный метод для создания пустого ответа
    createEmptyResponse(page, perPage) {
        return {
            success: false,
            data: {
                current_page: page,
                data: [],
                total: 0,
                per_page: perPage
            },
            meta: {
                total: 0
            }
        };
    }
    // Типизированный метод для получения задач из API
    async fetchTasksFromApi(telegramId) {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/tasks`, {
            params: {
                telegram_id: telegramId
            }
        });
        return response.data;
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
                // Возвращаем весь ответ, так как нам нужна структура с полями success, data, meta
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
    getHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }
    async submitRegistration(data) {
        var _a, _b, _c, _d, _e, _f;
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
                master_price: data.masterPrice, // Добавляем поле master_price
                work_address: (_b = data.selectedBranch) === null || _b === void 0 ? void 0 : _b.address, // Добавляем адрес филиала
                branch_name: (_c = data.selectedBranch) === null || _c === void 0 ? void 0 : _c.name, // Добавляем название филиала
                branch_id: (_d = data.selectedBranch) === null || _d === void 0 ? void 0 : _d.id, // Добавляем ID филиала
                telegram_id: data.telegram_id, // Добавляем telegram_id
                status: 'pending'
            };
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations`, formattedData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            // Если регистрация успешна, отправляем уведомление
            if (((_e = response.data) === null || _e === void 0 ? void 0 : _e.success) || response.status === 201) {
                try {
                    await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin-notifications/employment`, {
                        registration_id: response.data.data.id,
                        type: 'new_registration'
                    }, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                }
                catch (notificationError) {
                    console.error('Error sending registration notification:', {
                        error: notificationError,
                        registrationId: response.data.data.id,
                        response: (_f = notificationError.response) === null || _f === void 0 ? void 0 : _f.data
                    });
                }
            }
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
                responseType: 'arraybuffer', // Добавляем настройки для правильной обработки больших файлов
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 30000 // 30 секунд тайм-аут
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
    async getActiveRegistrations() {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/employee-registrations/pending`, {
                headers: this.getHeaders()
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching active registrations:', error);
            throw error;
        }
    }
    async getRegistrationDetails(id) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/employee-registrations/${id}`, {
                headers: this.getHeaders()
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching registration details:', error);
            throw error;
        }
    }
    async sendEmploymentInvite(registrationId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/${registrationId}/send-invite`, {}, {
                headers: this.getHeaders()
            });
            return response.data;
        }
        catch (error) {
            console.error('Error sending employment invite:', error);
            throw error;
        }
    }
    async getMasterSalary(telegramId, startDate, endDate) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/salary/master`, // Исправленный URL
            {
                params: {
                    telegram_id: telegramId,
                    start_date: startDate,
                    end_date: endDate
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting master salary:', error);
            throw error;
        }
    }
    async exportSalaryReport(startDate, endDate) {
        var _a;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/salary/export`, {
                params: {
                    start_date: startDate,
                    end_date: endDate
                },
                responseType: 'arraybuffer',
                headers: this.getHeaders(),
                timeout: 300000 // увеличиваем до 5 минут
            });
            return response.data;
        }
        catch (error) {
            if (axios__WEBPACK_IMPORTED_MODULE_0___default().isAxiosError(error)) {
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 504) {
                    throw new Error('Превышено время формирования отчёта. Попробуйте еще раз.');
                }
            }
            throw error;
        }
    }
    async createStaffProfile(registrationId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/${registrationId}/create-staff-after-invite`, {}, {
                headers: this.getHeaders()
            });
            return response.data;
        }
        catch (error) {
            console.error('Error creating staff profile:', error);
            throw error;
        }
    }
    async getRegistrationDocuments(id) {
        try {
            console.log('Fetching documents for registration:', id);
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/employee-registrations/${id}/documents`, {
                headers: this.getHeaders()
            });
            console.log('Documents response:', response.data);
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching registration documents:', error);
            throw error;
        }
    }
    async getMasterDocumentsByPhone(phone) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/master/documents/${phone}`, {
                headers: this.getHeaders()
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching master documents:', error);
            throw error;
        }
    }
    async approveRegistration(id) {
        try {
            await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/${id}/approve`, {}, {
                headers: this.getHeaders()
            });
        }
        catch (error) {
            console.error('Error approving registration:', error);
            throw error;
        }
    }
    async rejectRegistration(id) {
        try {
            await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/${id}/reject`, {}, {
                headers: this.getHeaders()
            });
        }
        catch (error) {
            console.error('Error rejecting registration:', error);
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
    async getBranchYclientsId(branchId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/branches/${branchId}/yclients-id`, {
                headers: this.getHeaders()
            });
            return response.data;
        }
        catch (error) {
            console.error('Error fetching branch yclients_id:', error);
            throw error;
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
            throw error; // Пробрасываем ошибку дальше для обработки в обработчике
        }
    }
    // Добавляем новый метод в LaravelService
    async authAdmin(phone, password, telegram_id) {
        var _a, _b;
        try {
            // Сначала получаем обычный ответ аутентификации
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/auth/admin`, {
                phone,
                password,
                telegram_id
            });
            // Проверяем роль пользователя
            if (response.data.success && response.data.user) {
                const userRole = response.data.user.user_role_slug;
                // Если роль не owner или administrator - возвращаем ошибку
                if (!['owner', 'administrator'].includes(userRole)) {
                    return {
                        success: false,
                        message: 'Доступ запрещен: недостаточно прав. Этот бот доступен только для владельцев и администраторов.'
                    };
                }
            }
            return response.data;
        }
        catch (error) {
            console.error('Error authenticating admin:', error);
            if (axios__WEBPACK_IMPORTED_MODULE_0___default().isAxiosError(error) && ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message)) {
                return {
                    success: false,
                    message: error.response.data.message
                };
            }
            throw error;
        }
    }
    async uploadSignedDocuments(registrationId, files) {
        var _a;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/employee-registrations/${registrationId}/upload-signed-documents`, {
                files,
                status: 'documents_uploaded'
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error uploading signed documents:', {
                error,
                registrationId,
                response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data
            });
            throw error;
        }
    }
    async getFilialStaff(telegramId, startDate, endDate, useAdminAuth = false) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/staff/filial`, {
                params: {
                    telegram_id: telegramId,
                    start_date: startDate,
                    end_date: endDate,
                    use_admin_auth: useAdminAuth
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting filial staff:', error);
            return null;
        }
    }
    /**
        * Получить расписание сотрудника
        */
    async getStaffSchedule(telegramId, startDate, endDate, useAdminAuth = false) {
        var _a, _b, _c;
        const cacheKey = `schedule_telegram_id_${telegramId}_${startDate}_${endDate}_${useAdminAuth}`;
        try {
            // Логируем входные параметры
            console.log('getStaffSchedule request params:', {
                telegramId,
                startDate,
                endDate,
                useAdminAuth,
                cacheKey,
                apiUrl: `${this.laravelApiUrl}/schedule`
            });
            // Временно отключаем кэширование для отладки
            // const schedule = await CacheService.rememberCacheValue(
            //     cacheKey,
            //     async () => {
            try {
                console.log('Making API request to get schedule...');
                const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/schedule`, {
                    params: {
                        telegram_id: telegramId,
                        start_date: startDate,
                        end_date: endDate,
                        use_admin_auth: useAdminAuth
                    }
                });
                console.log('API Response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data
                });
                return response.data;
            }
            catch (apiError) {
                console.error('API request error:', {
                    error: apiError,
                    response: (_a = apiError.response) === null || _a === void 0 ? void 0 : _a.data,
                    status: (_b = apiError.response) === null || _b === void 0 ? void 0 : _b.status
                });
                throw apiError;
            }
            //     },
            //     300
            // );
            // return schedule;
        }
        catch (error) {
            console.error('Error in getStaffSchedule:', {
                error: error.message,
                stack: error.stack,
                response: (_c = error.response) === null || _c === void 0 ? void 0 : _c.data
            });
            return null;
        }
    }
    // Обновляем метод updateStaffSchedule с правильными типами
    async updateStaffSchedule(telegramId, date, scheduleData, useAdminAuth) {
        var _a, _b;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().put(`${this.laravelApiUrl}/schedule`, Object.assign({ telegram_id: telegramId, use_admin_auth: useAdminAuth }, scheduleData));
            if (!response.data.success) {
                console.error('Failed to update schedule:', response.data);
                return null;
            }
            // Очищаем кэш для этой даты и соседних дат
            const clearDate = new Date(date);
            const startDate = new Date(clearDate);
            startDate.setDate(clearDate.getDate() - 7);
            const endDate = new Date(clearDate);
            endDate.setDate(clearDate.getDate() + 7);
            const cacheKey = `schedule_telegram_id_${telegramId}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
            await _utils_redis_Cache_Cache__WEBPACK_IMPORTED_MODULE_1__["default"].forget(cacheKey);
            return response.data;
        }
        catch (error) {
            console.error('Error updating staff schedule:', error);
            if (axios__WEBPACK_IMPORTED_MODULE_0___default().isAxiosError(error)) {
                const errorMessage = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
                throw new Error(`Не удалось обновить расписание: ${errorMessage}`);
            }
            throw error;
        }
    }
    /**
     * Проверить доступность временного интервала
     */
    async checkTimeSlotAvailability(telegramId, date, startTime, endTime) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/schedule/check-availability`, {
                params: {
                    telegram_id: telegramId,
                    date,
                    start_time: startTime,
                    end_time: endTime
                }
            });
            return response.data.available || false;
        }
        catch (error) {
            console.error('Error checking time slot availability:', error);
            return false;
        }
    }
    async updateMasterPhoto(phone, photoPath) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            console.log('Starting master photo update:', {
                phone,
                photoPath
            });
            // Проверяем существование файла
            if (!node_fs__WEBPACK_IMPORTED_MODULE_3__.existsSync(photoPath)) {
                throw new Error('Photo file not found');
            }
            // Создаем FormData и добавляем файл и телефон
            const form = new (form_data__WEBPACK_IMPORTED_MODULE_2___default())();
            form.append('photo', node_fs__WEBPACK_IMPORTED_MODULE_3__.createReadStream(photoPath));
            form.append('phone', phone);
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/masters/update-photo`, form, {
                headers: Object.assign({}, form.getHeaders()),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            console.log('Full update photo response:', {
                status: response.status,
                data: response.data
            });
            if (response.data) {
                return response.data; // Возвращаем полный объект ответа
            }
            throw new Error('Invalid response format');
        }
        catch (error) {
            // Расширенное логирование ошибки
            console.error('Error updating master photo:', {
                errorMessage: error === null || error === void 0 ? void 0 : error.message,
                errorResponse: {
                    status: (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status,
                    statusText: (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.statusText,
                    data: (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data
                },
                requestData: {
                    phone,
                    photoPath,
                    url: `${this.laravelApiUrl}/masters/update-photo`
                }
            });
            // Формируем объект ответа с ошибкой
            const errorResponse = {
                success: false,
                message: 'Не удалось обновить фото',
                error: error === null || error === void 0 ? void 0 : error.message
            };
            // Добавляем специфические ошибки
            if (((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.status) === 401) {
                errorResponse.message = 'Ошибка авторизации';
            }
            else if (((_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.status) === 404) {
                errorResponse.message = 'Мастер не найден в системе';
            }
            else if (((_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.status) === 413) {
                errorResponse.message = 'Файл слишком большой';
            }
            else if ((_h = (_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.message) {
                errorResponse.message = error.response.data.message;
            }
            return errorResponse; // Возвращаем объект с информацией об ошибке
        }
    }
    async getMasterRecords({ phone, password, params }) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        try {
            console.log('Starting getMasterRecords:', {
                phone,
                date_range: params
            });
            // Делаем запрос к API для получения записей
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/records/master`, {
                phone,
                password,
                start_date: params.start_date,
                end_date: params.end_date
            });
            console.log('Records response received:', {
                status: response.status,
                success: (_a = response.data) === null || _a === void 0 ? void 0 : _a.success,
                recordsCount: (_d = (_c = (_b = response.data) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0
            });
            // Проверяем успешность запроса
            if (!((_e = response.data) === null || _e === void 0 ? void 0 : _e.success)) {
                console.error('Failed to get master records:', {
                    message: (_f = response.data) === null || _f === void 0 ? void 0 : _f.message,
                    data: response.data
                });
                return {
                    success: false,
                    message: ((_g = response.data) === null || _g === void 0 ? void 0 : _g.message) || 'Не удалось получить записи'
                };
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in getMasterRecords:', {
                errorMessage: error === null || error === void 0 ? void 0 : error.message,
                errorResponse: {
                    status: (_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.status,
                    statusText: (_j = error === null || error === void 0 ? void 0 : error.response) === null || _j === void 0 ? void 0 : _j.statusText,
                    data: (_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data
                },
                requestData: {
                    phone,
                    date_range: params,
                    url: `${this.laravelApiUrl}/records/master`
                }
            });
            // Обработка специфических ошибок
            if (((_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.status) === 401) {
                throw new Error('Неверный логин или пароль');
            }
            if (((_m = error === null || error === void 0 ? void 0 : error.response) === null || _m === void 0 ? void 0 : _m.status) === 404) {
                throw new Error('Мастер не найден в системе');
            }
            throw new Error('Не удалось получить записи: ' +
                (((_p = (_o = error === null || error === void 0 ? void 0 : error.response) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.message) || error.message));
        }
    }
    // Получение деталей конкретной записи
    async getMasterRecordDetails({ phone, password, recordId }) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            console.log('Starting getMasterRecordDetails:', {
                phone,
                recordId
            });
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/records/master/details`, {
                phone,
                password,
                record_id: recordId
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                console.error('Failed to get record details:', {
                    message: (_b = response.data) === null || _b === void 0 ? void 0 : _b.message,
                    data: response.data
                });
                return {
                    success: false,
                    message: ((_c = response.data) === null || _c === void 0 ? void 0 : _c.message) || 'Не удалось получить детали записи'
                };
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in getMasterRecordDetails:', {
                errorMessage: error === null || error === void 0 ? void 0 : error.message,
                errorResponse: {
                    status: (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.status,
                    statusText: (_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.statusText,
                    data: (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.data
                }
            });
            if (((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.status) === 401) {
                throw new Error('Неверный логин или пароль');
            }
            throw new Error('Не удалось получить детали записи: ' +
                (((_j = (_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.message) || error.message));
        }
    }
    async cancelMasterRecord({ phone, password, recordId }) {
        var _a, _b, _c, _d, _e;
        try {
            console.log('Starting cancelMasterRecord:', {
                phone,
                recordId
            });
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/records/master/cancel`, {
                phone,
                password,
                record_id: recordId
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось отменить запись');
            }
            return {
                success: true,
                message: response.data.message
            };
        }
        catch (error) {
            console.error('Error in cancelMasterRecord:', {
                errorMessage: error === null || error === void 0 ? void 0 : error.message,
                errorResponse: (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data
            });
            throw new Error('Не удалось отменить запись: ' +
                (((_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || error.message));
        }
    }
    async updateMasterRecord({ phone, password, recordId, updateData }) {
        var _a, _b, _c, _d;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/records/master/update`, {
                phone,
                password,
                record_id: recordId,
                update_data: updateData
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось обновить запись');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in updateMasterRecord:', error);
            throw new Error('Не удалось обновить запись: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async getMasterCategoriesForTimeChange({ phone, password }) {
        var _a, _b, _c, _d;
        try {
            console.log('Starting getMasterCategoriesForTimeChange');
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/master/categories-time-change`, {
                phone,
                password
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось получить категории услуг');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in getMasterCategoriesForTimeChange:', error);
            throw new Error('Не удалось получить категории услуг: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async getMasterServicesForTimeChange({ phone, password, category_id }) {
        var _a, _b, _c, _d;
        try {
            console.log('Starting getMasterServicesForTimeChange');
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/master/services-time-change`, {
                phone,
                password,
                category_id
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось получить список услуг');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in getMasterServicesForTimeChange:', error);
            throw new Error('Не удалось получить список услуг: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async updateMasterServiceTime({ phone, password, service_id, duration }) {
        var _a, _b, _c, _d;
        try {
            console.log('Starting updateMasterServiceTime');
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/master/update-service-time`, {
                phone,
                password,
                service_id,
                duration
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось обновить длительность услуги');
            }
            return {
                success: true,
                message: response.data.message,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in updateMasterServiceTime:', error);
            throw new Error('Не удалось обновить длительность услуги: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async getMasterServices({ phone, password }) {
        var _a, _b, _c, _d;
        try {
            console.log('Starting getMasterServices');
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/services/master`, {
                phone,
                password
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось получить список услуг');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error in getMasterServices:', error);
            throw new Error('Не удалось получить список услуг: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async getCompanies() {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/companies`);
            return response.data;
        }
        catch (error) {
            console.error('Error getting companies:', error);
            return null;
        }
    }
    async getProducts(companyId) {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${this.laravelApiUrl}/products/${companyId}`);
            return response.data;
        }
        catch (error) {
            console.error('Error getting products:', error);
            return null;
        }
    }
    async getServiceCategories(params) {
        var _a, _b, _c, _d;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin/services/categories`, {
                phone: params.phone,
                password: params.password,
                company_id: params.companyId
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось получить категории услуг');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error getting service categories:', error);
            throw new Error('Не удалось получить категории услуг: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async getServices(params) {
        var _a, _b, _c, _d;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin/services/list`, {
                phone: params.phone,
                password: params.password,
                company_id: params.companyId,
                category_id: params.categoryId
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось получить список услуг');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error getting services:', error);
            throw new Error('Не удалось получить список услуг: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async generateServicesTemplate(params) {
        var _a, _b, _c;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin/services/template`, {
                phone: params.phone,
                password: params.password
            }, {
                responseType: 'arraybuffer'
            });
            if ((_a = response.headers['content-type']) === null || _a === void 0 ? void 0 : _a.includes('application/json')) {
                // Если получили JSON вместо файла - значит произошла ошибка
                const errorText = new TextDecoder().decode(response.data);
                const error = JSON.parse(errorText);
                throw new Error(error.message || 'Не удалось сгенерировать шаблон');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error generating services template:', error);
            throw new Error('Не удалось сгенерировать шаблон: ' +
                (((_c = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message));
        }
    }
    async generatePinboxTemplate(params) {
        var _a, _b, _c;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin/pinbox/template`, {
                phone: params.phone,
                password: params.password
            }, {
                responseType: 'arraybuffer'
            });
            if ((_a = response.headers['content-type']) === null || _a === void 0 ? void 0 : _a.includes('application/json')) {
                const errorText = new TextDecoder().decode(response.data);
                const error = JSON.parse(errorText);
                throw new Error(error.message || 'Не удалось сгенерировать шаблон Pinbox');
            }
            return response.data;
        }
        catch (error) {
            console.error('Error generating pinbox template:', error);
            throw new Error('Не удалось сгенерировать шаблон Pinbox: ' +
                (((_c = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message));
        }
    }
    async processServicesUpdates(params) {
        var _a, _b, _c, _d;
        try {
            const formData = new (form_data__WEBPACK_IMPORTED_MODULE_2___default())();
            formData.append('file', params.file, {
                filename: 'services_update.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            formData.append('phone', params.phone);
            formData.append('password', params.password);
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin/services/process-updates`, formData, {
                headers: Object.assign({}, formData.getHeaders())
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось обработать изменения');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error processing services updates:', error);
            throw new Error('Не удалось обработать изменения: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
        }
    }
    async updateServicePrices(params) {
        var _a, _b, _c, _d;
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().post(`${this.laravelApiUrl}/admin/services/update-prices`, {
                phone: params.phone,
                password: params.password,
                updates: params.updates
            });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.success)) {
                throw new Error(((_b = response.data) === null || _b === void 0 ? void 0 : _b.message) || 'Не удалось обновить цены');
            }
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            console.error('Error updating service prices:', error);
            throw new Error('Не удалось обновить цены: ' +
                (((_d = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message));
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
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @telegraf/session/redis */ "@telegraf/session/redis");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _services_bot_admin_scenes_adminMainScene__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../services/bot-admin/scenes/adminMainScene */ "./src/telegraf/services/bot-admin/scenes/adminMainScene.ts");
/* harmony import */ var _services_bot_admin_scenes_salaryScene__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../services/bot-admin/scenes/salaryScene */ "./src/telegraf/services/bot-admin/scenes/salaryScene.ts");
/* harmony import */ var _services_scenes_notifications_notificationsScene__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../services/scenes/notifications/notificationsScene */ "./src/telegraf/services/scenes/notifications/notificationsScene.ts");
/* harmony import */ var _services_bot_admin_scenes_employmentScene__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../services/bot-admin/scenes/employmentScene */ "./src/telegraf/services/bot-admin/scenes/employmentScene.ts");
/* harmony import */ var _services_scenes_staff_staffScene__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../services/scenes/staff/staffScene */ "./src/telegraf/services/scenes/staff/staffScene.ts");
/* harmony import */ var _services_bot_admin_scenes_adminLoginWizard__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../services/bot-admin/scenes/adminLoginWizard */ "./src/telegraf/services/bot-admin/scenes/adminLoginWizard.ts");
/* harmony import */ var _services_scenes_notifications_createNotificationScene__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../services/scenes/notifications/createNotificationScene */ "./src/telegraf/services/scenes/notifications/createNotificationScene.ts");
/* harmony import */ var _services_scenes_notifications_editNotificationScene__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../services/scenes/notifications/editNotificationScene */ "./src/telegraf/services/scenes/notifications/editNotificationScene.ts");
/* harmony import */ var _services_bot_admin_scenes_selectBranchScene__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../services/bot-admin/scenes/selectBranchScene */ "./src/telegraf/services/bot-admin/scenes/selectBranchScene.ts");
/* harmony import */ var _services_bot_admin_scenes_productsScene__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../services/bot-admin/scenes/productsScene */ "./src/telegraf/services/bot-admin/scenes/productsScene.ts");
/* harmony import */ var _services_bot_admin_scenes_createWarehouseNotificationScene__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../services/bot-admin/scenes/createWarehouseNotificationScene */ "./src/telegraf/services/bot-admin/scenes/createWarehouseNotificationScene.ts");
/* harmony import */ var _services_bot_admin_scenes_warehouseScene__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../services/bot-admin/scenes/warehouseScene */ "./src/telegraf/services/bot-admin/scenes/warehouseScene.ts");
/* harmony import */ var _services_bot_admin_scenes_warehouseNotificationsListScene__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../services/bot-admin/scenes/warehouseNotificationsListScene */ "./src/telegraf/services/bot-admin/scenes/warehouseNotificationsListScene.ts");
/* harmony import */ var _services_bot_admin_scenes_notificationsManagementScene__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../services/bot-admin/scenes/notificationsManagementScene */ "./src/telegraf/services/bot-admin/scenes/notificationsManagementScene.ts");
/* harmony import */ var _services_bot_admin_scenes_notificationsCreateScene__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../services/bot-admin/scenes/notificationsCreateScene */ "./src/telegraf/services/bot-admin/scenes/notificationsCreateScene.ts");
/* harmony import */ var _services_bot_admin_scenes_remindLaterScene__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../services/bot-admin/scenes/remindLaterScene */ "./src/telegraf/services/bot-admin/scenes/remindLaterScene.ts");
/* harmony import */ var _services_bot_admin_scenes_notificationsListScene__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../services/bot-admin/scenes/notificationsListScene */ "./src/telegraf/services/bot-admin/scenes/notificationsListScene.ts");
/* harmony import */ var _services_bot_admin_scenes_tasksScene__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../services/bot-admin/scenes/tasksScene */ "./src/telegraf/services/bot-admin/scenes/tasksScene.ts");
/* harmony import */ var _services_bot_admin_scenes_changeServicesScene__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../services/bot-admin/scenes/changeServicesScene */ "./src/telegraf/services/bot-admin/scenes/changeServicesScene.ts");
/* harmony import */ var _services_bot_admin_scenes_pinboxScene__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../services/bot-admin/scenes/pinboxScene */ "./src/telegraf/services/bot-admin/scenes/pinboxScene.ts");



// Импорты сцен управляющего






// Импорты сцен уведомлений


// Импорты сцен склад












const botToken = process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW;
const bot = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Telegraf(botToken);
const store = (0,_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2__.Redis)({
    url: 'redis://redis:6379/2',
});
// Инициализация stage со всеми сценами
const stage = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.Stage([
    _services_bot_admin_scenes_adminLoginWizard__WEBPACK_IMPORTED_MODULE_8__.adminLoginWizard,
    _services_bot_admin_scenes_adminMainScene__WEBPACK_IMPORTED_MODULE_3__.adminMainScene,
    _services_bot_admin_scenes_salaryScene__WEBPACK_IMPORTED_MODULE_4__.salaryScene,
    _services_scenes_notifications_notificationsScene__WEBPACK_IMPORTED_MODULE_5__.notifictationsScene,
    _services_scenes_notifications_createNotificationScene__WEBPACK_IMPORTED_MODULE_9__.createNotifictationScene,
    _services_bot_admin_scenes_notificationsListScene__WEBPACK_IMPORTED_MODULE_19__.notificationsListScene,
    _services_bot_admin_scenes_employmentScene__WEBPACK_IMPORTED_MODULE_6__.employmentScene,
    _services_bot_admin_scenes_warehouseScene__WEBPACK_IMPORTED_MODULE_14__.warehouseScene,
    _services_scenes_staff_staffScene__WEBPACK_IMPORTED_MODULE_7__.staffScene,
    _services_scenes_notifications_editNotificationScene__WEBPACK_IMPORTED_MODULE_10__.editNotificationScene,
    _services_bot_admin_scenes_selectBranchScene__WEBPACK_IMPORTED_MODULE_11__.selectBranchScene,
    _services_bot_admin_scenes_productsScene__WEBPACK_IMPORTED_MODULE_12__.productsScene,
    _services_bot_admin_scenes_createWarehouseNotificationScene__WEBPACK_IMPORTED_MODULE_13__.createWarehouseNotificationScene,
    _services_bot_admin_scenes_warehouseNotificationsListScene__WEBPACK_IMPORTED_MODULE_15__.warehouseNotificationsListScene,
    _services_bot_admin_scenes_notificationsManagementScene__WEBPACK_IMPORTED_MODULE_16__.notificationsManagementScene,
    _services_bot_admin_scenes_notificationsCreateScene__WEBPACK_IMPORTED_MODULE_17__.notificationsCreateScene,
    _services_bot_admin_scenes_remindLaterScene__WEBPACK_IMPORTED_MODULE_18__.remindLaterScene,
    _services_bot_admin_scenes_notificationsListScene__WEBPACK_IMPORTED_MODULE_19__.notificationsListScene,
    _services_bot_admin_scenes_tasksScene__WEBPACK_IMPORTED_MODULE_20__.tasksScene,
    _services_bot_admin_scenes_changeServicesScene__WEBPACK_IMPORTED_MODULE_21__.changeServicesScene,
    _services_bot_admin_scenes_pinboxScene__WEBPACK_IMPORTED_MODULE_22__.pinboxScene,
]);
// Middleware
bot.use((0,telegraf__WEBPACK_IMPORTED_MODULE_0__.session)({ store }));
bot.use(stage.middleware());
bot.use(async (ctx, next) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Received update', { update: ctx.update });
    await next();
});
// Обработка команды /start
bot.start(async (ctx) => {
    await ctx.scene.enter('admin_login_wizard');
});
// Обработка действия 'mainmenu'
bot.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
    await ctx.answerCbQuery('🏦 Главное меню');
});
// Обновляем обработчик
bot.action(/remind_later_(\d+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const notificationId = ctx.match[1];
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Starting remind later process:', {
            notification_id: notificationId
        });
        // Инициализируем state если его нет
        if (!ctx.scene.state) {
            ctx.scene.state = {};
        }
        await ctx.scene.enter('remind_later_scene', { notificationId });
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in remind_later handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});
// Обработка команды /ping
bot.command('ping', (ctx) => {
    ctx.reply('pong!');
});
// Обработчики уведомлений
bot.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});
bot.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('notifications_list_scene');
});
// Обработчики склада
bot.action('warehouse_notification', async (ctx) => {
    await ctx.scene.enter('warehouse_create_notification');
});
bot.action('warehouse_list', async (ctx) => {
    await ctx.scene.enter('warehouse_edit_notification');
});
// Общий обработчик callback_query
bot.on('callback_query', async (ctx) => {
    await ctx.answerCbQuery('👌');
});
// Функция отправки сообщений клиенту
const sendMessageToClient = async (chatId, message, isButtonAvailable = true) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    try {
        const response = await bot.telegram.sendMessage(chatId, message, isButtonAvailable ? { reply_markup: keyboard.reply_markup } : {});
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Message sent to Telegram successfully!', response);
        return true;
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Exception occurred while sending message:', error.message);
        return false;
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (bot);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/adminLoginWizard.ts":
/*!********************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/adminLoginWizard.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   adminLoginWizard: () => (/* binding */ adminLoginWizard)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


// Утилиты для работы с телефоном
const formatPhone = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('8')) {
        cleaned = '7' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('7')) {
        cleaned = '7' + cleaned;
    }
    return cleaned;
};
const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return /^[78]\d{10}$/.test(cleaned);
};
// Шаг 1: Начальное меню
const showMainMenu = async (ctx) => {
    var _a;
    const messageText = `👋 Добро пожаловать в панель управления CherryTown!\n\n`
        + `🎯 Здесь вы сможете:\n`
        + `• Управлять персоналом\n`
        + `• Контролировать записи\n`
        + `• Работать со складом\n`
        + `• Следить за уведомлениями\n`
        + `• И многое другое!\n\n`
        + `🔐 Для начала работы необходимо авторизоваться:`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔑 Авторизация', 'admin_authorization')],
    ]);
    if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
        try {
            await ctx.editMessageText(messageText, mainMenuKeyboard);
        }
        catch (error) {
            await ctx.reply(messageText, mainMenuKeyboard);
        }
    }
    else {
        await ctx.reply(messageText, mainMenuKeyboard);
    }
    return ctx.wizard.next();
};
// Обработка авторизации и ввода телефона
const handleAdminAuthorization = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAdminAuthorization.action('admin_authorization', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `📱 Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_admin_menu')],
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.next();
});
// Обработка ввода телефона
const handlePhoneInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePhoneInput.action('back_to_admin_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
handlePhoneInput.on('text', async (ctx) => {
    const phone = formatPhone(ctx.message.text);
    if (!isValidPhone(phone)) {
        await ctx.reply('❌ Неверный формат номера. Пожалуйста, введите номер в формате:\n+7XXXXXXXXXX', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_admin_menu')]
        ]));
        return;
    }
    ctx.scene.session.phone = phone;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_admin_phone')] // Обновляем название action
    ]);
    await ctx.reply('🔑 Введите пароль от личного кабинета YClients:', keyboard);
    return ctx.wizard.next();
});
// Утилита для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Обработка ввода пароля
const handlePasswordInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePasswordInput.action('back_to_admin_phone', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `📱 Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_admin_menu')], // Обновляем название action
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.back();
});
handlePasswordInput.on('text', async (ctx) => {
    var _a, _b, _c;
    const password = ctx.message.text;
    const phone = ctx.scene.session.phone;
    try {
        await ctx.reply('⏳ Проверяем данные...');
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].authAdmin(phone, password, ctx.from.id);
        if (response === null || response === void 0 ? void 0 : response.success) {
            // Проверяем роль пользователя
            const userRole = (_a = response.user) === null || _a === void 0 ? void 0 : _a.user_role_slug;
            if (!['owner', 'administrator'].includes(userRole)) {
                const errorMessage = await ctx.reply('❌ Доступ запрещен: недостаточно прав.\n\nЭтот бот доступен только для владельцев и администраторов.');
                await delay(2000);
                const errorKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')]
                ]);
                await ctx.telegram.editMessageText(ctx.chat.id, errorMessage.message_id, undefined, '❌ Доступ запрещен: недостаточно прав.\n\nЭтот бот доступен только для владельцев и администраторов.', { reply_markup: errorKeyboard.reply_markup });
                return;
            }
            if (ctx.session) {
                const sessionData = {
                    phone,
                    password,
                    apiToken: response.token,
                    user: response.user
                };
                Object.assign(ctx.session, sessionData);
            }
            try {
                const messagesToDelete = ctx.message.message_id;
                for (let i = 0; i < 3; i++) {
                    try {
                        await ctx.deleteMessage(messagesToDelete - i);
                    }
                    catch (e) {
                        // Игнорируем ошибки удаления
                    }
                }
            }
            catch (e) {
                console.log('Could not delete messages:', e);
            }
            // Очищаем временные данные
            delete ctx.scene.session.phone;
            delete ctx.scene.session.password;
            const successMsg = await ctx.reply('🔄 Авторизация...');
            await delay(700);
            await ctx.telegram.editMessageText(ctx.chat.id, successMsg.message_id, undefined, '✨ Проверяем данные...');
            await delay(700);
            await ctx.telegram.editMessageText(ctx.chat.id, successMsg.message_id, undefined, '🎉 Успешно! Добро пожаловать в панель управления.');
            await delay(1000);
            return ctx.scene.enter('admin_main');
        }
        const errorMsg = (response === null || response === void 0 ? void 0 : response.message) || 'Ошибка авторизации';
        const errorMessage = await ctx.reply('❌ ' + errorMsg);
        await delay(500);
        const errorKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_admin_auth')], // Обновляем название action
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')] // Обновляем название action
        ]);
        await ctx.telegram.editMessageText(ctx.chat.id, errorMessage.message_id, undefined, '❌ ' + errorMsg, { reply_markup: errorKeyboard.reply_markup });
    }
    catch (error) {
        console.error('Ошибка авторизации:', error);
        let errorMessage = 'Ошибка авторизации. ';
        if ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) {
            errorMessage += error.response.data.message;
        }
        else {
            errorMessage += 'Проверьте введенные данные и попробуйте снова.';
        }
        const errorMsg = await ctx.reply('⚠️ Обработка...');
        await delay(500);
        const errorKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_admin_auth')], // Обновляем название action
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')] // Обновляем название action
        ]);
        await ctx.telegram.editMessageText(ctx.chat.id, errorMsg.message_id, undefined, '❌ ' + errorMessage, { reply_markup: errorKeyboard.reply_markup });
    }
});
// Добавляем обработчики для кнопок после ошибки
// Исправим обработчик retry_admin_auth
handlePasswordInput.action('retry_admin_auth', async (ctx) => {
    try {
        await ctx.answerCbQuery(); // Сразу отвечаем на callback
        await ctx.scene.reenter(); // Перезапускаем сцену
    }
    catch (error) {
        console.error('Error in retry_admin_auth:', error);
        // В случае ошибки просто пробуем перезапустить сцену
        await ctx.scene.reenter();
    }
});
// Исправим обработчик back_to_admin_menu
handlePasswordInput.action('back_to_admin_menu', async (ctx) => {
    try {
        await ctx.answerCbQuery(); // Сразу отвечаем на callback
        await ctx.scene.reenter(); // Перезапускаем сцену
    }
    catch (error) {
        console.error('Error in back_to_admin_menu:', error);
        // В случае ошибки просто пробуем перезапустить сцену
        await ctx.scene.reenter();
    }
});
// Создаем сцену wizard с новым именем
const adminLoginWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('admin_login_wizard', // Обновляем название сцены
showMainMenu, handleAdminAuthorization, handlePhoneInput, handlePasswordInput);
// Добавляем middleware для обработки ошибок
adminLoginWizard.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (error) {
        console.error('Ошибка в admin login wizard:', error);
        await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_admin_menu')]
        ]));
    }
});


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/adminMainScene.ts":
/*!******************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/adminMainScene.ts ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   adminMainScene: () => (/* binding */ adminMainScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");




const adminMainScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('admin_main');
adminMainScene.enter(async (ctx) => {
    // Получаем имя пользователя из сессии, если есть
    var _a;
    const messageText = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `
🏢 *Панель управления CherryTown*

👋 Добро пожаловать!

📊 *Доступные функции:*
- Управление персоналом и трудоустройство
- Контроль выполнения задач
- Расчёт заработной платы
- Управление складом и остатками
- Система уведомлений
- Работа с клиентами

ℹ️ Выберите нужный раздел:`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✂️ Изменение услуг', 'change_services'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 Задачи', 'tasks'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('💰 Расчет ЗП', 'salary'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏪 Управление складом', 'warehouse'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔔 Уведомления', 'notifications'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👥 Трудоустройство', 'employment'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📦 Pinbox', 'pinbox'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚪 Выйти из аккаунта', 'logout')
        ]
    ]);
    try {
        if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
            await ctx.editMessageText(messageText, Object.assign(Object.assign({}, mainMenuKeyboard), { parse_mode: 'Markdown' }));
        }
        else {
            await ctx.reply(messageText, Object.assign(Object.assign({}, mainMenuKeyboard), { parse_mode: 'Markdown' }));
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in adminMainScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке главного меню. Попробуйте еще раз.');
    }
});
adminMainScene.action('pinbox', async (ctx) => {
    await ctx.answerCbQuery('📦 Переход в Pinbox...');
    await ctx.scene.enter('pinbox');
});
// Обработчик выхода
adminMainScene.action('logout', async (ctx) => {
    try {
        await ctx.answerCbQuery('Выходим из аккаунта...');
        const confirmKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Да, выйти', 'confirm_logout'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отмена', 'cancel_logout')
            ]
        ]);
        await ctx.editMessageText('❓ Вы уверены, что хотите выйти из аккаунта?', confirmKeyboard);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in logout handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
// Подтверждение выхода
adminMainScene.action('confirm_logout', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const telegramId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        if (telegramId) {
            try {
                await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].logout(telegramId);
            }
            catch (error) {
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error during backend logout:', error);
            }
        }
        await ctx.editMessageText('👋 Вы успешно вышли из аккаунта.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔑 Войти снова', 'start_login')]
        ]));
        return ctx.scene.enter('admin_login_wizard');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in confirm_logout handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте еще раз через несколько секунд.');
        return ctx.scene.enter('admin_login_wizard');
    }
});
// Отмена выхода
adminMainScene.action('cancel_logout', async (ctx) => {
    try {
        await ctx.answerCbQuery('Отменено');
        return ctx.scene.reenter();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in cancel_logout handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
// Обработчики переходов в другие сцены
adminMainScene.action('tasks', async (ctx) => {
    await ctx.answerCbQuery('📋 Переходим к задачам...');
    await ctx.scene.enter('tasks');
});
adminMainScene.action('salary', async (ctx) => {
    await ctx.answerCbQuery('💰 Расчет зарплаты...');
    await ctx.scene.enter('salary');
});
adminMainScene.action('notifications', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_management');
});
adminMainScene.action('employment', async (ctx) => {
    await ctx.answerCbQuery('👥 Трудоустройство...');
    await ctx.scene.enter('employment');
});
adminMainScene.action('warehouse', async (ctx) => {
    await ctx.answerCbQuery('🏪 Управление складом...');
    return ctx.scene.enter('warehouse'); // Теперь переходим в основное меню склада
});
adminMainScene.action('change_services', async (ctx) => {
    await ctx.answerCbQuery('✂️ Изменение услуг...');
    await ctx.scene.enter('change_services');
});
// Обработчик возврата в главное меню
adminMainScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery('🏠 Главное меню');
    return ctx.scene.reenter();
});
// Обработка ошибок
adminMainScene.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in adminMainScene:', error);
        await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Вернуться в главное меню', 'mainmenu')]
        ]));
    }
});


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/changeServicesScene.ts":
/*!***********************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/changeServicesScene.ts ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   changeServicesScene: () => (/* binding */ changeServicesScene),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");



const changeServicesScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('change_services');
// Входная точка сцены
changeServicesScene.enter(async (ctx) => {
    var _a, _b;
    // Проверяем авторизацию
    const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
    const password = (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password;
    if (!phone || !password) {
        await ctx.reply('Ошибка: не найдены данные авторизации. Попробуйте перелогиниться.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
            ]]));
        return;
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📥 Получить шаблон Excel', 'get_template')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📤 Загрузить заполненный Excel', 'upload_template')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]);
    await ctx.reply('🏷 Управление услугами\n\n' +
        '1. Нажмите «Получить шаблон Excel» — вы получите таблицу со списком филиалов и услуг.\n' +
        '2. Откройте скачанный файл, найдите нужную услугу(и) и в колонке «Новая цена» укажите желаемую стоимость.\n' +
        '3. Сохраните файл.\n' +
        '4. Нажмите «Загрузить заполненный Excel», а затем отправьте файл сюда в чат.\n' +
        '\nПосле загрузки бот покажет, какие услуги будут изменены, и предложит подтвердить или отменить изменения.', keyboard);
});
changeServicesScene.action('upload_template', async (ctx) => {
    await ctx.answerCbQuery(); // закрыть «часики» на кнопке
    await ctx.reply('Пожалуйста, отправьте файл Excel (XLSX) в чат сообщением.\n' +
        'Убедитесь, что загружаете файл в формате .xlsx.');
});
// Обработка получения шаблона
changeServicesScene.action('get_template', async (ctx) => {
    var _a, _b;
    try {
        // 1. Сразу отвечаем на нажатие кнопки, чтобы убрать «часики» у инлайн-кнопки
        await ctx.answerCbQuery();
        // 2. Отправляем «пожалуйста, подождите»
        const waitingMessage = await ctx.reply('⏳ Пожалуйста, подождите, идёт генерация Excel...');
        // 3. Проверяем авторизацию
        const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
        const password = (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password;
        if (!phone || !password) {
            // Если нет авторизации – удаляем «ждём-сообщение» и выходим
            await ctx.deleteMessage(waitingMessage.message_id);
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }
        // 4. Генерируем файл через сервис
        const template = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].generateServicesTemplate({ phone, password });
        // 5. Удаляем «ждём-сообщение»
        await ctx.deleteMessage(waitingMessage.message_id);
        // 6. Отправляем файл
        await ctx.replyWithDocument({
            source: template,
            filename: 'services_template.xlsx'
        });
        // 7. Дополнительное сообщение
        await ctx.reply('📝 Заполните колонку "Новая цена" для тех услуг, которые нужно изменить.\n' +
            'После заполнения загрузите файл обратно в бот.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_menu')]]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error generating template:', error);
        // Если произошло исключение — желательно удалить «ждём-сообщение» (если оно существует)
        // Но нужно убедиться, что мы его не удаляли раньше
        // Здесь для простоты можем обернуть в try/catch
        try {
            // Если не успели создать waitingMessage, этот вызов может упасть
            // но это не критично
            await ctx.deleteMessage();
        }
        catch (e) {
            // Игнорируем ошибку удаления
        }
        await ctx.reply('Произошла ошибка при генерации шаблона. Попробуйте позже.');
    }
});
// Обработка загрузки файла
changeServicesScene.on('document', async (ctx) => {
    var _a, _b, _c;
    try {
        const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
        const password = (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password;
        if (!phone || !password) {
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }
        if (!((_c = ctx.message.document.mime_type) === null || _c === void 0 ? void 0 : _c.includes('spreadsheet'))) {
            await ctx.reply('Пожалуйста, загрузите файл Excel (.xlsx)');
            return;
        }
        const file = await ctx.telegram.getFile(ctx.message.document.file_id);
        const filePath = file.file_path;
        if (!filePath) {
            await ctx.reply('Не удалось получить файл');
            return;
        }
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN_SUPPLIES_NEW}/${filePath}`;
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();
        // Обрабатываем файл через API
        // В обработке файла:
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].processServicesUpdates({
            phone,
            password,
            file: Buffer.from(buffer)
        });
        if (!result.success) {
            await ctx.reply('Ошибка при обработке файла: ' + result.message);
            return;
        }
        // Формируем сообщение для подтверждения
        let message = '📋 Подтвердите изменения:\n\n';
        if (result.data.changes) {
            // Группируем изменения по филиалам с явным указанием типов
            const groupedChanges = result.data.changes.reduce((acc, change) => {
                if (!acc[change.branch_name]) {
                    acc[change.branch_name] = [];
                }
                acc[change.branch_name].push(change);
                return acc;
            }, {});
            // Преобразуем сгруппированные изменения в сообщение
            Object.keys(groupedChanges).forEach(branch => {
                message += `🏢 ${branch}:\n`;
                groupedChanges[branch].forEach(change => {
                    message += `- ${change.service_name}: ${change.old_price}₽ → ${change.new_price}₽\n`;
                });
                message += '\n';
            });
        }
        if (result.data.errors.length > 0) {
            message += '\n⚠️ Предупреждения:\n';
            for (const error of result.data.errors) {
                message += `- Строка ${error.row}: ${error.message}\n`;
            }
        }
        ctx.session.pendingChanges = result.data.changes;
        await ctx.reply(message, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Подтвердить', 'confirm_changes')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel_changes')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error processing uploaded file:', error);
        await ctx.reply('Произошла ошибка при обработке файла. Проверьте формат и попробуйте снова.');
    }
});
// Подтверждение изменений
changeServicesScene.action('confirm_changes', async (ctx) => {
    var _a, _b;
    try {
        await ctx.answerCbQuery('Применяем изменения...');
        const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
        const password = (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password;
        const changes = ctx.session.pendingChanges;
        if (!phone || !password) {
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }
        if (!changes || changes.length === 0) {
            await ctx.editMessageText('Нет изменений для применения');
            return;
        }
        // Применяем изменения через API
        const updates = changes.map(change => ({
            branch_id: change.branch_id,
            service_id: change.service_id,
            new_price: change.new_price
        }));
        // Применяем изменения через API
        const results = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateServicePrices({
            phone,
            password,
            updates
        });
        // Формируем отчет
        let message = '📊 Результаты обновления:\n\n';
        message += `✅ Успешно: ${results.data.success}\n`;
        if (results.data.failed > 0) {
            message += `❌ Ошибок: ${results.data.failed}\n\n`;
            message += 'Детали ошибок:\n';
            results.data.errors.forEach((error) => {
                message += `- ${error.branch_name}, ${error.service_name}: ${error.error}\n`;
            });
        }
        await ctx.editMessageText(message, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error applying changes:', error);
        await ctx.reply('Произошла ошибка при применении изменений. Попробуйте позже.');
    }
});
// Навигация
changeServicesScene.action('back_to_menu', async (ctx) => {
    await ctx.scene.reenter();
});
changeServicesScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
});
changeServicesScene.action('cancel_changes', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        ctx.session.pendingChanges = undefined;
        await ctx.editMessageText('❌ Изменения отменены', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')
            ]]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error cancelling changes:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (changeServicesScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/createWarehouseNotificationScene.ts":
/*!************************************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/createWarehouseNotificationScene.ts ***!
  \************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createWarehouseNotificationScene: () => (/* binding */ createWarehouseNotificationScene),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! telegraf/format */ "telegraf/format");
/* harmony import */ var telegraf_format__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(telegraf_format__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");




// Кнопки по умолчанию
const defaultButtons = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_products')],
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
];
const defaultButtonsMenuOnly = [
    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
];
// Создаем WizardScene
const createWarehouseNotificationScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('create_warehouse_notification_scene', 
// Шаг 1
async (ctx) => {
    var _a, _b;
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Первый шаг создания уведомления', {
        selectedProductId: ctx.session.selectedProductId,
        scene: (_a = ctx.scene.current) === null || _a === void 0 ? void 0 : _a.id
    });
    try {
        if (!((_b = ctx.session) === null || _b === void 0 ? void 0 : _b.selectedProductId)) {
            throw new Error('Продукт не выбран');
        }
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Отмена', 'back_to_products')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);
        await ctx.reply('Введите минимальное количество товара, при достижении которого нужно отправить уведомление:', keyboard);
        return ctx.wizard.next();
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Ошибка в первом шаге:', error);
        await ctx.reply('Произошла ошибка. Возвращаемся к выбору продукта.');
        return ctx.scene.enter('products_scene');
    }
}, 
// Шаг 2: Подтверждение
// Шаг 2: Подтверждение
async (ctx) => {
    var _a;
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Вход во второй шаг', {
        message: ctx.message,
        session: ctx.scene.session,
        wizard_state: (_a = ctx.wizard) === null || _a === void 0 ? void 0 : _a.state
    });
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Пожалуйста, введите число.');
        return;
    }
    const amount = parseInt(ctx.message.text, 10);
    if (isNaN(amount) || amount < 0) {
        await ctx.reply('Пожалуйста, введите положительное число.');
        return;
    }
    try {
        // Инициализируем объект, если его нет
        if (!ctx.session.warehouseForm) {
            ctx.session.warehouseForm = {
                productId: ctx.session.selectedProductId,
                minAmount: null,
                type: 'warehouse'
            };
        }
        // Теперь безопасно устанавливаем значение
        ctx.session.warehouseForm.minAmount = amount;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Подтвердить', 'confirm_warehouse_notification')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отмена', 'back_to_products')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);
        const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `Проверьте настройки уведомления:

${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)('Минимальное количество')}: ${amount}

Подтвердите создание уведомления.`;
        await ctx.reply(message, keyboard);
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Подтверждение настроек отправлено', {
            amount,
            form: ctx.session.warehouseForm
        });
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Ошибка во втором шаге:', error);
        await ctx.reply('Произошла ошибка при обработке данных. Попробуйте еще раз.');
        return ctx.scene.enter('products_scene');
    }
});
// Добавляем обработчики действий
createWarehouseNotificationScene.action('confirm_warehouse_notification', async (ctx) => {
    var _a, _b;
    try {
        // Берем form из ctx.session вместо ctx.scene.session
        const form = ctx.session.warehouseForm;
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Попытка создания уведомления', {
            form,
            user_id: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id
        });
        if (!form || !form.productId || !form.minAmount) {
            throw new Error('Неполные данные формы');
        }
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].createWarehouseNotification(ctx.from.id, {
            productId: form.productId,
            minAmount: form.minAmount,
            type: 'warehouse',
            branchId: ctx.session.selectedBranchId // Добавляем из сессии
        });
        if (!result) {
            throw new Error('Failed to create notification');
        }
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать еще', 'back_to_products')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 Все уведомления', 'warehouse_list')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);
        const message = (0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.fmt) `✅ Уведомление создано

Когда количество товара достигнет ${(0,telegraf_format__WEBPACK_IMPORTED_MODULE_1__.code)(form.minAmount.toString())} единиц, 
вы получите уведомление.`;
        await ctx.reply(message, keyboard);
        await ctx.answerCbQuery('Уведомление создано');
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Уведомление успешно создано', {
            form,
            user_id: (_b = ctx.from) === null || _b === void 0 ? void 0 : _b.id
        });
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error creating notification:', error);
        await ctx.reply('Произошла ошибка при создании уведомления. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
});
createWarehouseNotificationScene.action('back_to_products', async (ctx) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Возврат к списку продуктов');
    await ctx.answerCbQuery();
    return ctx.scene.enter('products_scene');
});
createWarehouseNotificationScene.action('warehouse_list', async (ctx) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Переход к списку уведомлений');
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse_notifications_list');
});
createWarehouseNotificationScene.action('mainmenu', async (ctx) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Возврат в главное меню');
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});
// Обработка необработанных callback-запросов
// Обработка необработанных callback-запросов
// Обработка текстовых сообщений вне шагов
createWarehouseNotificationScene.on('text', async (ctx, next) => {
    var _a, _b, _c;
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Получено текстовое сообщение', {
        step: (_a = ctx.wizard) === null || _a === void 0 ? void 0 : _a.cursor,
        text: ctx.message.text
    });
    if (((_b = ctx.wizard) === null || _b === void 0 ? void 0 : _b.cursor) === 0 || ((_c = ctx.wizard) === null || _c === void 0 ? void 0 : _c.cursor) === 1) {
        return next();
    }
    await ctx.reply('Пожалуйста, используйте доступные команды.');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createWarehouseNotificationScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/employmentScene.ts":
/*!*******************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/employmentScene.ts ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   employmentScene: () => (/* binding */ employmentScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_2__);



const employmentScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('employment');
// Функция для отображения главного меню трудоустройства
const showEmploymentMenu = async (ctx) => {
    var _a;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 Активные заявки', 'show_applications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➕ Трудоустроить', 'add_employee')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'mainmenu')]
    ]);
    const text = '👥 Управление трудоустройством\n\nВыберите действие:';
    if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
        await ctx.editMessageText(text, keyboard);
    }
    else {
        await ctx.reply(text, keyboard);
    }
};
// Вход в сцену
employmentScene.enter(async (ctx) => {
    await showEmploymentMenu(ctx);
});
// Обработчик для показа активных заявок
employmentScene.action('show_applications', async (ctx) => {
    try {
        const applications = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getActiveRegistrations();
        console.log('Received applications:', applications); // Добавим лог
        if (!applications || applications.length === 0) {
            await ctx.editMessageText('📝 Активные заявки отсутствуют', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back_to_employment')]]));
            return;
        }
        const buttons = applications.map(app => ([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`👤 ${app.short_name}`, `view_application_${app.id}`)
        ]));
        buttons.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back_to_employment')]);
        await ctx.editMessageText('📋 Активные заявки на трудоустройство:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
    }
    catch (error) {
        console.error('Error fetching applications:', error);
        await ctx.reply('Произошла ошибка при получении заявок.');
    }
});
// Обработчик просмотра конкретной заявки
employmentScene.action(/^view_application_(\d+)$/, async (ctx) => {
    try {
        const applicationId = ctx.match[1];
        const application = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getRegistrationDetails(applicationId);
        // Форматируем дату из ISO в DD.MM.YYYY
        const formattedDate = application.has_med_book && application.med_book_expiry
            ? new Date(application.med_book_expiry).toLocaleDateString('ru-RU')
            : '';
        const messageText = `
👤 Заявка на трудоустройство

ФИО: ${application.full_name}
Телефон: ${application.phone}
Email: ${application.email}
Филиал: ${application.branch_name}
Ставка: ${application.master_price}%

🏥 Мед. книжка: ${application.has_med_book ? '✅' : '❌'}
${application.has_med_book ? `Срок действия до: ${formattedDate}` : ''}
📜 Сертификат: ${application.has_education_cert ? '✅' : '❌'}

🏦 Самозанятый: ${application.is_self_employed ? '✅' : '❌'}
`;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Принять', `approve_${applicationId}`),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отказать', `reject_${applicationId}`)
            ],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« К списку заявок', 'show_applications')]
        ]);
        await ctx.editMessageText(messageText, keyboard);
    }
    catch (error) {
        console.error('Error viewing application:', error);
        await ctx.reply('Произошла ошибка при просмотре заявки.');
    }
});
// Обработка проверки документов
// Обработка проверки документов
employmentScene.action(/^check_docs_(\d+)$/, async (ctx) => {
    const applicationId = ctx.match[1];
    try {
        const documents = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getRegistrationDocuments(applicationId);
        if (documents && documents.length > 0) {
            for (const doc of documents) {
                try {
                    const fileBuffer = await fs__WEBPACK_IMPORTED_MODULE_2__.promises.readFile(doc.path);
                    await ctx.replyWithDocument({
                        source: fileBuffer,
                        filename: doc.original_name
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (docError) {
                    console.error('Error sending document:', {
                        error: docError,
                        document: doc
                    });
                    await ctx.reply(`Ошибка при отправке документа ${doc.original_name}`);
                }
            }
            // Добавляем сообщение с кнопкой возврата после отправки всех документов
            await ctx.reply('Все документы отправлены', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к заявке', `view_application_${applicationId}`)
                ]]));
        }
        else {
            await ctx.reply('Документы еще не были загружены кандидатом.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к заявке', `view_application_${applicationId}`)
                ]]));
        }
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        await ctx.reply('Произошла ошибка при получении документов.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к заявке', `view_application_${applicationId}`)
            ]]));
    }
});
// Обработчики принятия/отказа
employmentScene.action(/^approve_(\d+)$/, async (ctx) => {
    const applicationId = ctx.match[1];
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].approveRegistration(applicationId);
        await ctx.answerCbQuery('✅ Кандидат успешно принят на работу');
        await ctx.scene.reenter();
    }
    catch (error) {
        console.error('Error approving application:', error);
        await ctx.reply('Произошла ошибка при одобрении заявки.');
    }
});
employmentScene.action(/^reject_(\d+)$/, async (ctx) => {
    const applicationId = ctx.match[1];
    try {
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].rejectRegistration(applicationId);
        await ctx.answerCbQuery('❌ Заявка отклонена');
        await ctx.scene.reenter();
    }
    catch (error) {
        console.error('Error rejecting application:', error);
        await ctx.reply('Произошла ошибка при отклонении заявки.');
    }
});
// Обработчик добавления нового сотрудника
employmentScene.action('add_employee', async (ctx) => {
    const text = `
📝 Инструкция по трудоустройству нового мастера:

1️⃣ Отправьте кандидату ссылку на бота:
@testmaster031224_bot

2️⃣ Кандидату необходимо:
- Запустить бота командой /start
- Пройти процесс регистрации
- Загрузить необходимые документы

❗️ После загрузки документов заявка появится в разделе "Активные заявки"
    `;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back_to_employment')
        ]]);
    await ctx.editMessageText(text, keyboard);
});
// Обработчики навигации
employmentScene.action('back_to_employment', async (ctx) => {
    await ctx.answerCbQuery();
    await showEmploymentMenu(ctx);
});
employmentScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
// Обработка ошибок
employmentScene.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (error) {
        console.error('Error in employmentScene:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже или обратитесь к администратору.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back_to_employment')
            ]]));
    }
});


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/notificationsCreateScene.ts":
/*!****************************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/notificationsCreateScene.ts ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   notificationsCreateScene: () => (/* binding */ notificationsCreateScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");



const notificationsCreateScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('notifications_create_scene');
// Обработчик входа в сцену
notificationsCreateScene.enter(async (ctx) => {
    // Инициализируем структуру уведомления
    ctx.session.notificationForm = {
        name: '',
        sum: '',
        dateTime: '',
        type: '',
        frequency: '', // daily, weekly, monthly, custom
        frequency_value: '', // Для custom: количество дней
        created_at: new Date().toISOString()
    };
    await ctx.reply('Введите название уведомления\n\nПример: Оплатить аренду помещения', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]));
});
// Обработчик текстовых сообщений
notificationsCreateScene.on('text', async (ctx) => {
    if (!ctx.session.notificationForm) {
        await ctx.scene.reenter();
        return;
    }
    const form = ctx.session.notificationForm;
    try {
        // Этап ввода названия
        if (!form.name) {
            form.name = ctx.message.text;
            await ctx.reply('Какая сумма для оплаты?\n\nЕсли сумма не требуется, введите 0', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_name')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        // Этап ввода суммы
        if (!form.sum && form.sum !== '0') {
            const sum = Number(ctx.message.text);
            if (isNaN(sum) || sum < 0) {
                await ctx.reply('Пожалуйста, введите положительное число или 0');
                return;
            }
            form.sum = sum.toString();
            await ctx.reply('Введите дату и время уведомления\n\nФормат: ДД.ММ.ГГГГ ЧЧ:ММ\nПример: 25.12.2024 15:00', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_sum')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        // Этап ввода даты и времени
        if (!form.dateTime) {
            const dateTimeRegex = /^(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2})$/;
            const match = ctx.message.text.match(dateTimeRegex);
            if (!match) {
                await ctx.reply('Неверный формат даты и времени!\n\n' +
                    'Используйте формат: ДД.ММ.ГГГГ ЧЧ:ММ\n' +
                    'Например: 25.12.2024 15:00');
                return;
            }
            const [_, day, month, year, hour, minute] = match;
            const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
            if (date < new Date()) {
                await ctx.reply('Дата и время не могут быть в прошлом');
                return;
            }
            form.dateTime = ctx.message.text;
            // Запрашиваем тип уведомления
            await ctx.reply('Уведомление разовое или повторяющееся?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⚡️ Разовое', 'type_single'),
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Повторяющееся', 'type_recurring')
                ],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_datetime')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        // Этап ввода значения для кастомной периодичности
        if (form.type === 'recurring' && form.frequency === 'custom' && !form.frequency_value) {
            const days = parseInt(ctx.message.text);
            if (isNaN(days) || days <= 0 || days > 365) {
                await ctx.reply('Пожалуйста, введите число от 1 до 365');
                return;
            }
            form.frequency_value = days.toString();
            await createNotification(ctx);
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in notifications create scene:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте начать сначала.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Начать сначала', 'restart')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_notifications')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
});
// Обработчики типа уведомления
notificationsCreateScene.action('type_single', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.type = 'single';
    await createNotification(ctx);
});
notificationsCreateScene.action('type_recurring', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.type = 'recurring';
    await ctx.reply('Выберите периодичность уведомления:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Каждый день', 'frequency_daily')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Каждую неделю', 'frequency_weekly')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Каждый месяц', 'frequency_monthly')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Указать свой период', 'frequency_custom')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_type')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]));
});
// Обработчики периодичности
notificationsCreateScene.action(['frequency_daily', 'frequency_weekly', 'frequency_monthly'], async (ctx) => {
    await ctx.answerCbQuery();
    const frequencyMap = {
        'frequency_daily': 'daily',
        'frequency_weekly': 'weekly',
        'frequency_monthly': 'monthly'
    };
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        const frequency = frequencyMap[data];
        if (frequency) {
            ctx.session.notificationForm.frequency = frequency;
        }
    }
    await createNotification(ctx);
});
notificationsCreateScene.action('frequency_custom', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.frequency = 'custom';
    await ctx.reply('Введите количество дней между уведомлениями (от 1 до 365):', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_frequency')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]));
});
// Функция создания уведомления
async function createNotification(ctx) {
    try {
        const form = ctx.session.notificationForm;
        if (!form) {
            throw new Error('Notification form is empty');
        }
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].createNotificationByTelegramId(ctx.from.id, ctx.session.notificationForm);
        if (!(result === null || result === void 0 ? void 0 : result.success)) {
            throw new Error((result === null || result === void 0 ? void 0 : result.message) || 'Failed to create notification');
        }
        const message = `✅ Уведомление успешно создано!\n\n` +
            `📝 Название: ${form.name}\n` +
            `💰 Сумма: ${form.sum === '0' ? 'не указана' : form.sum + ' руб.'}\n` +
            `🕐 Время: ${form.dateTime}\n` +
            `🔄 Тип: ${form.type === 'single' ? 'разовое' : 'повторяющееся'}`;
        await ctx.reply(message, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать ещё', 'create_another')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 К списку уведомлений', 'back_to_notifications')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error creating notification:', error);
        await ctx.reply('❌ Ошибка при создании уведомления', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'restart')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_notifications')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
}
// Обработчики навигации и сброса данных
notificationsCreateScene.action('reset_name', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.name = '';
    await ctx.scene.reenter();
});
notificationsCreateScene.action('reset_sum', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.sum = '';
    await ctx.reply('Какая сумма для оплаты?\n\nЕсли сумма не требуется, введите 0');
});
notificationsCreateScene.action('reset_datetime', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.dateTime = '';
    await ctx.reply('Введите дату и время уведомления\n\nФормат: ДД.ММ.ГГГГ ЧЧ:ММ\nПример: 25.12.2024 15:00');
});
notificationsCreateScene.action('reset_type', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.type = '';
    await ctx.reply('Уведомление разовое или повторяющееся?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⚡️ Разовое', 'type_single'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Повторяющееся', 'type_recurring')
        ],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_datetime')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]));
});
notificationsCreateScene.action('reset_frequency', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.notificationForm.frequency = '';
    ctx.session.notificationForm.type = 'recurring';
    await ctx.reply('Выберите периодичность уведомления:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Каждый день', 'frequency_daily')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Каждую неделю', 'frequency_weekly')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Каждый месяц', 'frequency_monthly')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Указать свой период', 'frequency_custom')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'reset_type')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]));
});
// Общие обработчики навигации
notificationsCreateScene.action('create_another', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
});
notificationsCreateScene.action('back_to_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_management');
});
notificationsCreateScene.action('restart', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
});
notificationsCreateScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (notificationsCreateScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/notificationsListScene.ts":
/*!**************************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/notificationsListScene.ts ***!
  \**************************************************************************/
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
/* harmony import */ var date_fns_tz__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! date-fns-tz */ "date-fns-tz");
/* harmony import */ var date_fns_tz__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(date_fns_tz__WEBPACK_IMPORTED_MODULE_3__);




const notificationsListScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('notifications_list_scene');
// Вход в сцену - показываем список уведомлений
notificationsListScene.enter(async (ctx) => {
    try {
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getAdminNotifications(ctx.from.id);
        if (!(response === null || response === void 0 ? void 0 : response.success) || !(response === null || response === void 0 ? void 0 : response.data)) {
            await ctx.reply('❌ Ошибка при загрузке уведомлений', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        let notificationsArray = [];
        // Response.data теперь точно содержит PaginatedNotifications
        if (response.data.data) {
            notificationsArray = response.data.data;
        }
        if (notificationsArray.length === 0) {
            await ctx.reply('📝 У вас пока нет активных уведомлений', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        if (notificationsArray.length === 0) {
            await ctx.reply('📝 У вас пока нет активных уведомлений', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать уведомление', 'create_notification')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        await ctx.reply('📋 Список ваших уведомлений:\n\n' +
            notificationsArray.map((notif, index) => {
                let formattedTime = notif.notification_datetime;
                if (notif.notification_datetime && typeof notif.notification_datetime === 'string') {
                    try {
                        formattedTime = (0,date_fns_tz__WEBPACK_IMPORTED_MODULE_3__.formatInTimeZone)(new Date(notif.notification_datetime), 'Europe/Moscow', 'dd.MM.yyyy HH:mm');
                    }
                    catch (e) {
                        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error formatting notification time', { error: e, notification: notif });
                    }
                }
                return `${index + 1}. 📝 ${notif.name}\n` +
                    `💰 Сумма: ${notif.sum ? `${notif.sum} руб.` : 'не указана'}\n` +
                    `🕐 Время: ${formattedTime}\n` +
                    `🔄 Тип: ${notif.type === 'single' ? 'разовое' : 'повторяющееся'}\n`;
            }).join('\n'), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            ...notificationsArray.map(notif => [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`✏️ ${notif.name}`, `edit_${notif.id}`)
            ]),
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать уведомление', 'create_notification')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in notifications list scene:', error);
        await ctx.reply('❌ Произошла ошибка при загрузке уведомлений');
    }
});
// Обработка нажатия на уведомление для редактирования
notificationsListScene.action(/edit_(\d+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const notificationId = ctx.match[1];
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getAdminNotification(parseInt(notificationId));
        if (!(response === null || response === void 0 ? void 0 : response.success) || !(response === null || response === void 0 ? void 0 : response.data)) {
            await ctx.reply('❌ Уведомление не найдено');
            return;
        }
        const notification = response.data;
        let formattedTime = 'не указано';
        if (notification.notification_datetime) {
            try {
                formattedTime = (0,date_fns_tz__WEBPACK_IMPORTED_MODULE_3__.formatInTimeZone)(new Date(notification.notification_datetime), 'Europe/Moscow', 'dd.MM.yyyy HH:mm');
            }
            catch (error) {
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Ошибка форматирования даты', { error, date: notification.notification_datetime });
            }
        }
        ctx.session.selectedNotificationId = parseInt(notificationId);
        await ctx.reply(`Выберите, что хотите изменить:\n\n` +
            `📝 Название: ${notification.name || 'не указано'}\n` +
            `💰 Сумма: ${notification.sum ? `${notification.sum} руб.` : 'не указана'}\n` +
            `🕐 Время: ${formattedTime}`, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Название', 'edit_name')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('💰 Сумму', 'edit_sum')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🕐 Дату', 'edit_date')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Удалить', 'delete_notification')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_list')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Ошибка в действии редактирования уведомления:', error);
        await ctx.reply('❌ Произошла ошибка');
    }
});
// Обработчики редактирования
notificationsListScene.action('edit_name', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = 'name';
    await ctx.reply('Введите новое название уведомления:');
});
notificationsListScene.action('edit_sum', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = 'sum';
    await ctx.reply('Введите новую сумму (или 0, если сумма не требуется):');
});
notificationsListScene.action('edit_date', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = 'date';
    await ctx.reply('Введите новую дату и время:\n\n' +
        'Формат: ДД.ММ.ГГГГ ЧЧ:ММ\n' +
        'Например: 25.12.2024 15:00');
});
// Обработка текстовых сообщений для редактирования
// Обработка текстовых сообщений для редактирования
notificationsListScene.on('text', async (ctx) => {
    if (!ctx.session.editField || !ctx.session.selectedNotificationId) {
        return;
    }
    try {
        let updateData = {};
        const value = ctx.message.text;
        // Получаем текущее уведомление для проверки его типа
        const currentNotification = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getAdminNotification(ctx.session.selectedNotificationId);
        if (!(currentNotification === null || currentNotification === void 0 ? void 0 : currentNotification.success) || !(currentNotification === null || currentNotification === void 0 ? void 0 : currentNotification.data)) {
            throw new Error('Failed to get current notification');
        }
        // Особая обработка для даты
        if (ctx.session.editField === 'date') {
            try {
                // Парсим введённую дату в формате ДД.ММ.ГГГГ ЧЧ:ММ
                const [datePart, timePart] = value.split(' ');
                if (!datePart || !timePart) {
                    throw new Error('Invalid date format');
                }
                const [day, month, year] = datePart.split('.');
                const [hours, minutes] = timePart.split(':');
                // Проверяем все компоненты даты
                if (!day || !month || !year || !hours || !minutes) {
                    throw new Error('Invalid date components');
                }
                // Создаём дату в московском часовом поясе
                const moscowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                if (isNaN(moscowDate.getTime())) {
                    throw new Error('Invalid date');
                }
                // Преобразуем в UTC для сохранения
                const utcDate = (0,date_fns_tz__WEBPACK_IMPORTED_MODULE_3__.formatInTimeZone)(moscowDate, 'Europe/Moscow', "yyyy-MM-dd HH:mm:ss");
                updateData.notification_datetime = utcDate;
                // Для повторяющихся уведомлений сбрасываем дату последней отправки
                if (currentNotification.data.type === 'recurring') {
                    updateData.last_notification_sent_at = null;
                }
            }
            catch (error) {
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error parsing date:', error);
                await ctx.reply('❌ Неверный формат даты. Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ\n' +
                    'Например: 25.12.2024 15:00');
                return;
            }
        }
        else {
            // Для остальных полей просто передаём значение
            updateData[ctx.session.editField] = value;
        }
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].updateAdminNotification(ctx.session.selectedNotificationId, updateData);
        if (result === null || result === void 0 ? void 0 : result.success) {
            await ctx.reply('✅ Уведомление успешно обновлено', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 К списку уведомлений', 'back_to_list')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
        }
        else {
            throw new Error('Failed to update notification');
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error updating notification:', error);
        await ctx.reply('❌ Произошла ошибка при обновлении');
    }
    ctx.session.editField = undefined;
});
// Удаление уведомления
notificationsListScene.action('delete_notification', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        if (!ctx.session.selectedNotificationId) {
            throw new Error('No notification selected');
        }
        const success = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].deleteAdminNotification(ctx.session.selectedNotificationId);
        if (success) {
            await ctx.reply('✅ Уведомление удалено', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 К списку уведомлений', 'back_to_list')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
        }
        else {
            throw new Error('Failed to delete notification');
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error deleting notification:', error);
        await ctx.reply('❌ Произошла ошибка при удалении уведомления');
    }
});
// Навигация
notificationsListScene.action('back_to_list', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.editField = undefined;
    ctx.session.selectedNotificationId = undefined;
    await ctx.scene.reenter();
});
notificationsListScene.action('create_notification', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_create_scene');
});
notificationsListScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (notificationsListScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/notificationsManagementScene.ts":
/*!********************************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/notificationsManagementScene.ts ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   notificationsManagementScene: () => (/* binding */ notificationsManagementScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);

const notificationsManagementScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('notifications_management');
notificationsManagementScene.enter(async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Создать уведомление', 'create_notification')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 Активные уведомления', 'active_notifications')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_main')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
    ]);
    await ctx.reply('Управление уведомлениями\n\n' +
        'Здесь вы можете создавать напоминания и просматривать активные уведомления.', keyboard);
});
// Обработчик кнопки создания нового уведомления
notificationsManagementScene.action('create_notification', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_create_scene');
});
// Обработчик кнопки просмотра активных уведомлений
notificationsManagementScene.action('active_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('notifications_list_scene');
});
// Обработчик кнопки "Назад"
notificationsManagementScene.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
// Обработчик кнопки "Главное меню"
notificationsManagementScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (notificationsManagementScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/pinboxScene.ts":
/*!***************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/pinboxScene.ts ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   pinboxScene: () => (/* binding */ pinboxScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");



const pinboxScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('pinbox');
// Константы для категорий
const CATEGORIES = {
    WOMAN: 'Женский шугаринг',
    MAN: 'Мужской шугаринг',
    ADDITIONAL: 'Дополнительные услуги'
};
const BRANCH_IDS = {
    YCLIENTS: 490462, // ID в Yclients (Спортивная)
    PINBOX: '63744,63745,63746' // ID в Pinbox (все филиалы)
};
const CATEGORY_MAPPING = {
    'Классический шугаринг Cherry Town  женский': CATEGORIES.WOMAN,
    'Чёрный шунгитовый шугаринг Monochrome женский': CATEGORIES.WOMAN,
    'Лечебный spa-шугаринг Botanix  женский': CATEGORIES.WOMAN,
    'Полимерный воск  italwax женский': CATEGORIES.WOMAN,
    'Классический шугаринг Cherry Town мужской': CATEGORIES.MAN,
    'Чёрный шунгитовый шугаринг Monochrome мужской': CATEGORIES.MAN,
    'Лечебный spa-шугаринг Botanix  мужской': CATEGORIES.MAN,
    'Комбинированная депиляция  сахар +воск мужской': CATEGORIES.MAN,
    'Полимерный воск  italwax мужской': CATEGORIES.MAN,
    'Карамельная липосакция Renie': CATEGORIES.ADDITIONAL
};
// Входная точка сцены
pinboxScene.enter(async (ctx) => {
    var _a, _b;
    const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
    const password = (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password;
    if (!phone || !password) {
        await ctx.reply('Ошибка: не найдены данные авторизации. Попробуйте перелогиниться.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')
            ]]));
        return;
    }
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📥 Выгрузить таблицу Pinbox', 'export_pinbox')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]);
    await ctx.reply('📦 Модуль Pinbox\n\n' +
        '• Выгрузка данных производится из эталонного филиала "Спортивная"\n' +
        '• Услуги автоматически группируются по категориям\n' +
        '• Форматирование производится согласно требованиям Pinbox\n\n' +
        'Нажмите кнопку ниже для выгрузки таблицы.', keyboard);
});
// Экспорт таблицы
pinboxScene.action('export_pinbox', async (ctx) => {
    var _a, _b;
    try {
        await ctx.answerCbQuery();
        const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
        const password = (_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password;
        // 1. Показываем «Пожалуйста, подождите»
        const waitingMessage = await ctx.reply('⏳ Формируем таблицу Pinbox, пожалуйста, подождите...');
        if (!phone || !password) {
            await ctx.deleteMessage(waitingMessage.message_id);
            await ctx.reply('Ошибка: не найдены данные авторизации.');
            return;
        }
        // 2. Генерируем файл
        const template = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].generatePinboxTemplate({ phone, password });
        // 3. Удаляем сообщение «ждём...»
        await ctx.deleteMessage(waitingMessage.message_id);
        // 4. Отправляем результат
        await ctx.replyWithDocument({
            source: template,
            filename: 'pinbox_services.xlsx'
        });
        await ctx.reply('✅ Таблица успешно сформирована!\n' +
            'Теперь вы можете загрузить её в сервис Pinbox.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in pinbox export:', error);
        try {
            await ctx.deleteMessage(); // на случай, если waitingMessage существует
        }
        catch (e) {
            // ничего страшного
        }
        await ctx.reply('❌ Произошла ошибка при формировании таблицы. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]]));
    }
});
function formatServiceTitle(serviceTitle, categoryTitle) {
    // Очищаем входные данные от лишних пробелов
    serviceTitle = serviceTitle.trim();
    categoryTitle = categoryTitle.trim();
    // Объявляем переменную title
    let title = serviceTitle;
    // Базовое форматирование категории
    let categoryInfo = categoryTitle
        .replace(/Cherry\s*Town/gi, '')
        .replace(/женский$/, 'шугаринг женский')
        .replace(/мужской$/, 'шугаринг мужской')
        .trim();
    // Специальные случаи форматирования
    if (categoryTitle.toLowerCase().includes('italwax')) {
        const gender = categoryTitle.includes('женский') ? 'женский' : 'мужской';
        if (!serviceTitle.toLowerCase().includes('italwax')) {
            title = `${serviceTitle} Italwax | Полимерный воск italwax шугаринг ${gender}`;
        }
        else {
            title = `${serviceTitle} | Полимерный воск italwax шугаринг ${gender}`;
        }
    }
    else if (serviceTitle.includes('Botanix-SPA') || categoryTitle.includes('Botanix')) {
        const gender = categoryTitle.includes('женский') ? 'женский' : 'мужской';
        if (serviceTitle.includes('Botanix-SPA')) {
            title = `${serviceTitle} | Лечебный spa-шугаринг ${gender}`;
        }
        else {
            title = `${serviceTitle} Botanix-SPA | Лечебный spa-шугаринг ${gender}`;
        }
    }
    else if (categoryTitle.includes('Monochrome')) {
        const gender = categoryTitle.includes('женский') ? 'женский' : 'мужской';
        if (!serviceTitle.toLowerCase().includes('monochrome')) {
            title = `${serviceTitle} Monochrome | Чёрный шунгитовый шугаринг ${gender}`;
        }
        else {
            title = `${serviceTitle} | Чёрный шунгитовый шугаринг ${gender}`;
        }
    }
    else if (categoryTitle.includes('Карамельная липосакция')) {
        title = `${serviceTitle} | Карамельная липосакция Renie`;
    }
    else {
        // Стандартное форматирование для остальных случаев
        title = `${serviceTitle} | ${categoryInfo}`;
    }
    // Убираем лишние пробелы и дубликаты разделителей
    title = title
        .replace(/\s+/g, ' ') // Убираем множественные пробелы
        .replace(/\|\s+\|/g, '|') // Убираем дубли разделителей
        .trim();
    return title;
}
// Обновляем функцию форматирования для Pinbox
function formatServicesForPinbox(services) {
    const result = [];
    for (const service of services) {
        if (!CATEGORY_MAPPING[service.category_title])
            continue;
        const pinboxCategory = CATEGORY_MAPPING[service.category_title];
        const formattedTitle = formatServiceTitle(service.title, service.category_title);
        result.push({
            'Наименование товара': formattedTitle,
            'Тип цены': service.price_min ? 'фикс' : 'от',
            'Цена товара': service.price_min,
            'Валюта': 0, // рубли
            'Категория': pinboxCategory,
            'Описание': formattedTitle,
            'Номера филиалов': BRANCH_IDS.PINBOX,
            'URL фото': 'https://pinbox.ru/assets/images/cabinet/dfprice.img.png'
        });
    }
    return result;
}
// Навигация
pinboxScene.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
});
pinboxScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (pinboxScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/productsScene.ts":
/*!*****************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/productsScene.ts ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   productsScene: () => (/* binding */ productsScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");



const productsScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('products_scene');
productsScene.enter(async (ctx) => {
    var _a, _b, _c;
    try {
        // Читаем из общей сессии
        const branchId = parseInt(ctx.session.selectedBranchId, 10);
        console.log('Products scene enter:', {
            sessionBranchId: ctx.session.selectedBranchId,
            parsedBranchId: branchId
        });
        if (!branchId || isNaN(branchId)) {
            await ctx.reply('Филиал не выбран');
            return ctx.scene.enter('select_branch_scene');
        }
        // Получаем товары филиала
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getProducts(branchId);
        if (!(response === null || response === void 0 ? void 0 : response.success) || !(response === null || response === void 0 ? void 0 : response.data)) {
            await ctx.reply('В этом филиале нет товаров');
            return ctx.scene.enter('select_branch_scene');
        }
        const products = response.data;
        const buttons = [];
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            buttons.push([
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`${product.title} (${((_b = (_a = product.actual_amounts) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.amount) || 0} шт)`, `product_${product.good_id}`)
            ]);
        }
        buttons.push([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад к филиалам', 'back_to_branches'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')
        ]);
        const messageText = 'Выберите товар для которого нужно отслеживать остаток:';
        if ((_c = ctx.callbackQuery) === null || _c === void 0 ? void 0 : _c.message) {
            await ctx.editMessageText(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
        else {
            await ctx.reply(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
    }
    catch (error) {
        console.error('Error in products scene:', error);
        await ctx.reply('Произошла ошибка при загрузке товаров');
        return ctx.scene.enter('select_branch_scene');
    }
});
productsScene.action('back_to_branches', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('select_branch_scene');
});
productsScene.action('warehouse_list', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse_notifications_list');
});
productsScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});
productsScene.action(/^product_(\d+)$/, async (ctx) => {
    var _a, _b, _c, _d;
    try {
        const productId = ctx.match[1];
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Начало обработки выбора продукта:', {
            productId,
            branch_id: ctx.session.selectedBranchId,
            user_id: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id
        });
        // Сохраняем ID в session (не scene.session!)
        ctx.session.selectedProductId = productId;
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Переход к сцене создания уведомления', {
            selectedProductId: productId,
            session: ctx.session
        });
        // Сначала делаем переход
        const result = await ctx.scene.enter('create_warehouse_notification_scene');
        // Только потом отвечаем на callback
        await ctx.answerCbQuery('Товар выбран ✓');
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].info('Переход выполнен', {
            success: true,
            currentScene: (_b = ctx.scene.current) === null || _b === void 0 ? void 0 : _b.id
        });
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Ошибка при выборе продукта:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            productId: (_c = ctx.match) === null || _c === void 0 ? void 0 : _c[1],
            userId: (_d = ctx.from) === null || _d === void 0 ? void 0 : _d.id
        });
        await ctx.answerCbQuery('Произошла ошибка ❌');
        await ctx.reply('Произошла ошибка при выборе товара. Попробуйте еще раз.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'refresh_products')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
});
productsScene.action('refresh_products', async (ctx) => {
    await ctx.answerCbQuery('Обновляем список... ⌛');
    await ctx.scene.reenter();
});


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/remindLaterScene.ts":
/*!********************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/remindLaterScene.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   remindLaterScene: () => (/* binding */ remindLaterScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var moment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! moment */ "moment");
/* harmony import */ var moment__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(moment__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var moment_timezone__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! moment-timezone */ "moment-timezone");
/* harmony import */ var moment_timezone__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(moment_timezone__WEBPACK_IMPORTED_MODULE_4__);



 // Изменен импорт

const remindLaterScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('remind_later_scene');
// Обработчик входа в сцену
remindLaterScene.enter(async (ctx) => {
    try {
        const { state } = ctx.scene;
        const notificationId = state === null || state === void 0 ? void 0 : state.notificationId;
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Entering remind later scene:', {
            state,
            notificationId,
            scene_state: ctx.scene.state
        });
        if (!notificationId) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('No notification ID provided');
            await ctx.reply('❌ Произошла ошибка. Попробуйте снова.');
            await ctx.scene.leave();
            return;
        }
        await ctx.reply('⏰ Выберите время для повторного напоминания:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🕐 Через 15 минут', `remind_15_${notificationId}`)],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🕐 Через час', `remind_60_${notificationId}`)],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Завтра в это же время', `remind_tomorrow_${notificationId}`)],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отмена', 'cancel_remind')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in remind later scene enter:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте снова.');
        await ctx.scene.leave();
    }
});
// Обработчик для напоминания через 15 минут
remindLaterScene.action(/remind_15_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const notificationId = ctx.match[1];
    await handleReschedule(ctx, notificationId, 15, 'minutes');
});
// Обработчик для напоминания через час
remindLaterScene.action(/remind_60_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const notificationId = ctx.match[1];
    await handleReschedule(ctx, notificationId, 1, 'hours');
});
// Обработчик для напоминания завтра
remindLaterScene.action(/remind_tomorrow_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const notificationId = ctx.match[1];
    await handleReschedule(ctx, notificationId, 24, 'hours');
});
// Обработчик отмены
remindLaterScene.action('cancel_remind', async (ctx) => {
    await ctx.answerCbQuery('Отменено');
    await ctx.reply('❌ Перенос напоминания отменён');
    await ctx.scene.leave();
});
// Функция для обработки переноса уведомления
async function handleReschedule(ctx, notificationId, amount, unit) {
    try {
        // Добавляем минуты/часы к текущему UTC времени
        const utcDateTime = moment__WEBPACK_IMPORTED_MODULE_3___default()().utc()
            .add(amount, unit)
            .format('YYYY-MM-DD HH:mm:00');
        // Для отображения конвертируем в московское время
        const mskDisplayTime = moment__WEBPACK_IMPORTED_MODULE_3___default()().utc()
            .add(amount, unit)
            .tz('Europe/Moscow')
            .format('DD.MM.YYYY HH:mm');
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].rescheduleNotification(parseInt(notificationId), utcDateTime // отправляем время в UTC
        );
        if (result === null || result === void 0 ? void 0 : result.success) {
            await ctx.reply(`✅ Напоминание перенесено на ${mskDisplayTime}`, // показываем московское время
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
        }
        else {
            throw new Error('Failed to reschedule notification');
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error rescheduling notification:', error);
        await ctx.reply('❌ Произошла ошибка при переносе уведомления');
    }
    await ctx.scene.leave();
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (remindLaterScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/salaryScene.ts":
/*!***************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/salaryScene.ts ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   salaryScene: () => (/* binding */ salaryScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");




const salaryScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('salary');
// Хранилище состояний пользователей
const userStates = new Map();
// Функция для конвертации даты из формата DD.MM.YYYY в YYYY-MM-DD
function convertDateFormat(dateStr) {
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match)
        return null;
    return `${match[3]}-${match[2]}-${match[1]}`;
}
// Обработчик выбора периода
salaryScene.action('select_period', async (ctx) => {
    await ctx.reply('Введите дату начала периода в формате ДД.ММ.ГГГГ (например, 28.12.2024)');
    ctx.scene.state = { awaitingStartDate: true };
});
// Обработчик ввода текста (дат)
salaryScene.on('text', async (ctx) => {
    var _a;
    const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return;
    const state = ctx.scene.state;
    if (state.awaitingStartDate) {
        const startDateInput = ctx.message.text;
        const startDate = convertDateFormat(startDateInput);
        if (!startDate) {
            await ctx.reply('Неверный формат даты. Используйте формат ДД.ММ.ГГГГ (например, 28.12.2024)');
            return;
        }
        userStates.set(userId, { startDate, endDate: '' });
        ctx.scene.state = { awaitingEndDate: true };
        await ctx.reply('Теперь введите дату конца периода в формате ДД.ММ.ГГГГ');
        return;
    }
    if (state.awaitingEndDate) {
        const endDateInput = ctx.message.text;
        const endDate = convertDateFormat(endDateInput);
        if (!endDate) {
            await ctx.reply('Неверный формат даты. Используйте формат ДД.ММ.ГГГГ (например, 28.12.2024)');
            return;
        }
        const dateRange = userStates.get(userId);
        if (dateRange) {
            dateRange.endDate = endDate;
            userStates.set(userId, dateRange);
            // Преобразуем даты обратно для отображения
            const displayStartDate = dateRange.startDate.split('-').reverse().join('.');
            const displayEndDate = dateRange.endDate.split('-').reverse().join('.');
            const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📥 Сформировать отчет', 'export_salary')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Выбрать другой период', 'select_period')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('◀️ Назад', 'mainmenu')]
            ]);
            await ctx.reply(`Выбран период: ${displayStartDate} — ${displayEndDate}`, keyboard);
        }
        ctx.scene.state = {};
    }
});
// Обработчик экспорта
salaryScene.action('export_salary', async (ctx) => {
    var _a;
    try {
        const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return;
        const dateRange = userStates.get(userId);
        if (!dateRange) {
            await ctx.reply('Пожалуйста, сначала выберите период');
            return;
        }
        await ctx.answerCbQuery('Генерируем отчет...');
        const excelBuffer = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].exportSalaryReport(dateRange.startDate, dateRange.endDate);
        const tempDir = path__WEBPACK_IMPORTED_MODULE_2___default().join(__dirname, '../../../temp');
        if (!fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(tempDir)) {
            fs__WEBPACK_IMPORTED_MODULE_1___default().mkdirSync(tempDir, { recursive: true });
        }
        // Преобразуем даты для имени файла
        const fileStartDate = dateRange.startDate.split('-').reverse().join('.');
        const fileEndDate = dateRange.endDate.split('-').reverse().join('.');
        const tempFilePath = path__WEBPACK_IMPORTED_MODULE_2___default().join(tempDir, `salary_${Date.now()}.xlsx`);
        fs__WEBPACK_IMPORTED_MODULE_1___default().writeFileSync(tempFilePath, excelBuffer);
        await ctx.replyWithDocument({
            source: tempFilePath,
            filename: `Зарплаты_${fileStartDate}-${fileEndDate}.xlsx`
        });
        fs__WEBPACK_IMPORTED_MODULE_1___default().unlinkSync(tempFilePath);
    }
    catch (error) {
        console.error('Error exporting salary:', error);
        await ctx.reply('Произошла ошибка при формировании отчета. Попробуйте позже.');
    }
});
// Возврат в главное меню
salaryScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
// Входная точка сцены
salaryScene.enter(async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📅 Выбрать период', 'select_period')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('◀️ Назад', 'mainmenu')]
    ]);
    await ctx.reply('💰 Управление зарплатами', keyboard);
});


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/selectBranchScene.ts":
/*!*********************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/selectBranchScene.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   selectBranchScene: () => (/* binding */ selectBranchScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
// src/services/scenes/warehouse/selectBranchScene.ts



const selectBranchScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('select_branch_scene');
selectBranchScene.enter(async (ctx) => {
    var _a;
    try {
        // Получаем компании
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getCompanies();
        if (!(response === null || response === void 0 ? void 0 : response.success) || !(response === null || response === void 0 ? void 0 : response.data)) {
            await ctx.reply('Нет доступных филиалов');
            return ctx.scene.enter('warehouse');
        }
        const companies = response.data;
        // Создаем кнопки для каждого филиала
        const buttons = companies.map(company => [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(company.title, `select_branch_${company.id}`)
        ]);
        buttons.push([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')
        ]);
        const messageText = 'Выберите филиал для просмотра товаров:';
        if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
            await ctx.editMessageText(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
        else {
            await ctx.reply(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in selectBranchScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке списка филиалов');
        return ctx.scene.enter('warehouse');
    }
});
selectBranchScene.action(/^select_branch_(\d+)$/, async (ctx) => {
    try {
        const branchId = ctx.match[1];
        // Сохраняем в общей сессии вместо scene.session
        ctx.session.selectedBranchId = branchId;
        console.log('Selected branch ID in selection:', {
            branchId,
            session: ctx.session
        });
        await ctx.answerCbQuery('Филиал выбран');
        return ctx.scene.enter('products_scene');
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_2__["default"].error('Error in branch selection:', error);
        await ctx.reply('Произошла ошибка при выборе филиала');
        return ctx.scene.enter('select_branch_scene');
    }
});
selectBranchScene.action('back_to_warehouse', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse'); // Теперь возвращаемся в основное меню склада
});
selectBranchScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/tasksScene.ts":
/*!**************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/tasksScene.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   tasksScene: () => (/* binding */ tasksScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");



const tasksScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('tasks');
// Инициализация состояния при входе в сцену
tasksScene.enter(async (ctx) => {
    if (!ctx.scene.state) {
        ctx.scene.state = {
            tasksState: {
                page: 1,
                filter: 'active'
            }
        };
    }
    else {
        ctx.scene.state.tasksState = {
            page: 1,
            filter: 'active'
        };
    }
    await showTasks(ctx);
});
async function showTasks(ctx) {
    var _a, _b, _c, _d;
    try {
        const state = ctx.scene.state.tasksState;
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getTasks({
            page: state.page,
            per_page: 5,
            filter: state.filter
        });
        const tasks = ((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data) || [];
        const total = ((_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.total) || 0;
        const totalPages = Math.ceil(total / 5) || 1;
        // Проверяем валидность текущей страницы
        if (state.page > totalPages) {
            state.page = totalPages;
        }
        // Если нет задач
        if (!tasks.length) {
            const message = state.filter === 'completed'
                ? '📋 Нет выполненных задач'
                : '📋 Список задач пуст';
            if (ctx.callbackQuery) {
                try {
                    await ctx.editMessageText(message, buildMainMenuKeyboard());
                }
                catch (error) {
                    if (!((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('message is not modified'))) {
                        await ctx.reply(message, buildMainMenuKeyboard());
                    }
                }
            }
            else {
                await ctx.reply(message, buildMainMenuKeyboard());
            }
            return;
        }
        // Формируем заголовок
        const headerText = [
            '📋 Задачи',
            '',
            `Всего задач: ${total}`,
            `Страница: ${state.page}/${totalPages}`,
            '',
            'Выберите задачу для просмотра:'
        ].join('\n');
        // Формируем клавиатуру
        const keyboard = [
            // Задачи
            ...tasks.map(task => ([
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`${getStatusEmoji(task.status)} ${task.title.substring(0, 35)}${task.title.length > 35 ? '...' : ''}`, `view_task_${task.id}`)
            ])),
            // Навигация (показываем только если есть больше одной страницы)
            ...(totalPages > 1 ? [[
                    ...(state.page > 1 ? [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⬅️ Назад', 'prev_page')] : []),
                    ...(state.page < totalPages ? [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➡️ Вперёд', 'next_page')] : [])
                ]] : []),
            // Фильтры
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(state.filter === 'active' ? '🔵 Активные' : '⚪️ Активные', 'filter_active'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(state.filter === 'completed' ? '🔵 Выполненные' : '⚪️ Выполненные', 'filter_completed')
            ],
            // Кнопка возврата в меню
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'mainmenu')]
        ].filter(row => row.length > 0); // Убираем пустые ряды
        const markup = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(keyboard);
        // Отправляем или обновляем сообщение
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(headerText, markup);
            }
            catch (error) {
                if (!((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('message is not modified'))) {
                    console.error('Error updating message:', error);
                    // Если не удалось обновить, отправляем новое
                    await ctx.reply(headerText, markup);
                }
            }
        }
        else {
            await ctx.reply(headerText, markup);
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in showTasks:', error);
        const errorMessage = '❌ Произошла ошибка при загрузке задач';
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(errorMessage, buildMainMenuKeyboard());
            }
            catch (_e) {
                await ctx.reply(errorMessage, buildMainMenuKeyboard());
            }
        }
        else {
            await ctx.reply(errorMessage, buildMainMenuKeyboard());
        }
    }
}
// Добавим новый обработчик
tasksScene.action(/^get_master_photo_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const task = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getTaskById(taskId);
        if (!(task === null || task === void 0 ? void 0 : task.data)) {
            await ctx.answerCbQuery('❌ Задача не найдена');
            return;
        }
        await ctx.answerCbQuery('🔍 Получаем фото...');
        const photoResult = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getMasterPhoto(task.data.master_phone);
        if (!photoResult.success) {
            await ctx.reply('❌ ' + (photoResult.message || 'Ошибка получения фото мастера'), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться к задаче', `view_task_${taskId}`)
                ]]));
            return;
        }
        const messageText = `
🖼 Актуальное фото мастера:
👤 ${task.data.master_name}
📱 ${task.data.master_phone}

${photoResult.data.photo_url}
`.trim();
        await ctx.reply(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться к задаче', `view_task_${taskId}`)
            ]]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in get_master_photo handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});
// Просмотр задачи
tasksScene.action(/^view_task_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getTaskById(taskId);
        if (!(response === null || response === void 0 ? void 0 : response.data)) {
            await ctx.answerCbQuery('❌ Задача не найдена');
            return;
        }
        const task = response.data;
        // Форматируем сообщение в виде строки, а не массива
        const messageText = `
📋 Задача #${task.id}

📝 Название: ${task.title}
👤 Мастер: ${task.master_name || 'Не указан'}
${task.master_phone ? `📱 Телефон: ${task.master_phone}` : ''}
🔄 Статус: ${getStatusText(task.status)}
⏰ Создано: ${formatDate(task.created_at)}
${task.deadline ? `⚠️ Дедлайн: ${formatDate(task.deadline)}` : ''}
${task.completed_at ? `✅ Выполнено: ${formatDate(task.completed_at)}` : ''}

${task.description ? `📄 Описание: ${task.description}` : ''}
`.trim();
        const keyboard = [];
        if (task.status !== 'completed') {
            keyboard.push([
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Отметить выполненной', `complete_task_${task.id}`)
            ]);
            if (task.status === 'pending') {
                keyboard.push([
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Взять в работу', `progress_task_${task.id}`)
                ]);
            }
        }
        if (task.type === 'photo_update') {
            keyboard.push([
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🖼 Получить фото мастера', `get_master_photo_${task.id}`)
            ]);
        }
        keyboard.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад к списку', 'back_to_tasks')]);
        keyboard.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 В главное меню', 'mainmenu')]);
        await ctx.editMessageText(messageText, Object.assign({ parse_mode: 'HTML' }, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(keyboard)));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in view_task handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка при загрузке задачи');
    }
});
// Обработчики действий с задачами
tasksScene.action(/^complete_task_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].completeTask(taskId);
        if (result === null || result === void 0 ? void 0 : result.success) {
            await ctx.answerCbQuery('✅ Задача отмечена как выполненная');
            await showTasks(ctx);
        }
        else {
            await ctx.answerCbQuery('❌ Не удалось обновить статус задачи');
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in complete_task handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});
tasksScene.action(/^progress_task_(\d+)$/, async (ctx) => {
    try {
        const taskId = parseInt(ctx.match[1], 10);
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].updateTaskStatus(taskId, 'in_progress');
        if (result === null || result === void 0 ? void 0 : result.success) {
            await ctx.answerCbQuery('✅ Задача взята в работу');
            await showTasks(ctx);
        }
        else {
            await ctx.answerCbQuery('❌ Не удалось обновить статус задачи');
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in progress_task handler:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка');
    }
});
// Навигация и фильтры
tasksScene.action('prev_page', async (ctx) => {
    if (ctx.scene.state.tasksState.page > 1) {
        ctx.scene.state.tasksState.page--;
    }
    await ctx.answerCbQuery();
    await showTasks(ctx);
});
tasksScene.action('next_page', async (ctx) => {
    ctx.scene.state.tasksState.page++;
    await ctx.answerCbQuery();
    await showTasks(ctx);
});
tasksScene.action('filter_active', async (ctx) => {
    ctx.scene.state.tasksState.filter = 'active';
    ctx.scene.state.tasksState.page = 1;
    await ctx.answerCbQuery('🔵 Показаны активные задачи');
    await showTasks(ctx);
});
tasksScene.action('filter_completed', async (ctx) => {
    ctx.scene.state.tasksState.filter = 'completed';
    ctx.scene.state.tasksState.page = 1;
    await ctx.answerCbQuery('🔵 Показаны выполненные задачи');
    await showTasks(ctx);
});
tasksScene.action('back_to_tasks', async (ctx) => {
    await ctx.answerCbQuery();
    await showTasks(ctx);
});
tasksScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});
// Вспомогательные функции
function getStatusEmoji(status) {
    return {
        'pending': '⏳',
        'in_progress': '🔄',
        'completed': '✅'
    }[status] || '❓';
}
function getStatusText(status) {
    return {
        'pending': 'Ожидает выполнения',
        'in_progress': 'В процессе',
        'completed': 'Выполнена'
    }[status] || 'Неизвестно';
}
function formatDate(date) {
    return new Date(date).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function buildMainMenuKeyboard() {
    return telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'mainmenu')
        ]]);
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (tasksScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/warehouseNotificationsListScene.ts":
/*!***********************************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/warehouseNotificationsListScene.ts ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   warehouseNotificationsListScene: () => (/* binding */ warehouseNotificationsListScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");



const warehouseNotificationsListScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('warehouse_notifications_list');
warehouseNotificationsListScene.enter(async (ctx) => {
    var _a, _b, _c;
    try {
        const branchId = parseInt(ctx.session.selectedBranchId, 10);
        // Добавляем логирование
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Fetching warehouse notifications:', {
            telegramId: ctx.from.id,
            branchId: branchId
        });
        // Получаем все активные уведомления
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getWarehouseNotifications(ctx.from.id, branchId);
        // Добавляем проверку ответа
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Notifications response:', response);
        if (!(response === null || response === void 0 ? void 0 : response.success) || !((_b = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.length)) {
            await ctx.reply('Нет активных уведомлений об остатках', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_warehouse')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]));
            return;
        }
        const notifications = response.data.data;
        const buttons = notifications.map(notification => {
            var _a;
            return [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`${notification.product.title} | ${((_a = notification.company) === null || _a === void 0 ? void 0 : _a.title) || 'Неизвестный филиал'} (мин: ${notification.min_amount})`, `notification_${notification.id}`)
            ];
        });
        buttons.push([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_warehouse'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')
        ]);
        const messageText = 'Выберите товар чтобы изменить или удалить отслеживание:';
        if ((_c = ctx.callbackQuery) === null || _c === void 0 ? void 0 : _c.message) {
            await ctx.editMessageText(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
        else {
            await ctx.reply(messageText, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in warehouseNotificationsListScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке уведомлений');
    }
});
warehouseNotificationsListScene.action(/^notification_(\d+)$/, async (ctx) => {
    try {
        const notificationId = parseInt(ctx.match[1], 10);
        // Добавим логирование
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Fetching single notification:', { notificationId });
        // Вызываем специальный метод для получения одного уведомления
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getWarehouseNotification(notificationId); // Изменим метод
        if (!(response === null || response === void 0 ? void 0 : response.success) || !(response === null || response === void 0 ? void 0 : response.data)) {
            throw new Error('Notification not found');
        }
        const notification = response.data;
        ctx.session.selectedNotificationId = notificationId;
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Изменить мин. кол-во', 'edit_amount')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🗑 Удалить уведомление', 'delete_notification')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_list')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);
        await ctx.editMessageText(`[${notification.product.title}]\n` +
            `Фактическое кол-во на складе: ${notification.current_amount}\n` +
            `Мин. кол-во для уведомления: ${notification.min_amount}`, keyboard);
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error displaying notification:', error);
        await ctx.reply('Произошла ошибка при загрузке информации об уведомлении');
    }
});
// Обработчики действий
warehouseNotificationsListScene.action('edit_amount', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Введите новое минимальное количество для уведомления:');
    ctx.session.isEditing = true; // Устанавливаем флаг редактирования
});
// Добавляем обработчик текстовых сообщений
// В обработчике текстовых сообщений
warehouseNotificationsListScene.on('text', async (ctx) => {
    if (ctx.session.isEditing) {
        try {
            const newAmount = parseInt(ctx.message.text, 10);
            if (isNaN(newAmount) || newAmount < 0) {
                await ctx.reply('Пожалуйста, введите корректное положительное число');
                return;
            }
            const notificationId = ctx.session.selectedNotificationId;
            // Добавим проверку наличия ID уведомления
            if (!notificationId) {
                throw new Error('ID уведомления не найден');
            }
            // Добавим логирование
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Updating notification:', {
                notificationId,
                newAmount
            });
            // Обновляем уведомление
            const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].updateWarehouseNotification(notificationId, { min_amount: newAmount });
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Update response:', response);
            if (!(response === null || response === void 0 ? void 0 : response.success)) {
                throw new Error((response === null || response === void 0 ? void 0 : response.message) || 'Не удалось обновить уведомление');
            }
            // Получаем обновлённое уведомление
            const updatedNotification = await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].getWarehouseNotification(notificationId);
            if (!(updatedNotification === null || updatedNotification === void 0 ? void 0 : updatedNotification.success)) {
                throw new Error('Не удалось получить обновленное уведомление');
            }
            // Возвращаем к просмотру уведомления
            const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Изменить мин. кол-во', 'edit_amount')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🗑 Удалить уведомление', 'delete_notification')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_list')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
            ]);
            await ctx.reply(`✅ Минимальное количество обновлено!\n\n` +
                `[${updatedNotification.data.product.title}]\n` +
                `Фактическое кол-во на складе: ${updatedNotification.data.current_amount}\n` +
                `Мин. кол-во для уведомления: ${newAmount}`, keyboard);
            // Сбрасываем флаг редактирования
            ctx.session.isEditing = false;
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error updating notification amount:', error);
            await ctx.reply('Произошла ошибка при обновлении минимального количества: ' + error.message);
            ctx.session.isEditing = false;
        }
    }
});
warehouseNotificationsListScene.action('delete_notification', async (ctx) => {
    await ctx.answerCbQuery();
    // Показываем подтверждение удаления
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Да, удалить', 'confirm_delete'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отмена', 'cancel_delete')
        ]
    ]);
    await ctx.editMessageText('Вы уверены, что хотите удалить это уведомление?', keyboard);
});
warehouseNotificationsListScene.action('confirm_delete', async (ctx) => {
    try {
        const notificationId = ctx.session.selectedNotificationId;
        await _services_laravelService__WEBPACK_IMPORTED_MODULE_2__["default"].deleteWarehouseNotification(notificationId);
        await ctx.editMessageText('Товар удален из отслеживания.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 Все уведомления', 'back_to_list')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]));
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error deleting notification:', error);
        await ctx.reply('Произошла ошибка при удалении уведомления');
    }
});
warehouseNotificationsListScene.action('cancel_delete', async (ctx) => {
    await ctx.answerCbQuery('Отменено');
    return ctx.scene.reenter();
});
warehouseNotificationsListScene.action('back_to_warehouse', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse');
});
warehouseNotificationsListScene.action('back_to_list', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
warehouseNotificationsListScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (warehouseNotificationsListScene);


/***/ }),

/***/ "./src/telegraf/services/bot-admin/scenes/warehouseScene.ts":
/*!******************************************************************!*\
  !*** ./src/telegraf/services/bot-admin/scenes/warehouseScene.ts ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   warehouseScene: () => (/* binding */ warehouseScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");


const warehouseScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('warehouse');
warehouseScene.enter(async (ctx) => {
    var _a;
    try {
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Уведомление на остаток', 'create_notification')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📋 Работа с остатком', 'manage_notifications')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 Главное меню', 'mainmenu')]
        ]);
        const messageText = 'Выберите действие:';
        if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
            await ctx.editMessageText(messageText, keyboard);
        }
        else {
            await ctx.reply(messageText, keyboard);
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].error('Error in warehouseScene.enter:', error);
        await ctx.reply('Произошла ошибка при загрузке меню');
    }
});
// Перенаправление на создание уведомления
warehouseScene.action('create_notification', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('select_branch_scene');
});
// Перенаправление на управление существующими уведомлениями
warehouseScene.action('manage_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('warehouse_notifications_list');
});
warehouseScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('admin_main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (warehouseScene);


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
    await ctx.scene.enter('admin_main');
});
createNotifictationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
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
    await ctx.scene.enter('admin_main');
});
editNotificationScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
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
    await ctx.scene.enter('admin_main');
});
notifictationsScene.action('mainmenu', async (ctx) => {
    await ctx.scene.enter('admin_main');
});
notifictationsScene.action('create_notification', async (ctx) => {
    await ctx.scene.enter('create_notification');
});
notifictationsScene.action('active_notifications', async (ctx) => {
    await ctx.scene.enter('active_notifications');
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

/***/ "date-fns-tz":
/*!******************************!*\
  !*** external "date-fns-tz" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("date-fns-tz");

/***/ }),

/***/ "form-data":
/*!****************************!*\
  !*** external "form-data" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("form-data");

/***/ }),

/***/ "moment":
/*!*************************!*\
  !*** external "moment" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("moment");

/***/ }),

/***/ "moment-timezone":
/*!**********************************!*\
  !*** external "moment-timezone" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("moment-timezone");

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

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("node:fs");

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
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
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