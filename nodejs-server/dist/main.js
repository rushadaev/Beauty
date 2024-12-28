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

/***/ "./src/controllers/yclientsController.ts":
/*!***********************************************!*\
  !*** ./src/controllers/yclientsController.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getCompanies: () => (/* binding */ getCompanies),
/* harmony export */   getGoods: () => (/* binding */ getGoods)
/* harmony export */ });
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_0__);

// Function to get goods
const getGoods = async (req, res) => {
    try {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get('https://api.yclients.com/api/v1/goods/490462', {
            headers: {
                'Accept': 'application/vnd.api.v2+json',
                'Authorization': 'Bearer rpxh9hw6sjakpdsha6r3, User eb4b7a6a59b300074be260e045ade57c'
            }
        });
        res.status(200).json(response.data);
    }
    catch (error) {
        console.error('Error fetching goods:', error.message);
        res.status(500).json({ error: 'Failed to get goods' });
    }
};
// Function to get companies
const getCompanies = async (req, res) => {
    try {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get('https://api.yclients.com/api/v1/companies', {
            headers: {
                'Accept': 'application/vnd.api.v2+json',
                'Authorization': 'Bearer rpxh9hw6sjakpdsha6r3'
            }
        });
        res.status(200).json(response.data);
    }
    catch (error) {
        console.error('Error fetching companies:', error.message);
        res.status(500).json({ error: 'Failed to get companies' });
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

/***/ "./src/routes/yclientsRoutes.ts":
/*!**************************************!*\
  !*** ./src/routes/yclientsRoutes.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! express */ "express");
/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _controllers_yclientsController__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../controllers/yclientsController */ "./src/controllers/yclientsController.ts");
// routes/yclientsRoutes.ts


const router = (0,express__WEBPACK_IMPORTED_MODULE_0__.Router)();
// GET /api/yclients/goods
router.get('/goods', _controllers_yclientsController__WEBPACK_IMPORTED_MODULE_1__.getGoods);
// GET /api/yclients/companies
router.get('/companies', _controllers_yclientsController__WEBPACK_IMPORTED_MODULE_1__.getCompanies);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (router);


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
    static async exportSalaryReport() {
        try {
            const response = await axios__WEBPACK_IMPORTED_MODULE_0___default()({
                url: `${process.env.LARAVEL_API_URL}/salary/export`,
                method: 'GET',
                responseType: 'arraybuffer'
            });
            return response.data;
        }
        catch (error) {
            console.error('Error exporting salary:', error);
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
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new LaravelService());


/***/ }),

/***/ "./src/services/openaiService.ts":
/*!***************************************!*\
  !*** ./src/services/openaiService.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   openAIService: () => (/* binding */ openAIService)
/* harmony export */ });
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! openai */ "openai");
/* harmony import */ var openai__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(openai__WEBPACK_IMPORTED_MODULE_0__);

class OpenAIService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not defined');
        }
        this.openai = new (openai__WEBPACK_IMPORTED_MODULE_0___default())({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.prompt = `Войди в роль нейрокопирайтера, который прекрасно составляет описание мастеров по шугарингу. Описание мастера будет использоваться на сайте студии.
        ВАЖНО: Описание ОБЯЗАТЕЛЬНО должно быть не более 300 символов и представлять собой законченный текст.
        Найди имя мастера в тексте и используй его в описании. Если имя не найдено, используй нейтральное обращение "мастер".

Учитывай информацию из инструкции: имя мастера и наброски описания от самого мастера. Опиши личные качества мастера, укажи на профессиональные качества, упомяни отзывы клиентов или результат работы. Заверши текст позитивной рекомендацией или акцентом на желании вернуться к мастеру. Текст должен быть теплым, дружелюбным и лаконичным. Максимальное кол-во символов описания: 300. В своем ответе укажи только описание и ничего больше. Пиши без воды, в человеческом стиле. 
Данные по мастеру:
Имя: Анна 
Наброски описания от самого мастера: большой опыт работы
Примеры стиля:
'Анна умеет располагать к себе даже самого капризного клиента. Она всегда найдёт подход и интересную тему для общения. А ещё она легко и очень профессионально выполняет свою работу, что подтверждают многочисленные положительные отзывы. Вы точно захотите к ней вернуться!'
'Снежана очень быстро и легко выполняет депиляцию как женщинам, так и мужчинам. Если Вы - не любитель долгих разговоров и длительных процедур, то это , безусловно, ваш мастер! Быстро, качественно и комфортно без лишних слов.'
'Несмотря на малый опыт, Ксения уже завоевала сердца наших клиентов и заслуженно получила много положительных отзывов. Этот мастер очень внимателен к деталям. Индивидуальный подход к каждому клиенту и качественный результат для Ксении важнее всего.'
'Анастасия - очень аккуратный и внимательный мастер. Её лёгкая рука сделает услугу максимально безболезненной и быстрой. А большой багаж знаний и опыта поможет без труда подобрать домашний уходу для любого типа кожи и волос. Анастасию ценят за её профессионализм и ответственный подход к работе.'
В ответе укажи ТОЛЬКО готовое описание, уложившись в 300 символов.`;
    }
    async generateDescription(userInput) {
        var _a, _b, _c, _d;
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: this.prompt
                    },
                    {
                        role: 'user',
                        content: userInput
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
                presence_penalty: 0.3,
                frequency_penalty: 0.5
            });
            const generatedText = ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || '';
            // Проверяем длину текста
            if (generatedText.length > 300) {
                return generatedText.substring(0, 300) + '...';
            }
            return generatedText;
        }
        catch (error) {
            console.error('OpenAI API Error:', {
                error: error.message,
                userInput
            });
            if (((_d = error.response) === null || _d === void 0 ? void 0 : _d.status) === 429) {
                throw new Error('Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.');
            }
            throw new Error('Не удалось сгенерировать описание. Пожалуйста, попробуйте позже.');
        }
    }
}
const openAIService = new OpenAIService();


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

/***/ "./src/telegraf/controllers/telegramBotMasterController.ts":
/*!*****************************************************************!*\
  !*** ./src/telegraf/controllers/telegramBotMasterController.ts ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @telegraf/session/redis */ "@telegraf/session/redis");
/* harmony import */ var _telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _services_bot_master_scenes_mainScene__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../services/bot-master/scenes/mainScene */ "./src/telegraf/services/bot-master/scenes/mainScene.ts");
/* harmony import */ var _utils_cabinetGate__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/cabinetGate */ "./src/telegraf/utils/cabinetGate.ts");
/* harmony import */ var _services_bot_master_scenes_loginWizard__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../services/bot-master/scenes/loginWizard */ "./src/telegraf/services/bot-master/scenes/loginWizard.ts");
/* harmony import */ var _services_bot_master_scenes_registrationWizard__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../services/bot-master/scenes/registrationWizard */ "./src/telegraf/services/bot-master/scenes/registrationWizard.ts");
/* harmony import */ var _services_bot_master_scenes_changeDescriptionScene__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../services/bot-master/scenes/changeDescriptionScene */ "./src/telegraf/services/bot-master/scenes/changeDescriptionScene.ts");
/* harmony import */ var _services_bot_master_scenes_scheduleManagementScene__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../services/bot-master/scenes/scheduleManagementScene */ "./src/telegraf/services/bot-master/scenes/scheduleManagementScene.ts");
/* harmony import */ var _services_bot_master_scenes_changePhotoScene__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../services/bot-master/scenes/changePhotoScene */ "./src/telegraf/services/bot-master/scenes/changePhotoScene.ts");
/* harmony import */ var _services_bot_master_scenes_clientsManagementScene__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../services/bot-master/scenes/clientsManagementScene */ "./src/telegraf/services/bot-master/scenes/clientsManagementScene.ts");
/* harmony import */ var _services_bot_master_scenes_cancel_booking_scene__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../services/bot-master/scenes/cancel_booking_scene */ "./src/telegraf/services/bot-master/scenes/cancel_booking_scene.ts");
/* harmony import */ var _services_bot_master_scenes_change_phone_scene__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../services/bot-master/scenes/change_phone_scene */ "./src/telegraf/services/bot-master/scenes/change_phone_scene.ts");
/* harmony import */ var _services_bot_master_scenes_delete_service_scene__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../services/bot-master/scenes/delete_service_scene */ "./src/telegraf/services/bot-master/scenes/delete_service_scene.ts");
/* harmony import */ var _services_bot_master_scenes_add_service_scene__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../services/bot-master/scenes/add_service_scene */ "./src/telegraf/services/bot-master/scenes/add_service_scene.ts");

 // Ensure correct path

// Import mainScene from the new file





// If you have other scenes like subscriptionScene, consider importing them similarly







const botToken = process.env.TELEGRAM_BOT_TOKEN_MASTER;
const botMaster = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Telegraf(botToken);
const store = (0,_telegraf_session_redis__WEBPACK_IMPORTED_MODULE_2__.Redis)({
    url: 'redis://redis:6379/2',
});
// Initialize the stage with imported scenes
const stage = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.Stage([
    _services_bot_master_scenes_mainScene__WEBPACK_IMPORTED_MODULE_3__.mainScene,
    _services_bot_master_scenes_loginWizard__WEBPACK_IMPORTED_MODULE_5__.loginWizard,
    _services_bot_master_scenes_registrationWizard__WEBPACK_IMPORTED_MODULE_6__.registrationWizard,
    _services_bot_master_scenes_changeDescriptionScene__WEBPACK_IMPORTED_MODULE_7__.changeDescriptionScene,
    _services_bot_master_scenes_scheduleManagementScene__WEBPACK_IMPORTED_MODULE_8__.scheduleManagementScene,
    _services_bot_master_scenes_changePhotoScene__WEBPACK_IMPORTED_MODULE_9__.changePhotoScene,
    _services_bot_master_scenes_clientsManagementScene__WEBPACK_IMPORTED_MODULE_10__.clientsManagementScene,
    _services_bot_master_scenes_cancel_booking_scene__WEBPACK_IMPORTED_MODULE_11__.cancelBookingScene,
    _services_bot_master_scenes_change_phone_scene__WEBPACK_IMPORTED_MODULE_12__.changePhoneScene,
    _services_bot_master_scenes_delete_service_scene__WEBPACK_IMPORTED_MODULE_13__.deleteServiceScene,
    _services_bot_master_scenes_add_service_scene__WEBPACK_IMPORTED_MODULE_14__.addServiceScene,
]);
// Middleware to log incoming updates
botMaster.use((0,telegraf__WEBPACK_IMPORTED_MODULE_0__.session)({ store }));
botMaster.use(stage.middleware());
botMaster.use(async (ctx, next) => {
    _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_1__["default"].info('Received update', { update: ctx.update });
    await next();
});
// Handle /start command
botMaster.start(async (ctx) => {
    // Очищаем сессию при старте
    if (ctx.session) {
        ctx.session = {}; // Сбрасываем сессию
    }
    const startPayload = ctx.payload;
    if (startPayload && startPayload === 'registration') {
        // Если есть payload registration, идем сразу на регистрацию
        await ctx.scene.enter('registration_wizard');
        return;
    }
    // В остальных случаях всегда идем на login_wizard
    await ctx.scene.enter('login_wizard');
});
// Handle 'mainmenu' action
botMaster.action('mainmenu', async (ctx) => {
    var _a, _b;
    // Проверяем авторизацию
    if (!((_b = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.token)) {
        // Если нет токена - отправляем на логин
        await ctx.scene.enter('login_wizard');
        return;
    }
    // Если есть токен - показываем главное меню
    await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_4__.cabinetGate)(ctx, 'main');
    await ctx.answerCbQuery('🏦Главная');
});
// Handle /ping command
botMaster.command('ping', (ctx) => {
    ctx.reply('pong!');
});
botMaster.on('callback_query', async (ctx) => {
    await ctx.answerCbQuery('👌');
});
// Export the bot instance
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (botMaster);


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
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👥 Управление персоналом', 'staff'),
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
adminMainScene.action('staff', async (ctx) => {
    await ctx.answerCbQuery('👥 Управление персоналом...');
    await ctx.scene.enter('staff');
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
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📄 Проверить документы', `check_docs_${applicationId}`)],
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
// Обработчик кнопки экспорта
salaryScene.action('export_salary', async (ctx) => {
    try {
        await ctx.answerCbQuery('Генерируем отчет...');
        // Получаем файл через сервис
        const excelBuffer = await _services_laravelService__WEBPACK_IMPORTED_MODULE_3__["default"].exportSalaryReport();
        // Создаем временный файл
        const tempDir = path__WEBPACK_IMPORTED_MODULE_2___default().join(__dirname, '../../../temp');
        if (!fs__WEBPACK_IMPORTED_MODULE_1___default().existsSync(tempDir)) {
            fs__WEBPACK_IMPORTED_MODULE_1___default().mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path__WEBPACK_IMPORTED_MODULE_2___default().join(tempDir, `salary_${Date.now()}.xlsx`);
        fs__WEBPACK_IMPORTED_MODULE_1___default().writeFileSync(tempFilePath, excelBuffer);
        // Отправляем файл
        await ctx.replyWithDocument({
            source: tempFilePath,
            filename: `salary_report.xlsx`
        });
        // Удаляем временный файл
        fs__WEBPACK_IMPORTED_MODULE_1___default().unlinkSync(tempFilePath);
    }
    catch (error) {
        console.error('Error exporting salary:', error);
        await ctx.reply('Произошла ошибка при формировании отчета. Попробуйте позже.');
    }
});
salaryScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('admin_main');
});
// Входная точка сцены
salaryScene.enter(async (ctx) => {
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📥 Скачать отчет по зарплате', 'export_salary')],
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

/***/ "./src/telegraf/services/bot-master/scenes/add_service_scene.ts":
/*!**********************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/add_service_scene.ts ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addServiceScene: () => (/* binding */ addServiceScene),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


const addServiceScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('add_service_scene');
// Вход в сцену
addServiceScene.enter(async (ctx) => {
    var _a;
    const state = ctx.scene.state;
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId)) {
            return ctx.reply('❌ Ошибка: не выбрана запись', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
                ]]));
        }
        // Сохраняем состояние
        ctx.session.addServiceState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };
        // Получаем список доступных услуг
        const services = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterServices({
            phone: ctx.session.addServiceState.phone,
            password: ctx.session.addServiceState.password
        });
        if (!(services === null || services === void 0 ? void 0 : services.success) || !((_a = services.data) === null || _a === void 0 ? void 0 : _a.length)) {
            return ctx.reply('❌ Нет доступных услуг для добавления', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записи', 'back_to_record')
                ]]));
        }
        // Создаем кнопки только с названиями услуг
        const buttons = services.data.map(service => ([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(service.title, `add_service_${service.id}`)
        ]));
        // Добавляем кнопку отмены
        buttons.push([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Отмена', 'cancel_service_add')
        ]);
        await ctx.reply('Выберите услугу для добавления:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
    }
    catch (error) {
        console.error('Error in addServiceScene enter:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записи', 'back_to_record')
            ]]));
    }
});
// Обработка выбора услуги
addServiceScene.action(/^add_service_(\d+)$/, async (ctx) => {
    const state = ctx.session.addServiceState;
    const serviceId = parseInt(ctx.match[1]);
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId) || !state.phone || !state.password) {
            throw new Error('Отсутствуют необходимые данные');
        }
        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply('🔄 Добавляем услугу...');
        try {
            // Получаем информацию об услуге
            const services = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterServices({
                phone: state.phone,
                password: state.password
            });
            const selectedService = services.data.find(s => s.id === serviceId);
            if (!selectedService) {
                throw new Error('Услуга не найдена');
            }
            const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId,
                updateData: {
                    services: {
                        add: [{
                                id: selectedService.id,
                                cost: parseFloat(selectedService.price_min), // Добавляем цену
                                first_cost: parseFloat(selectedService.price_min), // Добавляем начальную цену
                                discount: 0
                            }]
                    }
                }
            });
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('✅ Услуга успешно добавлена', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« К записи', 'back_to_record')
                ]]));
        }
        catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('❌ ' + (error.message || 'Не удалось добавить услугу'), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'cancel_service_add')
                ]]));
        }
    }
    catch (error) {
        console.error('Error in service addition:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
// Обработка отмены
addServiceScene.action('cancel_service_add', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const recordId = (_a = ctx.session.addServiceState) === null || _a === void 0 ? void 0 : _a.recordId;
        delete ctx.session.addServiceState;
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    }
    catch (error) {
        console.error('Error in cancel_service_add:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
// Возврат к записи
addServiceScene.action('back_to_record', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const recordId = (_a = ctx.session.addServiceState) === null || _a === void 0 ? void 0 : _a.recordId;
        delete ctx.session.addServiceState;
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    }
    catch (error) {
        console.error('Error in back_to_record:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (addServiceScene);


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/cancel_booking_scene.ts":
/*!*************************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/cancel_booking_scene.ts ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cancelBookingScene: () => (/* binding */ cancelBookingScene),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


const cancelBookingScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('cancel_booking_scene');
cancelBookingScene.enter(async (ctx) => {
    const state = ctx.scene.state;
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId)) {
            return ctx.reply('❌ Ошибка: не выбрана запись для отмены', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
                ]]));
        }
        // Сохраняем состояние в сессии для использования в других обработчиках
        ctx.session.cancelBookingState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };
        await ctx.reply('Вы уверены, что хотите отменить эту запись?\n\n' +
            '⚠️ Это действие нельзя отменить!', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да, отменить', 'confirm_cancel'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет, вернуться', 'back_to_record')
            ]
        ]));
    }
    catch (error) {
        console.error('Error in cancelBookingScene enter:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back_to_records')
            ]]));
    }
});
// Обработка подтверждения отмены
cancelBookingScene.action('confirm_cancel', async (ctx) => {
    const state = ctx.session.cancelBookingState;
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId) || !state.phone || !state.password) {
            throw new Error('Отсутствуют необходимые данные для отмены записи');
        }
        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply('🔄 Отменяем запись...');
        try {
            const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].cancelMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId
            });
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('✅ Запись успешно отменена', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« К списку записей', 'back_to_records')
                ]]));
        }
        catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('❌ ' + (error.message || 'Не удалось отменить запись'), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back_to_record')
                ]]));
        }
    }
    catch (error) {
        console.error('Error in confirm_cancel handler:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
// Возврат к деталям записи
cancelBookingScene.action('back_to_record', async (ctx) => {
    var _a;
    await ctx.answerCbQuery();
    return ctx.scene.enter('clients_management_scene', {
        action: 'show_record',
        recordId: (_a = ctx.session.cancelBookingState) === null || _a === void 0 ? void 0 : _a.recordId
    });
});
// Возврат к списку записей
cancelBookingScene.action('back_to_records', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем состояние
    delete ctx.session.cancelBookingState;
    return ctx.scene.enter('clients_management_scene');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (cancelBookingScene);


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/changeDescriptionScene.ts":
/*!***************************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/changeDescriptionScene.ts ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   changeDescriptionScene: () => (/* binding */ changeDescriptionScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var _services_openaiService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../services/openaiService */ "./src/services/openaiService.ts");



const changeDescriptionScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('change_description_scene', 
// Шаг 1: Запрос описания
async (ctx) => {
    var _a, _b, _c;
    ctx.session.descriptionForm = {};
    ctx.session.isEditing = false;
    console.log('Session state at description start:', {
        sessionPhone: (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone,
        sessionPassword: ((_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password) ? '[PRESENT]' : '[MISSING]',
        sessionUser: ((_c = ctx.session) === null || _c === void 0 ? void 0 : _c.user) ? '[PRESENT]' : '[MISSING]'
    });
    await ctx.reply('Давайте подготовим ваше описание! Напишите пожалуйста своё имя и пару слов про себя, а искусственный интеллект сделает магию!', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel')]]));
    return ctx.wizard.next();
}, 
// Шаг 2: Генерация и предварительный просмотр
async (ctx) => {
    var _a, _b;
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Пожалуйста, отправьте текстовое сообщение.');
        return;
    }
    try {
        const userInput = ctx.message.text;
        const processingMessage = await ctx.reply('⏳ Генерируем описание...');
        if (!ctx.session.descriptionForm) {
            ctx.session.descriptionForm = {};
        }
        ctx.session.descriptionForm.tempDescription = userInput;
        const newDescription = await _services_openaiService__WEBPACK_IMPORTED_MODULE_2__.openAIService.generateDescription(userInput);
        ctx.session.descriptionForm.generatedDescription = newDescription;
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => { });
        await ctx.reply('✨ Вот ваше новое описание:\n\n' +
            newDescription + '\n\n' +
            'Что бы вы хотели сделать с этим описанием?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Подтвердить и опубликовать', 'confirm_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Отредактировать', 'edit_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Сгенерировать заново', 'regenerate')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel')]
        ]));
        return ctx.wizard.next();
    }
    catch (error) {
        console.error('Error in description generation:', {
            error: error.message,
            sessionState: {
                phone: (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone,
                hasPassword: !!((_b = ctx.session) === null || _b === void 0 ? void 0 : _b.password)
            }
        });
        await ctx.reply('Произошла ошибка при генерации описания. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]));
    }
}, 
// Шаг 3: Обработка редактирования
async (ctx) => {
    console.log('Step 3: Processing message, isEditing:', ctx.session.isEditing);
    // Если это не режим редактирования, игнорируем сообщение
    if (!ctx.session.isEditing) {
        console.log('Step 3: Not in editing mode, skipping');
        return;
    }
    if (!ctx.message || !('text' in ctx.message)) {
        console.log('Step 3: No text in message');
        await ctx.reply('Пожалуйста, отправьте текстовое сообщение.');
        return;
    }
    try {
        console.log('Step 3: Processing edited description');
        const editedDescription = ctx.message.text;
        if (editedDescription.length > 300) {
            console.log('Step 3: Description too long');
            await ctx.reply('❌ Описание не должно превышать 300 символов. Сейчас длина: ' + editedDescription.length + ' символов.\n' +
                'Пожалуйста, сократите текст и отправьте снова.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel')]]));
            return;
        }
        if (!ctx.session.descriptionForm) {
            ctx.session.descriptionForm = {};
        }
        ctx.session.descriptionForm.generatedDescription = editedDescription;
        ctx.session.isEditing = false;
        await ctx.reply('📝 Проверьте отредактированное описание:\n\n' +
            editedDescription + '\n\n' +
            'Что бы вы хотели сделать с этим описанием?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Подтвердить и опубликовать', 'confirm_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Отредактировать ещё раз', 'edit_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Сгенерировать заново', 'regenerate')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel')]
        ]));
        console.log('Step 3: Description updated successfully');
    }
    catch (error) {
        console.error('Step 3: Error processing description:', error);
        await ctx.reply('❌ Произошла ошибка при обработке описания.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'edit_description')
            ]]));
    }
});
// Обработчики действий
changeDescriptionScene.action('confirm_description', async (ctx) => {
    var _a;
    await ctx.answerCbQuery();
    const description = (_a = ctx.session.descriptionForm) === null || _a === void 0 ? void 0 : _a.generatedDescription;
    if (!description) {
        await ctx.reply('Ошибка: описание не найдено. Попробуйте начать заново.');
        return ctx.scene.reenter();
    }
    const processingMessage = await ctx.reply('⏳ Обновляем ваш профиль...');
    try {
        const updated = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateMasterDescription(ctx.session.phone, ctx.session.password, description);
        if (!updated) {
            throw new Error('Не удалось обновить описание');
        }
        try {
            const masterInfo = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterByPhone(ctx.session.phone);
            await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].createTaskForMaster({
                type: 'description_update',
                masterPhone: ctx.session.phone,
                masterName: (masterInfo === null || masterInfo === void 0 ? void 0 : masterInfo.name) || ctx.session.phone,
                description: `Обновить описание мастера на сайте\n\nНовое описание:\n\n${description}`
            });
        }
        catch (error) {
            console.error('Error creating task:', error);
        }
        await ctx.reply('✅ Описание успешно обновлено!\n\n' +
            '💫 Новое описание уже доступно в вашем профиле.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 В главное меню', 'back_to_menu')]]));
    }
    catch (error) {
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => { });
        await ctx.reply('❌ Произошла ошибка при обновлении профиля.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 В меню', 'back_to_menu')]
        ]));
    }
});
changeDescriptionScene.action('edit_description', async (ctx) => {
    var _a;
    console.log('Edit action triggered');
    await ctx.answerCbQuery();
    // Устанавливаем флаг редактирования
    ctx.session.isEditing = true;
    console.log('Set editing mode, isEditing:', ctx.session.isEditing);
    await ctx.reply('✏️ Отправьте отредактированный вариант описания:\n\n' +
        ((_a = ctx.session.descriptionForm) === null || _a === void 0 ? void 0 : _a.generatedDescription), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel')]]));
});
// Обработчик для "Сгенерировать заново"
changeDescriptionScene.action('regenerate', async (ctx) => {
    var _a;
    await ctx.answerCbQuery();
    if (!((_a = ctx.session.descriptionForm) === null || _a === void 0 ? void 0 : _a.tempDescription)) {
        await ctx.reply('❌ Не удалось найти исходный текст. Начнем заново.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Начать заново', 'retry_description')
            ]]));
        return;
    }
    try {
        const processingMessage = await ctx.reply('🤖 Генерируем новое описание...');
        const newDescription = await _services_openaiService__WEBPACK_IMPORTED_MODULE_2__.openAIService.generateDescription(ctx.session.descriptionForm.tempDescription);
        ctx.session.descriptionForm.generatedDescription = newDescription;
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => { });
        await ctx.reply('✨ Вот новый вариант описания:\n\n' +
            newDescription + '\n\n' +
            'Что бы вы хотели сделать с этим описанием?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Подтвердить и опубликовать', 'confirm_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✏️ Отредактировать', 'edit_description')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Сгенерировать заново', 'regenerate')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить', 'cancel')]
        ]));
    }
    catch (error) {
        console.error('Error regenerating description:', error);
        await ctx.reply('❌ Произошла ошибка при генерации нового описания.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'regenerate')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]));
    }
});
changeDescriptionScene.action('retry_description', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
changeDescriptionScene.action('cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Операция отменена');
    return ctx.scene.enter('main');
});
changeDescriptionScene.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('main');
});


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/changePhotoScene.ts":
/*!*********************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/changePhotoScene.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   changePhotoScene: () => (/* binding */ changePhotoScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! node:fs */ "node:fs");
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! axios */ "axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../../utils/logger/loggerTelegram */ "./src/utils/logger/loggerTelegram.ts");






const changePhotoScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('change_photo_scene');
const MIN_SIZE = 800; // Минимальный размер для ширины и высоты
const MAX_SIZE = 2000; // Максимальный размер для ширины и высоты
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ в байтах
// Вход в сцену
changePhotoScene.enter(async (ctx) => {
    const message = `
📸 *Загрузка новой фотографии профиля*

⚠️ *Требования к фото:*
• Квадратный формат (1:1)
• Размер от ${MIN_SIZE}x${MIN_SIZE} до ${MAX_SIZE}x${MAX_SIZE} пикселей
• Формат JPG/JPEG
• Размер файла до 5 МБ
• Чёткое изображение на светлом фоне
• Без посторонних предметов и людей
• В деловом стиле

✨ *Рекомендации:*
• Хорошее освещение
• Нейтральное выражение лица
• Профессиональный внешний вид
• Четкий фокус на лице

🔄 Отправьте фото прямо сейчас или выберите действие:`;
    await ctx.replyWithMarkdown(message, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📱 Посмотреть пример фото', 'show_photo_example')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отменить изменение фото', 'cancel_photo')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('ℹ️ Помощь по загрузке', 'photo_help')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]));
});
// Обработка полученных фотографий
changePhotoScene.on('photo', async (ctx) => {
    var _a, _b, _c;
    try {
        if (!((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone)) {
            throw new Error('Не найден номер телефона в сессии');
        }
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        if (!file.file_path) {
            throw new Error('Не удалось получить файл фотографии');
        }
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__["default"].info('Processing photo:', {
            width: photo.width,
            height: photo.height,
            file_id: photo.file_id
        });
        // Проверка размеров фото
        if (photo.width < MIN_SIZE || photo.height < MIN_SIZE) {
            await ctx.reply(`⚠️ Фото слишком маленькое. Минимальный размер ${MIN_SIZE}x${MIN_SIZE} пикселей.`, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить другое фото', 'retry_photo')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❓ Помощь с размером', 'size_help')]
            ]));
            return;
        }
        // Проверка квадратного формата
        if (Math.abs(photo.width - photo.height) > 10) {
            await ctx.reply('⚠️ Фото должно быть квадратным (соотношение сторон 1:1).', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить другое фото', 'retry_photo')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✂️ Как обрезать фото?', 'crop_help')]
            ]));
            return;
        }
        const processingMessage = await ctx.reply('⌛ Обрабатываем фотографию...');
        // Получаем файл
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN_MASTER}/${file.file_path}`;
        const response = await axios__WEBPACK_IMPORTED_MODULE_4___default()({
            url: fileUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        // Проверка размера файла
        if (response.data.length > MAX_FILE_SIZE) {
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => { });
            await ctx.reply('⚠️ Размер файла превышает 5 МБ. Пожалуйста, сожмите фото и попробуйте снова.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить другое фото', 'retry_photo')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📝 Как уменьшить размер?', 'size_reduce_help')]
            ]));
            return;
        }
        // Создаем временную директорию
        const tempDir = path__WEBPACK_IMPORTED_MODULE_3__.join(__dirname, '../../../../../temp');
        if (!node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync(tempDir)) {
            node_fs__WEBPACK_IMPORTED_MODULE_2__.mkdirSync(tempDir, { recursive: true });
        }
        // Сохраняем файл временно
        const tempFilePath = path__WEBPACK_IMPORTED_MODULE_3__.join(tempDir, `${ctx.from.id}_${Date.now()}.jpg`);
        node_fs__WEBPACK_IMPORTED_MODULE_2__.writeFileSync(tempFilePath, response.data);
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__["default"].info('Temporary file saved:', { path: tempFilePath });
        try {
            const updateResult = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateMasterPhoto(ctx.session.phone, tempFilePath);
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => { });
            // Проверяем именно поле success в ответе
            if (updateResult && updateResult.success === true) {
                try {
                    const masterInfo = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterByPhone(ctx.session.phone);
                    await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].createTaskForMaster({
                        type: 'photo_update',
                        masterPhone: ctx.session.phone,
                        masterName: (masterInfo === null || masterInfo === void 0 ? void 0 : masterInfo.name) || ctx.session.phone,
                        description: 'Обновить фото мастера на сайте - запросите у мастера новую фотографию, которую он поставил себе в профиль Yclients'
                    });
                }
                catch (error) {
                    console.error('Error creating task:', error);
                }
                await ctx.reply('✅ Фотография успешно обновлена!\n\nВаш профиль теперь выглядит более профессионально.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                    [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
                ]));
            }
            else {
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__["default"].error('Update result unsuccessful:', updateResult);
                throw new Error((updateResult === null || updateResult === void 0 ? void 0 : updateResult.message) || 'Не удалось обновить фотографию');
            }
        }
        catch (error) {
            _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__["default"].error('Error in photo update:', {
                error: error.message,
                phone: ctx.session.phone,
                response: (_b = error.response) === null || _b === void 0 ? void 0 : _b.data,
                updateResult: error.updateResult // добавляем для отладки
            });
            await ctx.reply('❌ Произошла ошибка при обновлении фотографии.\n\nПожалуйста, попробуйте позже или обратитесь в поддержку.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_photo')],
                [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
            ]));
        }
        finally {
            // Удаляем временный файл
            if (node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync(tempFilePath)) {
                node_fs__WEBPACK_IMPORTED_MODULE_2__.unlinkSync(tempFilePath);
                _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__["default"].info('Temporary file deleted:', { path: tempFilePath });
            }
        }
    }
    catch (error) {
        _utils_logger_loggerTelegram__WEBPACK_IMPORTED_MODULE_5__["default"].error('Error processing photo:', {
            error: error.message,
            telegramId: (_c = ctx.from) === null || _c === void 0 ? void 0 : _c.id,
            sessionData: ctx.session
        });
        await ctx.reply('❌ Произошла ошибка при обработке фотографии.\n\nПожалуйста, убедитесь, что фото соответствует требованиям и попробуйте снова.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_photo')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
        ]));
    }
});
// Обработчики действий
changePhotoScene.action('retry_photo', async (ctx) => {
    await ctx.answerCbQuery('🔄 Загрузите новое фото');
    return ctx.scene.reenter();
});
changePhotoScene.action('cancel_photo', async (ctx) => {
    await ctx.answerCbQuery('❌ Изменение фото отменено');
    return ctx.scene.enter('main');
});
changePhotoScene.action('photo_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`📸 *Как сделать хорошее фото для профиля:*

1. Используйте нейтральный светлый фон
2. Обеспечьте хорошее освещение (желательно естественное)
3. Расположитесь на расстоянии 1-1.5 метра от камеры
4. Держите камеру на уровне глаз
5. Используйте таймер для стабильного снимка
6. Убедитесь, что фото четкое и не размытое
7. Проверьте, что лицо занимает около 60% кадра

*Как обрезать фото:*
• На iPhone: используйте встроенный редактор
• На Android: используйте Google Фото
• Онлайн: squoosh.app или photopea.com`, Object.assign({ parse_mode: 'Markdown' }, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_main')]
    ])));
});
changePhotoScene.action('size_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`📏 *Как проверить размер фото:*

1. На телефоне:
• Откройте фото
• В свойствах или информации найдите размеры
• Убедитесь, что размер не менее ${MIN_SIZE}x${MIN_SIZE}

2. Как увеличить размер:
• Сделайте новое фото в высоком качестве
• Используйте основную камеру, не фронтальную
• Отключите компрессию в настройках камеры`, Object.assign({ parse_mode: 'Markdown' }, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_main')]
    ])));
});
// Добавляем обработчик для кнопки примера
changePhotoScene.action('show_photo_example', async (ctx) => {
    await ctx.answerCbQuery();
    // Сначала отправляем фото
    // Используем абсолютный путь
    const photoPath = '/usr/src/app/dist/telegraf/services/bot-master/scenes/photoexample.jpg';
    console.log('Current __dirname:', __dirname);
    console.log('Trying to access photo at:', photoPath);
    console.log('File exists:', (__webpack_require__(/*! fs */ "fs").existsSync)(photoPath));
    // Проверим содержимое директории
    const dir = '/usr/src/app/dist/telegraf/services/bot-master/scenes/';
    console.log('Directory contents:', (__webpack_require__(/*! fs */ "fs").readdirSync)(dir));
    await ctx.replyWithPhoto({ source: photoPath }, {
        caption: `📸 *Пример правильного фото для профиля*

✅ *Что сделано верно:*
- Квадратный формат
- Четкое изображение лица
- Нейтральный светлый фон
- Профессиональное освещение
- Деловой внешний вид
- Легкая улыбка
- Прямой взгляд в камеру

Ваше фото должно быть похожим по формату и стилю.`,
        parse_mode: 'Markdown'
    });
    // Затем отправляем кнопку для возврата
    await ctx.reply('Отправьте ваше фото или выберите действие:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❓ Помощь по загрузке', 'photo_help')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]));
});
changePhotoScene.action('crop_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`✂️ *Как сделать фото квадратным:*

1. На iPhone:
• Откройте фото в приложении Фото
• Нажмите Изменить
• Выберите инструмент обрезки
• Выберите квадратный формат

2. На Android:
• Откройте фото в Google Фото
• Нажмите кнопку изменения
• Выберите Обрезать
• Выберите формат 1:1

3. Онлайн-сервисы:
• squoosh.app
• photopea.com
• canva.com`, Object.assign({ parse_mode: 'Markdown' }, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_main')]
    ])));
});
changePhotoScene.action('size_reduce_help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`📉 *Как уменьшить размер фото:*

1. На телефоне:
• Используйте встроенный редактор
• Выберите опцию "Изменить размер" или "Сжать"
• Сохраните в среднем качестве

2. Онлайн-сервисы:
• squoosh.app (рекомендуется)
• tinypng.com
• compressjpeg.com

3. Советы:
• Уменьшите разрешение до 1500x1500
• Используйте JPEG формат
• Выберите качество 80-90%`, Object.assign({ parse_mode: 'Markdown' }, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Загрузить фото', 'retry_photo')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_main')]
    ])));
});
changePhotoScene.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
changePhotoScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery('👈 Возвращаемся в главное меню');
    return ctx.scene.enter('main');
});
// Обработка всех остальных типов сообщений
changePhotoScene.on('message', async (ctx) => {
    await ctx.reply('⚠️ Пожалуйста, отправьте фотографию или выберите действие из меню ниже:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❓ Помощь по загрузке', 'photo_help')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
    ]));
});


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/change_phone_scene.ts":
/*!***********************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/change_phone_scene.ts ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   changePhoneScene: () => (/* binding */ changePhoneScene),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


const changePhoneScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('change_phone_scene');
// Вход в сцену
changePhoneScene.enter(async (ctx) => {
    const state = ctx.scene.state;
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId)) {
            return ctx.reply('❌ Ошибка: не выбрана запись', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
                ]]));
        }
        // Сохраняем состояние до удаления ctx.scene.state
        const recordId = state.recordId;
        // Сохраняем состояние в сессии
        ctx.session.changePhoneState = {
            recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };
        await ctx.reply('Введите новый номер телефона клиента в формате 79XXXXXXXXX:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Отмена', 'cancel_phone_change')
            ]]));
    }
    catch (error) {
        console.error('Error in changePhoneScene enter:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
            ]]));
    }
});
// Обработка введенного телефона
changePhoneScene.on('text', async (ctx) => {
    const state = ctx.session.changePhoneState;
    try {
        if (!state || !state.recordId || !state.phone || !state.password) {
            return ctx.reply('❌ Ошибка: недостаточно данных. Попробуйте заново.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
                ]]));
        }
        const newPhone = ctx.message.text.trim();
        // Проверяем формат телефона
        if (!/^7\d{10}$/.test(newPhone)) {
            return ctx.reply('❌ Неверный формат номера телефона. Введите номер в формате 79XXXXXXXXX:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Отмена', 'cancel_phone_change')
                ]]));
        }
        const loadingMsg = await ctx.reply('🔄 Обновляем номер телефона...');
        try {
            // Сохраняем recordId перед обновлением
            const recordId = state.recordId;
            const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId,
                updateData: {
                    client: {
                        phone: newPhone
                    }
                }
            });
            // Удаляем сообщение о загрузке
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('✅ Номер телефона успешно обновлен', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« К записи', 'back_to_record')
                ]]));
            // Сохраняем обновленное состояние
            ctx.session.changePhoneState = Object.assign(Object.assign({}, state), { newPhone });
        }
        catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('❌ ' + (error.message || 'Не удалось обновить номер телефона'), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'cancel_phone_change')
                ]]));
        }
    }
    catch (error) {
        console.error('Error handling phone number:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
            ]]));
    }
});
// Отмена изменения телефона
changePhoneScene.action('cancel_phone_change', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const recordId = (_a = ctx.session.changePhoneState) === null || _a === void 0 ? void 0 : _a.recordId;
        // Очищаем состояние до перехода на другую сцену
        delete ctx.session.changePhoneState;
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    }
    catch (error) {
        console.error('Error in cancel_phone_change:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
// Возврат к записи
changePhoneScene.action('back_to_record', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const recordId = (_a = ctx.session.changePhoneState) === null || _a === void 0 ? void 0 : _a.recordId;
        // Очищаем состояние до перехода на другую сцену
        delete ctx.session.changePhoneState;
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    }
    catch (error) {
        console.error('Error in back_to_record:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (changePhoneScene);


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/clientsManagementScene.ts":
/*!***************************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/clientsManagementScene.ts ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clientsManagementScene: () => (/* binding */ clientsManagementScene),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


const clientsManagementScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('clients_management_scene');
// Вспомогательные функции для работы с датами
const formatDate = (date, format = 'YYYY-MM-DD') => {
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day);
};
const formatTime = (date) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
// Вход в сцену
clientsManagementScene.enter(async (ctx) => {
    var _a, _b;
    try {
        // Проверяем авторизацию
        if (!ctx.session.phone || !ctx.session.password) {
            await ctx.reply('⚠️ Необходимо авторизоваться для просмотра записей.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Войти в аккаунт', 'start_login')
                ]]));
            return;
        }
        const loadingMessage = await ctx.reply('🔄 Загружаем ваши записи...');
        try {
            // Получаем записи через Laravel Service
            const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterRecords({
                phone: ctx.session.phone,
                password: ctx.session.password,
                params: {
                    start_date: formatDate(new Date()),
                    end_date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                }
            });
            // Удаляем сообщение о загрузке
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id).catch(() => { });
            if (!(response === null || response === void 0 ? void 0 : response.success) || !((_a = response.data) === null || _a === void 0 ? void 0 : _a.length)) {
                return await ctx.reply('📅 У вас нет предстоящих записей на ближайший месяц.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Вернуться в меню', 'mainmenu')
                    ]]));
            }
            // Группируем записи по дням
            const recordsByDate = response.data.reduce((acc, record) => {
                const date = new Date(record.date);
                const dateKey = formatDate(date, 'DD.MM.YYYY');
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(record);
                return acc;
            }, {});
            // Создаем структурированные кнопки
            const buttons = [];
            Object.entries(recordsByDate).forEach(([date, records]) => {
                // Добавляем заголовок даты
                buttons.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`📅 ${date}`, 'noop')]);
                // Добавляем записи за этот день
                records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .forEach(record => {
                    var _a, _b;
                    const time = formatTime(record.date);
                    const clientName = ((_a = record.client) === null || _a === void 0 ? void 0 : _a.name) || 'Клиент';
                    const services = (_b = record.services) === null || _b === void 0 ? void 0 : _b.map(s => s.title).slice(0, 2).join(', ');
                    const buttonText = `${time} | ${clientName}${services ? ` - ${services}` : ''}`;
                    buttons.push([
                        telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(buttonText.length > 60 ? buttonText.slice(0, 57) + '...' : buttonText, `record_${record.id}`)
                    ]);
                });
            });
            // Добавляем кнопку возврата в меню
            buttons.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Вернуться в меню', 'mainmenu')]);
            await ctx.reply('Выберите запись для управления:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
        }
        catch (error) {
            // Удаляем сообщение о загрузке
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id).catch(() => { });
            console.error('Error loading records:', error);
            let errorMessage = '❌ Произошла ошибка при загрузке записей.';
            if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                errorMessage = '🔒 Ошибка авторизации. Пожалуйста, войдите в систему заново.';
                return ctx.scene.enter('login_wizard');
            }
            await ctx.reply(errorMessage, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Вернуться в меню', 'mainmenu')
                ]]));
        }
    }
    catch (error) {
        console.error('Error in clientsManagementScene:', error);
        await ctx.reply('❌ Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Вернуться в меню', 'mainmenu')
            ]]));
    }
});
// Заглушка для кнопок-заголовков дат
clientsManagementScene.action('noop', async (ctx) => {
    await ctx.answerCbQuery('Это заголовок даты').catch(() => { });
});
// Обработка выбора конкретной записи
clientsManagementScene.action(/^record_(\d+)$/, async (ctx) => {
    var _a, _b, _c;
    try {
        const recordId = ctx.match[1];
        // Сохраняем ID записи в сессии
        ctx.scene.session.selectedRecordId = recordId;
        // Получаем детали записи
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterRecordDetails({
            phone: ctx.session.phone,
            password: ctx.session.password,
            recordId: recordId
        });
        if (!(response === null || response === void 0 ? void 0 : response.success)) {
            throw new Error('Не удалось получить информацию о записи');
        }
        const record = response.data;
        const date = new Date(record.date);
        // Формируем детальную информацию о записи
        const recordInfo = [
            `📅 Дата: ${formatDate(date, 'DD.MM.YYYY')}`,
            `🕒 Время: ${formatTime(record.date)}`,
            `👤 Клиент: ${((_a = record.client) === null || _a === void 0 ? void 0 : _a.name) || 'Не указан'}`,
            `📱 Телефон: ${((_b = record.client) === null || _b === void 0 ? void 0 : _b.phone) || 'Не указан'}`,
            `💅 Услуги:\n${((_c = record.services) === null || _c === void 0 ? void 0 : _c.map(s => `• ${s.title}`).join('\n')) || 'Нет услуг'}`
        ].join('\n');
        const managementKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('⏱ Изменить время', 'change_service_time'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Удалить услугу', 'delete_service_from_order'),
            ],
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('➕ Добавить услугу', 'add_service_to_order'),
            ],
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📞 Изменить телефон', 'change_phone_number'),
            ],
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚫 Отменить запись', 'cancel_client_booking'),
            ],
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« К списку записей', 'back_to_records'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« В меню', 'mainmenu'),
            ]
        ]);
        await ctx.editMessageText(recordInfo, managementKeyboard);
    }
    catch (error) {
        console.error('Error in record selection:', error);
        await ctx.answerCbQuery('❌ Ошибка при загрузке информации о записи').catch(() => { });
        await ctx.reply('Не удалось загрузить информацию о записи. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
            ]]));
    }
});
// Возврат к списку записей
clientsManagementScene.action('back_to_records', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем выбранную запись
    delete ctx.scene.session.selectedRecordId;
    return ctx.scene.reenter();
});
// Обработчики действий с записью
clientsManagementScene.action('change_service_time', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }
    await ctx.answerCbQuery();
    return ctx.scene.enter('change_service_time_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});
clientsManagementScene.action('delete_service_from_order', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }
    await ctx.answerCbQuery();
    return ctx.scene.enter('delete_service_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});
clientsManagementScene.action('add_service_to_order', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }
    await ctx.answerCbQuery();
    return ctx.scene.enter('add_service_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});
clientsManagementScene.action('change_phone_number', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }
    await ctx.answerCbQuery();
    return ctx.scene.enter('change_phone_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});
clientsManagementScene.action('cancel_client_booking', async (ctx) => {
    if (!ctx.scene.session.selectedRecordId) {
        await ctx.answerCbQuery('❌ Ошибка: запись не выбрана');
        return ctx.scene.reenter();
    }
    await ctx.answerCbQuery();
    return ctx.scene.enter('cancel_booking_scene', {
        recordId: ctx.scene.session.selectedRecordId,
        phone: ctx.session.phone,
        password: ctx.session.password
    });
});
// Возврат в главное меню
clientsManagementScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем данные сцены
    delete ctx.scene.session.selectedRecordId;
    return ctx.scene.enter('main');
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (clientsManagementScene);


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/delete_service_scene.ts":
/*!*************************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/delete_service_scene.ts ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   deleteServiceScene: () => (/* binding */ deleteServiceScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


const deleteServiceScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('delete_service_scene');
// Вход в сцену
deleteServiceScene.enter(async (ctx) => {
    var _a, _b;
    const state = ctx.scene.state;
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId)) {
            return ctx.reply('❌ Ошибка: не выбрана запись', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записям', 'back_to_records')
                ]]));
        }
        // Сохраняем состояние
        ctx.session.deleteServiceState = {
            recordId: state.recordId,
            phone: state.phone || ctx.session.phone,
            password: state.password || ctx.session.password
        };
        // Получаем детали записи для отображения списка услуг
        const record = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterRecordDetails({
            phone: ctx.session.deleteServiceState.phone,
            password: ctx.session.deleteServiceState.password,
            recordId: state.recordId
        });
        if (!(record === null || record === void 0 ? void 0 : record.success) || !((_b = (_a = record.data) === null || _a === void 0 ? void 0 : _a.services) === null || _b === void 0 ? void 0 : _b.length)) {
            return ctx.reply('❌ В записи нет услуг для удаления', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записи', 'back_to_record')
                ]]));
        }
        // Создаем кнопки с услугами
        const buttons = record.data.services.map(service => ([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(`${service.title} (${service.cost}₽)`, `delete_service_${service.id}`)
        ]));
        // Добавляем кнопку отмены
        buttons.push([
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Отмена', 'cancel_service_delete')
        ]);
        await ctx.reply('Выберите услугу для удаления:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
    }
    catch (error) {
        console.error('Error in deleteServiceScene enter:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад к записи', 'back_to_record')
            ]]));
    }
});
// Обработка выбора услуги
deleteServiceScene.action(/^delete_service_(\d+)$/, async (ctx) => {
    const state = ctx.session.deleteServiceState;
    const serviceId = ctx.match[1];
    try {
        if (!(state === null || state === void 0 ? void 0 : state.recordId) || !state.phone || !state.password) {
            throw new Error('Отсутствуют необходимые данные');
        }
        await ctx.answerCbQuery();
        const loadingMsg = await ctx.reply('🔄 Удаляем услугу...');
        try {
            const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateMasterRecord({
                phone: state.phone,
                password: state.password,
                recordId: state.recordId,
                updateData: {
                    services: {
                        remove: [parseInt(serviceId)]
                    }
                }
            });
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('✅ Услуга успешно удалена', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« К записи', 'back_to_record')
                ]]));
        }
        catch (error) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => { });
            await ctx.reply('❌ ' + (error.message || 'Не удалось удалить услугу'), telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'cancel_service_delete')
                ]]));
        }
    }
    catch (error) {
        console.error('Error in service deletion:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
// Обработка отмены
deleteServiceScene.action('cancel_service_delete', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const recordId = (_a = ctx.session.deleteServiceState) === null || _a === void 0 ? void 0 : _a.recordId;
        // Очищаем состояние
        delete ctx.session.deleteServiceState;
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    }
    catch (error) {
        console.error('Error in cancel_service_delete:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
// Возврат к записи
deleteServiceScene.action('back_to_record', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        const recordId = (_a = ctx.session.deleteServiceState) === null || _a === void 0 ? void 0 : _a.recordId;
        // Очищаем состояние
        delete ctx.session.deleteServiceState;
        return ctx.scene.enter('clients_management_scene', {
            action: 'show_record',
            recordId
        });
    }
    catch (error) {
        console.error('Error in back_to_record:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (deleteServiceScene);


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/loginWizard.ts":
/*!****************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/loginWizard.ts ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   loginWizard: () => (/* binding */ loginWizard)
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
    const messageText = `Добро пожаловать в CherryTown! Выберите действие:`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Трудоустройство', 'registration')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Авторизация', 'authorization')],
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
// Шаг 2: Обработка регистрации
const handleRegistration = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleRegistration.action('registration', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('registration_wizard');
    return;
});
// Шаг 3: Обработка авторизации и ввода телефона
const handleAuthorization = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAuthorization.action('authorization', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_menu')],
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.next();
});
// Обработка ввода телефона
const handlePhoneInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePhoneInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
handlePhoneInput.on('text', async (ctx) => {
    const phone = formatPhone(ctx.message.text);
    if (!isValidPhone(phone)) {
        await ctx.reply('Неверный формат номера. Пожалуйста, введите номер в формате:\n+7XXXXXXXXXX', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_menu')]
        ]));
        return;
    }
    ctx.scene.session.phone = phone;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_phone')]
    ]);
    await ctx.reply('Введите пароль от личного кабинета YClients:', keyboard);
    return ctx.wizard.next();
});
// Обработка ввода пароля
const handlePasswordInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePasswordInput.action('back_to_phone', async (ctx) => {
    await ctx.answerCbQuery();
    const message = `Введите ваш номер телефона в формате:\n+7XXXXXXXXXX`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_menu')],
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.back();
});
// Утилита для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
handlePasswordInput.on('text', async (ctx) => {
    var _a, _b;
    const password = ctx.message.text;
    const phone = ctx.scene.session.phone;
    try {
        await ctx.reply('⏳ Проверяем данные...');
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].auth(phone, password, ctx.from.id);
        if (response === null || response === void 0 ? void 0 : response.success) {
            if (ctx.session) {
                // Инициализируем сессию с правильной структурой
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
            // Очищаем временные данные из сцены
            delete ctx.scene.session.phone;
            delete ctx.scene.session.password;
            const successMsg = await ctx.reply('🔄 Авторизация...');
            await delay(700);
            await ctx.telegram.editMessageText(ctx.chat.id, successMsg.message_id, undefined, '✨ Проверяем данные...');
            await delay(700);
            await ctx.telegram.editMessageText(ctx.chat.id, successMsg.message_id, undefined, '🎉 Успешно! Добро пожаловать в личный кабинет.');
            // Проверяем сохранение данных
            console.log('Session after auth:', {
                phone: ctx.session.phone,
                hasPassword: !!ctx.session.password,
                hasUser: !!ctx.session.user
            });
            await delay(1000);
            return ctx.scene.enter('main');
        }
        const errorMsg = (response === null || response === void 0 ? void 0 : response.message) || 'Ошибка авторизации';
        const errorMessage = await ctx.reply('❌ ' + errorMsg);
        await delay(500);
        const errorKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_auth')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]);
        await ctx.telegram.editMessageText(ctx.chat.id, errorMessage.message_id, undefined, '❌ ' + errorMsg, { reply_markup: errorKeyboard.reply_markup });
    }
    catch (error) {
        console.error('Ошибка авторизации:', error);
        let errorMessage = 'Ошибка авторизации. ';
        if ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) {
            errorMessage += error.response.data.message;
        }
        else {
            errorMessage += 'Проверьте введенные данные и попробуйте снова.';
        }
        const errorMsg = await ctx.reply('⚠️ Обработка...');
        await delay(500);
        const errorKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', 'retry_auth')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]);
        await ctx.telegram.editMessageText(ctx.chat.id, errorMsg.message_id, undefined, '❌ ' + errorMessage, { reply_markup: errorKeyboard.reply_markup });
    }
});
// Обработчики кнопок
handlePasswordInput.action('retry_auth', async (ctx) => {
    await ctx.answerCbQuery();
    const message = 'Введите ваш номер телефона в формате:\n+7XXXXXXXXXX';
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_menu')]
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.selectStep(2); // Возврат к вводу телефона
});
const getInitialSession = () => ({
    user: { token: undefined, data: undefined },
    notifications: [],
    notificationForm: {
        name: '',
        dateTime: ''
    },
    notificationId: '',
    searchRequestsType: '',
    autobookingForm: {
        warehouseId: '',
        coefficient: '',
        checkUntilDate: '',
        boxTypeId: ''
    },
    page: 1,
    selectedTariff: '',
    count: null,
    userPreferences: { notifications: 0 },
    mySessionProp: 0,
    searchRequestsPage: 0,
    phone: '',
    password: '',
    isEditing: false
});
handlePasswordInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.session) {
        Object.assign(ctx.session, getInitialSession());
    }
    if (ctx.scene.session) {
        Object.assign(ctx.scene.session, {});
    }
    return ctx.scene.enter('login_wizard');
});
// Финальный шаг после успешной авторизации
const handlePostLogin = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePostLogin.action('goto_master_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('master_menu_scene');
});
handlePostLogin.action('retry_auth', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
handlePostLogin.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.reenter();
});
// Объединяем обработчики действий
const handleAction = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAction.use(handleRegistration);
handleAction.use(handleAuthorization);
// Создаем сцену wizard
const loginWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('login_wizard', showMainMenu, handleAction, handlePhoneInput, handlePasswordInput, handlePostLogin);
// Добавляем middleware для обработки ошибок
loginWizard.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (error) {
        console.error('Ошибка в login wizard:', error);
        await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'back_to_menu')]
        ]));
    }
});


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/mainScene.ts":
/*!**************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/mainScene.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mainScene: () => (/* binding */ mainScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_2__);



const mainScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('main');
mainScene.enter(async (ctx) => {
    var _a;
    const messageText = `[главный экран для мастеров]`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('обучение', 'education'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('мои документы', 'documents'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('работа с клиентами', 'clients_management'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить описание', 'change_description'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить фотографию', 'change_photo'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить график работы', 'change_schedule'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚪 Выйти из аккаунта', 'logout') // Добавляем кнопку выхода
        ]
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
});
// Обработчик выхода
mainScene.action('logout', async (ctx) => {
    try {
        await ctx.answerCbQuery('Выходим из аккаунта...');
        // Сначала спрашиваем подтверждение
        const confirmKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Да, выйти', 'confirm_logout'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отмена', 'cancel_logout')
            ]
        ]);
        await ctx.editMessageText('Вы уверены, что хотите выйти из аккаунта?', confirmKeyboard);
    }
    catch (error) {
        console.error('Ошибка при выходе:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
// Подтверждение выхода
mainScene.action('confirm_logout', async (ctx) => {
    var _a;
    try {
        await ctx.answerCbQuery();
        // Очищаем данные на бэкенде
        const telegramId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        if (telegramId) {
            try {
                await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].logout(telegramId);
            }
            catch (error) {
                // Логируем ошибку, но продолжаем процесс выхода
                console.error('Ошибка при очистке данных на бэкенде:', error);
            }
        }
        // Показываем сообщение об успешном выходе в любом случае
        await ctx.editMessageText('Вы успешно вышли из аккаунта.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Войти снова', 'start_login')]
        ]));
        // Переходим на сцену логина
        return ctx.scene.enter('login_wizard');
    }
    catch (error) {
        console.error('Ошибка при выходе:', error);
        await ctx.reply('Произошла ошибка. Попробуйте еще раз через несколько секунд.');
        // В случае ошибки всё равно пытаемся вернуться к логину
        return ctx.scene.enter('login_wizard');
    }
});
// Отмена выхода
mainScene.action('cancel_logout', async (ctx) => {
    try {
        await ctx.answerCbQuery('Отменено');
        return ctx.scene.reenter(); // Возвращаемся в главное меню
    }
    catch (error) {
        console.error('Ошибка при отмене выхода:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
mainScene.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    const messageText = `[главный экран для мастеров]`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('обучение', 'education'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('мои документы', 'documents'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('работа с клиентами', 'clients_management'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить описание', 'change_description'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить фотографию', 'change_photo'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить график работы', 'change_schedule'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚪 Выйти из аккаунта', 'logout') // Добавляем кнопку выхода
        ]
    ]);
    await ctx.editMessageText(messageText, mainMenuKeyboard);
});
// Остальные обработчики остаются без изменений
mainScene.action('education', async (ctx) => {
    const message = `[модуль обучения]\n\nссылка на обучение`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('перейти к обучению', 'https://t.me/dmitrynovikov21')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    await ctx.editMessageText(message, keyboard);
});
mainScene.action('documents', async (ctx) => {
    const message = `[Мои документы]\n\nНажмите кнопку для получения ваших документов`;
    const documentsKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📄 Получить документы', 'get_documents'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]
    ]);
    await ctx.editMessageText(message, documentsKeyboard);
});
mainScene.action('get_documents', async (ctx) => {
    var _a;
    try {
        // Получаем номер телефона из сессии или ctx
        const phone = (_a = ctx.session) === null || _a === void 0 ? void 0 : _a.phone;
        if (!phone) {
            await ctx.reply('Ошибка: не найден номер телефона. Попробуйте перелогиниться.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')
                ]]));
            return;
        }
        // Получаем документы
        const documents = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getMasterDocumentsByPhone(phone);
        if (documents && documents.length > 0) {
            await ctx.reply('Отправляю ваши документы...');
            for (const doc of documents) {
                try {
                    const fileBuffer = await fs__WEBPACK_IMPORTED_MODULE_2__.promises.readFile(doc.path);
                    await ctx.replyWithDocument({
                        source: fileBuffer,
                        filename: doc.original_name
                    });
                    // Небольшая задержка между отправкой документов
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
            await ctx.reply('Все документы отправлены', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')
                ]]));
        }
        else {
            await ctx.reply('Документы не найдены.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')
                ]]));
        }
    }
    catch (error) {
        console.error('Error in get_documents handler:', error);
        await ctx.reply('Произошла ошибка при получении документов.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')
            ]]));
    }
});
mainScene.action('clients_management', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('clients_management_scene');
});
mainScene.action('change_description', async (ctx) => {
    await ctx.answerCbQuery();
    // Просто переходим в сцену без отправки сообщения
    return ctx.scene.enter('change_description_scene');
});
mainScene.action('change_photo', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('change_photo_scene');
});
mainScene.action('change_schedule', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('schedule_management');
});


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/registrationWizard.ts":
/*!***********************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/registrationWizard.ts ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   registrationWizard: () => (/* binding */ registrationWizard)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


// Добавляем список филиалов
const BRANCHES = [
    {
        id: 'vdnh',
        name: 'Cherry Town ВДНХ',
        address: 'Москва, Звёздный бульвар, дом 10, строение 1, офис 20'
    },
    {
        id: 'semenovskaya',
        name: 'Cherry Town Семёновская',
        address: 'Москва, площадь Семёновская, дом 7, корпус 17а, кабинет 9'
    },
    {
        id: 'sportivnaya',
        name: 'Cherry Town Спортивная',
        address: 'Москва, улица Доватора, дом 6/6, корпус 8'
    },
    {
        id: 'pushkinskaya',
        name: 'Cherry Town Пушкинская',
        address: 'Москва, Малый Палашёвский переулок, дом 6'
    },
    {
        id: 'nekrasovka',
        name: 'Cherry Town Некрасовка',
        address: 'Москва, улица Покровская, дом 16'
    }
];
// Validation formats
const ValidationFormats = {
    FULL_NAME: /^[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s[А-ЯЁ][а-яё]+(?:\s[А-ЯЁ][а-яё]+)?$/,
    BIRTH_DATE: /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/,
    PASSPORT: /^\d{4}\s\d{6}$/,
    DIVISION_CODE: /^\d{3}-\d{3}$/,
    INN: /^\d{12}$/,
    ACCOUNT_NUMBER: /^\d{20}$/,
    BIK: /^\d{9}$/,
    CORR_ACCOUNT: /^\d{20}$/,
    BANK_INN: /^\d{10}$/,
    BANK_KPP: /^\d{9}$/,
    PHONE: /^\+7\d{10}$/,
    EMAIL: /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,61}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/,
    ISSUE_DATE: /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/,
    MED_BOOK_EXPIRY: /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/
};
// Validation messages
const ValidationMessages = {
    FULL_NAME: {
        prompt: 'Напишите, пожалуйста, свое ФИО\n\nПример: Иванов Иван Иванович',
        error: 'Неверный формат ФИО. ФИО должно содержать только русские буквы, пробелы и дефис.\n\nВведите, пожалуйста, корректное ФИО\nПример: Иванов Иван Иванович'
    },
    BIRTH_DATE: {
        prompt: 'Напишите, пожалуйста, дату рождения\n\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.1990',
        error: 'Неверный формат даты рождения.\n\nВведите дату в правильном формате\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.1990'
    },
    PASSPORT: {
        prompt: 'Введите серию и номер паспорта\n\nФормат: СССС НННННН\nПример: 4444 555666',
        error: 'Неверный формат паспортных данных.\n\nВведите серию и номер паспорта в правильном формате\nФормат: СССС НННННН\nПример: 4444 555666'
    },
    ISSUED_BY: {
        prompt: 'Кем выдан паспорт?\n\nПример: ГУ МВД РОССИИ ПО МОСКОВСКОЙ ОБЛАСТИ',
        error: 'Слишком короткое или длинное название органа.\n\nВведите корректное название органа, выдавшего паспорт\nПример: ГУ МВД РОССИИ ПО МОСКОВСКОЙ ОБЛАСТИ'
    },
    ISSUE_DATE: {
        prompt: 'Дата выдачи паспорта\n\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2020',
        error: 'Неверный формат даты выдачи.\n\nВведите дату в правильном формате\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2020'
    },
    DIVISION_CODE: {
        prompt: 'Код подразделения\n\nФормат: XXX-XXX\nПример: 770-001',
        error: 'Неверный формат кода подразделения.\n\nВведите код в правильном формате\nФормат: XXX-XXX\nПример: 770-001'
    },
    ADDRESS: {
        prompt: 'Адрес регистрации\n\nПример: г. Москва, ул. Ленина, д. 1, кв. 1',
        error: 'Слишком короткий или длинный адрес.\n\nВведите корректный адрес регистрации\nПример: г. Москва, ул. Ленина, д. 1, кв. 1'
    },
    INN: {
        prompt: 'ИНН\n\nПример: 123456789012 (12 цифр)',
        error: 'Неверный формат ИНН.\n\nВведите ИНН в правильном формате\nПример: 123456789012 (12 цифр)'
    },
    ACCOUNT_NUMBER: {
        prompt: 'Номер счета\n\nПример: 40817810099910004312 (20 цифр)',
        error: 'Неверный формат номера счета.\n\nВведите правильный номер счета\nПример: 40817810099910004312 (20 цифр)'
    },
    BANK_NAME: {
        prompt: 'Банк получателя\n\nПример: ПАО СБЕРБАНК',
        error: 'Некорректное название банка.\n\nВведите правильное название банка\nПример: ПАО СБЕРБАНК'
    },
    BIK: {
        prompt: 'БИК\n\nПример: 044525225 (9 цифр)',
        error: 'Неверный формат БИК.\n\nВведите БИК в правильном формате\nПример: 044525225 (9 цифр)'
    },
    CORR_ACCOUNT: {
        prompt: 'Корреспондентский счет\n\nПример: 30101810400000000225 (20 цифр)',
        error: 'Неверный формат корр. счета.\n\nВведите правильный Корреспондентский счет\nПример: 30101810400000000225 (20 цифр)'
    },
    BANK_INN: {
        prompt: 'ИНН банка\n\nПример: 7707083893 (10 цифр)',
        error: 'Неверный формат ИНН банка.\n\nВведите правильный ИНН банка\nПример: 7707083893 (10 цифр)'
    },
    BANK_KPP: {
        prompt: 'КПП банка\n\nПример: 773601001 (9 цифр)',
        error: 'Неверный формат КПП банка.\n\nВведите правильный КПП банка\nПример: 773601001 (9 цифр)'
    },
    PHONE: {
        prompt: 'Ваш номер телефона\n\nФормат: +7XXXXXXXXXX\nПример: +79001234567',
        error: 'Неверный формат номера телефона.\n\nВведите номер в правильном формате\nФормат: +7XXXXXXXXXX\nПример: +79001234567'
    },
    EMAIL: {
        prompt: 'Ваша электронная почта\n\nПример: example@mail.ru',
        error: 'Неверный формат email.\n\nВведите корректный email адрес\nПример: example@mail.ru'
    },
    MED_BOOK_EXPIRY: {
        prompt: 'Дата окончания действия медицинской книжки\n\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2025',
        error: 'Неверный формат даты.\n\nВведите дату окончания медицинской книжки\nФормат: ДД.ММ.ГГГГ\nПример: 01.01.2025'
    },
    MASTER_PRICE: {
        prompt: '📝 Укажите процент ставки, согласованный с управляющим\n\n⚠️ Максимальная ставка 50%\n\nВведите число от 1 до 50',
        error: '❌ Некорректный процент ставки\n\nПожалуйста, введите число от 1 до 50'
    }
};
// Validation helper functions
const validateField = (value, type) => {
    const pattern = ValidationFormats[type];
    return pattern.test(value);
};
const validateIssuedBy = (value) => {
    return value.length >= 5 && value.length <= 150;
};
const validateAddress = (value) => {
    return value.length >= 10 && value.length <= 200;
};
const validateBankName = (value) => {
    return value.length >= 3 && value.length <= 100;
};
// Helper function to create back button
const getBackButton = () => {
    return telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('« Назад', 'back')]
    ]);
};
// Initial welcome message
const showWelcome = async (ctx) => {
    var _a;
    const registrationForm = {
        fullName: '',
        birthDate: '',
        passport: '',
        issuedBy: '',
        issueDate: '',
        divisionCode: '',
        registrationAddress: '',
        inn: '',
        accountNumber: '',
        bankName: '',
        bik: '',
        corrAccount: '',
        bankInn: '',
        bankKpp: '',
        phone: '',
        email: '',
        hasMedBook: false,
        medBookExpiry: '',
        hasEducationCert: false,
        educationCertPhoto: '',
        isSelfEmployed: false,
        masterPrice: 0 // Ставим начальное значение вместо undefined
    };
    ctx.scene.session.registrationForm = registrationForm;
    const messageText = 'Давайте вместе устроимся на работу!';
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Давайте', 'start_registration')]
    ]);
    if ((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.message) {
        await ctx.editMessageText(messageText, keyboard);
    }
    else {
        await ctx.reply(messageText, keyboard);
    }
    return ctx.wizard.next();
};
// Check self-employment status
// Type guard для проверки типа callback query
function isDataCallbackQuery(query) {
    return 'data' in query;
}
const checkSelfEmployment = async (ctx) => {
    // Проверяем наличие callback query и его тип
    if (ctx.callbackQuery && isDataCallbackQuery(ctx.callbackQuery)) {
        // Теперь TypeScript знает, что data существует
        if (ctx.callbackQuery.data === 'start_registration') {
            const messageText = 'Вы являетесь самозанятым?';
            const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
                [
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да', 'self_employed_yes'),
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет', 'self_employed_no')
                ]
            ]);
            await ctx.editMessageText(messageText, keyboard);
            // Отвечаем на callback query чтобы убрать "часики"
            await ctx.answerCbQuery();
        }
    }
    return ctx.wizard.next();
};
// Handle self-employment response
const handleSelfEmployment = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSelfEmployment.action('self_employed_no', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = false;
    const messageText = 'Оформитесь как СМЗ и продолжите трудоустройство';
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('Оформиться', 'https://npd.nalog.ru/')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Продолжить', 'continue_registration')]
    ]);
    await ctx.editMessageText(messageText, keyboard);
});
handleSelfEmployment.action('self_employed_yes', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = true;
    return requestFullName(ctx);
});
handleSelfEmployment.action('continue_registration', async (ctx) => {
    return requestFullName(ctx);
});
// Request full name
const requestFullName = async (ctx) => {
    await ctx.reply(ValidationMessages.FULL_NAME.prompt);
    return ctx.wizard.next();
};
// Handle full name input
const handleFullName = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleFullName.on('text', async (ctx) => {
    const fullName = ctx.message.text;
    if (!validateField(fullName, 'FULL_NAME')) {
        await ctx.reply(ValidationMessages.FULL_NAME.error);
        return;
    }
    ctx.scene.session.registrationForm.fullName = fullName;
    await ctx.reply(ValidationMessages.BIRTH_DATE.prompt);
    return ctx.wizard.next();
});
// Handle birth date
// Обновляем обработчик даты рождения
const handleBirthDate = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBirthDate.on('text', async (ctx) => {
    const birthDate = ctx.message.text.trim();
    if (!validateField(birthDate, 'BIRTH_DATE')) {
        await ctx.reply(ValidationMessages.BIRTH_DATE.error);
        return;
    }
    // Добавляем проверку на разумный возраст
    const [day, month, year] = birthDate.split('.').map(Number);
    const birthTimestamp = new Date(year, month - 1, day).getTime();
    const now = new Date().getTime();
    const age = (now - birthTimestamp) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 18 || age > 100) {
        await ctx.reply('Пожалуйста, проверьте правильность введенной даты. Возраст должен быть от 18 до 100 лет.');
        return;
    }
    ctx.scene.session.registrationForm.birthDate = birthDate;
    await ctx.reply(ValidationMessages.PASSPORT.prompt);
    return ctx.wizard.next();
});
// Handle passport
const handlePassport = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePassport.on('text', async (ctx) => {
    const passport = ctx.message.text;
    if (!validateField(passport, 'PASSPORT')) {
        await ctx.reply(ValidationMessages.PASSPORT.error);
        return;
    }
    ctx.scene.session.registrationForm.passport = passport;
    await ctx.reply(ValidationMessages.ISSUED_BY.prompt);
    return ctx.wizard.next();
});
// Handle issued by
const handleIssuedBy = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleIssuedBy.on('text', async (ctx) => {
    const issuedBy = ctx.message.text;
    if (!validateIssuedBy(issuedBy)) {
        await ctx.reply(ValidationMessages.ISSUED_BY.error);
        return;
    }
    ctx.scene.session.registrationForm.issuedBy = issuedBy;
    await ctx.reply(ValidationMessages.ISSUE_DATE.prompt);
    return ctx.wizard.next();
});
// Handle issue date
const handleIssueDate = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleIssueDate.on('text', async (ctx) => {
    const issueDate = ctx.message.text;
    if (!validateField(issueDate, 'ISSUE_DATE')) {
        await ctx.reply(ValidationMessages.ISSUE_DATE.error);
        return;
    }
    ctx.scene.session.registrationForm.issueDate = issueDate;
    await ctx.reply(ValidationMessages.DIVISION_CODE.prompt);
    return ctx.wizard.next();
});
// Handle division code
const handleDivisionCode = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDivisionCode.on('text', async (ctx) => {
    const divisionCode = ctx.message.text;
    if (!validateField(divisionCode, 'DIVISION_CODE')) {
        await ctx.reply(ValidationMessages.DIVISION_CODE.error);
        return;
    }
    ctx.scene.session.registrationForm.divisionCode = divisionCode;
    await ctx.reply(ValidationMessages.ADDRESS.prompt);
    return ctx.wizard.next();
});
// Handle address
const handleAddress = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAddress.on('text', async (ctx) => {
    const address = ctx.message.text;
    if (!validateAddress(address)) {
        await ctx.reply(ValidationMessages.ADDRESS.error);
        return;
    }
    ctx.scene.session.registrationForm.registrationAddress = address;
    await ctx.reply(ValidationMessages.INN.prompt);
    return ctx.wizard.next();
});
// Handle INN
const handleInn = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleInn.on('text', async (ctx) => {
    const inn = ctx.message.text;
    if (!validateField(inn, 'INN')) {
        await ctx.reply(ValidationMessages.INN.error);
        return;
    }
    ctx.scene.session.registrationForm.inn = inn;
    await ctx.reply(ValidationMessages.ACCOUNT_NUMBER.prompt);
    return ctx.wizard.next();
});
// Handle account number
const handleAccountNumber = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAccountNumber.on('text', async (ctx) => {
    const accountNumber = ctx.message.text;
    if (!validateField(accountNumber, 'ACCOUNT_NUMBER')) {
        await ctx.reply(ValidationMessages.ACCOUNT_NUMBER.error);
        return;
    }
    ctx.scene.session.registrationForm.accountNumber = accountNumber;
    await ctx.reply(ValidationMessages.BANK_NAME.prompt);
    return ctx.wizard.next();
});
// Handle bank name
const handleBankName = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBankName.on('text', async (ctx) => {
    const bankName = ctx.message.text;
    if (!validateBankName(bankName)) {
        await ctx.reply(ValidationMessages.BANK_NAME.error);
        return;
    }
    ctx.scene.session.registrationForm.bankName = bankName;
    await ctx.reply(ValidationMessages.BIK.prompt);
    return ctx.wizard.next();
});
// Handle BIK
const handleBik = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBik.on('text', async (ctx) => {
    const bik = ctx.message.text;
    if (!validateField(bik, 'BIK')) {
        await ctx.reply(ValidationMessages.BIK.error);
        return;
    }
    ctx.scene.session.registrationForm.bik = bik;
    await ctx.reply(ValidationMessages.CORR_ACCOUNT.prompt);
    return ctx.wizard.next();
});
// Handle correspondent account
const handleCorrAccount = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCorrAccount.on('text', async (ctx) => {
    const corrAccount = ctx.message.text;
    if (!validateField(corrAccount, 'CORR_ACCOUNT')) {
        await ctx.reply(ValidationMessages.CORR_ACCOUNT.error);
        return;
    }
    ctx.scene.session.registrationForm.corrAccount = corrAccount;
    await ctx.reply(ValidationMessages.BANK_INN.prompt);
    return ctx.wizard.next();
});
// Handle bank INN
const handleBankInn = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBankInn.on('text', async (ctx) => {
    const bankInn = ctx.message.text;
    if (!validateField(bankInn, 'BANK_INN')) {
        await ctx.reply(ValidationMessages.BANK_INN.error);
        return;
    }
    ctx.scene.session.registrationForm.bankInn = bankInn;
    await ctx.reply(ValidationMessages.BANK_KPP.prompt);
    return ctx.wizard.next();
});
// Handle bank KPP
const handleBankKpp = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBankKpp.on('text', async (ctx) => {
    const bankKpp = ctx.message.text;
    if (!validateField(bankKpp, 'BANK_KPP')) {
        await ctx.reply(ValidationMessages.BANK_KPP.error);
        return;
    }
    ctx.scene.session.registrationForm.bankKpp = bankKpp;
    await ctx.reply(ValidationMessages.PHONE.prompt);
    return ctx.wizard.next();
});
// Handle phone
const handlePhone = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePhone.on('text', async (ctx) => {
    const phone = ctx.message.text;
    if (!validateField(phone, 'PHONE')) {
        await ctx.reply(ValidationMessages.PHONE.error);
        return;
    }
    ctx.scene.session.registrationForm.phone = phone;
    await ctx.reply(ValidationMessages.EMAIL.prompt);
    return ctx.wizard.next();
});
// Handle email
const handleEmail = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleEmail.on('text', async (ctx) => {
    const email = ctx.message.text;
    if (!validateField(email, 'EMAIL')) {
        await ctx.reply(ValidationMessages.EMAIL.error);
        return;
    }
    ctx.scene.session.registrationForm.email = email;
    await ctx.reply('У вас есть мед книжка?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да', 'med_book_yes'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет', 'med_book_no')
        ]
    ]));
    return ctx.wizard.next();
});
// Handle med book response
const handleMedBook = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleMedBook.action('med_book_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = true;
    await ctx.reply(ValidationMessages.MED_BOOK_EXPIRY.prompt);
    return ctx.wizard.next();
});
handleMedBook.action('med_book_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = false;
    return handleEducationCertQuestion(ctx);
});
// Handle med book expiry
const handleMedBookExpiry = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleMedBookExpiry.on('text', async (ctx) => {
    const medBookExpiry = ctx.message.text;
    if (!validateField(medBookExpiry, 'MED_BOOK_EXPIRY')) {
        await ctx.reply(ValidationMessages.MED_BOOK_EXPIRY.error);
        return;
    }
    ctx.scene.session.registrationForm.medBookExpiry = medBookExpiry;
    return handleEducationCertQuestion(ctx);
});
// Handle education certificate question
const handleEducationCertQuestion = async (ctx) => {
    await ctx.reply('У вас есть сертификат об образовании?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да', 'education_cert_yes'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет', 'education_cert_no')
        ]
    ]));
    return ctx.wizard.next();
};
// Handle education certificate response
const handleEducationCert = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleEducationCert.action('education_cert_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = true;
    await ctx.reply('Отправьте, пожалуйста, фото сертификата');
    return ctx.wizard.next();
});
handleEducationCert.action('education_cert_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = false;
    await ctx.reply(ValidationMessages.MASTER_PRICE.prompt);
    // Пропускаем шаг handleEducationCertPhoto
    ctx.wizard.selectStep(ctx.wizard.cursor + 2);
    return;
});
// Handle education certificate photo
const handleEducationCertPhoto = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleEducationCertPhoto.on('photo', async (ctx) => {
    // Сначала показываем, что фото получено
    await ctx.reply('✅ Фото сертификата получено');
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    ctx.scene.session.registrationForm.educationCertPhoto = photo.file_id;
    // Делаем небольшую паузу перед следующим шагом
    await new Promise(resolve => setTimeout(resolve, 500));
    // Запрашиваем ставку
    await ctx.reply(ValidationMessages.MASTER_PRICE.prompt);
    return ctx.wizard.next();
});
// Добавляем обработку пропуска фото для тех, у кого нет сертификата
handleEducationCertPhoto.action('skip_photo', async (ctx) => {
    await ctx.reply(ValidationMessages.MASTER_PRICE.prompt);
    return ctx.wizard.next();
});
const handleMasterPrice = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleMasterPrice.on('text', async (ctx) => {
    const price = parseInt(ctx.message.text);
    console.log('Received master price:', price);
    if (isNaN(price)) {
        await ctx.reply(ValidationMessages.MASTER_PRICE.error);
        return;
    }
    if (price <= 0 || price > 50) {
        await ctx.reply(ValidationMessages.MASTER_PRICE.error);
        return;
    }
    try {
        ctx.scene.session.registrationForm.masterPrice = price;
        console.log('Saved master price:', ctx.scene.session.registrationForm);
        await ctx.reply(`✅ Установлена ставка: ${price}%`);
        // Показываем выбор филиала
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(BRANCHES.map(branch => [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(branch.name, `select_branch_${branch.id}`)
        ]));
        await ctx.reply('Выберите филиал, в котором будете работать:', keyboard);
        return ctx.wizard.next();
    }
    catch (error) {
        console.error('Error in handleMasterPrice:', error);
        await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте ввести ставку снова.');
    }
});
// Добавляем новый обработчик выбора филиала
const handleBranchSelection = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBranchSelection.action(/select_branch_(.+)/, async (ctx) => {
    var _a;
    const branchId = ctx.match[1];
    const selectedBranch = BRANCHES.find(b => b.id === branchId);
    if (!selectedBranch) {
        await ctx.reply('Ошибка выбора филиала. Пожалуйста, попробуйте снова.');
        return;
    }
    try {
        // Получаем Yclients ID филиала
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getBranchYclientsId(branchId);
        if (!(response === null || response === void 0 ? void 0 : response.success) || !((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.yclients_id)) {
            throw new Error('Не удалось получить ID филиала');
        }
        ctx.scene.session.registrationForm.selectedBranch = selectedBranch;
        ctx.scene.session.registrationForm.branch_yclients_id = response.data.yclients_id;
        await ctx.reply(`✅ Выбран филиал: ${selectedBranch.name}\n` +
            `📍 Адрес: ${selectedBranch.address}\n\n` +
            `Переходим к подготовке документов...`);
        // Переходим к генерации документов
        await handleFinalStep(ctx);
    }
    catch (error) {
        console.error('Error getting branch yclients_id:', error);
        await ctx.reply('Произошла ошибка при выборе филиала. Пожалуйста, попробуйте снова.');
    }
});
// Обрабатываем другие типы сообщений
handleMasterPrice.on('message', async (ctx) => {
    console.log('Received non-text message in master price handler');
    await ctx.reply(ValidationMessages.MASTER_PRICE.error);
});
// Создаем улучшенное хранилище для групп документов
const documentGroups = new Map();
// Функция логирования
function logDebug(message, data) {
    console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}
const handleSignedDocuments = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSignedDocuments.on('document', async (ctx) => {
    var _a, _b, _c, _d;
    console.log('DEBUG: Document handler triggered', {
        sessionData: (_a = ctx.scene) === null || _a === void 0 ? void 0 : _a.session,
        registrationId: (_c = (_b = ctx.scene) === null || _b === void 0 ? void 0 : _b.session) === null || _c === void 0 ? void 0 : _c.registrationId
    });
    const message = ctx.message;
    const mediaGroupId = message.media_group_id;
    const document = message.document;
    logDebug('Получен новый документ:', {
        mediaGroupId,
        fileName: document.file_name,
        fileId: document.file_id,
        fileSize: document.file_size,
        registrationId: ctx.scene.session.registrationId
    });
    // Проверяем формат файла
    const fileName = (_d = document.file_name) === null || _d === void 0 ? void 0 : _d.toLowerCase();
    if (!(fileName === null || fileName === void 0 ? void 0 : fileName.endsWith('.pdf')) && !(fileName === null || fileName === void 0 ? void 0 : fileName.endsWith('.docx'))) {
        logDebug('Некорректный формат файла:', { fileName });
        await ctx.reply('Пожалуйста, отправляйте документы только в форматах PDF или DOCX');
        return;
    }
    if (!mediaGroupId) {
        logDebug('Документ отправлен не в группе');
        await ctx.reply('Пожалуйста, отправьте все документы одним сообщением, выбрав их все сразу.');
        return;
    }
    // Получаем или создаем группу документов
    let group = documentGroups.get(mediaGroupId);
    if (!group) {
        logDebug('Создаем новую группу документов:', { mediaGroupId });
        group = {
            files: [],
            processed: false
        };
        documentGroups.set(mediaGroupId, group);
    }
    // Добавляем документ в группу
    group.files.push({
        file_id: document.file_id,
        file_name: document.file_name
    });
    logDebug('Добавлен документ в группу:', {
        mediaGroupId,
        totalFiles: group.files.length,
        currentFile: document.file_name
    });
    // Очищаем предыдущий таймер если он есть
    if (group.timer) {
        clearTimeout(group.timer);
    }
    // Устанавливаем новый таймер для обработки группы
    group.timer = setTimeout(async () => {
        logDebug('Запуск обработки группы документов:', {
            mediaGroupId,
            filesCount: group.files.length
        });
        if (group.processed) {
            logDebug('Группа уже была обработана:', { mediaGroupId });
            return;
        }
        try {
            group.processed = true;
            // Проверяем наличие registrationId
            const registrationId = ctx.scene.session.registrationId;
            if (!registrationId) {
                throw new Error('Отсутствует registrationId в сессии');
            }
            logDebug('Начинаем загрузку файлов:', {
                mediaGroupId,
                registrationId,
                filesCount: group.files.length
            });
            // Загружаем и подготавливаем все документы
            const uploadPromises = group.files.map(async (doc) => {
                logDebug('Получаем информацию о файле от Telegram:', {
                    fileId: doc.file_id,
                    fileName: doc.file_name
                });
                const file = await ctx.telegram.getFile(doc.file_id);
                const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN_MASTER}/${file.file_path}`;
                logDebug('Получен URL файла:', {
                    fileName: doc.file_name,
                    fileUrl: fileUrl
                });
                return {
                    url: fileUrl,
                    name: doc.file_name
                };
            });
            const uploadedFiles = await Promise.all(uploadPromises);
            logDebug('Все файлы подготовлены к загрузке:', {
                filesCount: uploadedFiles.length,
                files: uploadedFiles.map(f => f.name)
            });
            // Отправляем документы в API
            logDebug('Отправляем документы в API:', {
                registrationId,
                filesCount: uploadedFiles.length
            });
            const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].uploadSignedDocuments(registrationId, uploadedFiles);
            logDebug('Получен ответ от API:', { response });
            await ctx.reply('✅ Документы успешно загружены!\n\n' +
                'Теперь вы можете начать процесс трудоустройства.\n' +
                'Нажмите кнопку ниже:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🚀 Устроиться на работу', `start_employment_${registrationId}`)
                ]]));
            // Очищаем группу
            documentGroups.delete(mediaGroupId);
            logDebug('Группа документов успешно обработана и удалена:', { mediaGroupId });
            return ctx.scene.leave();
        }
        catch (error) {
            logDebug('Ошибка при обработке группы документов:', {
                mediaGroupId,
                error: error.message,
                stack: error.stack
            });
            await ctx.reply('Произошла ошибка при обработке документов. Пожалуйста, попробуйте еще раз или обратитесь в поддержку.');
            // Очищаем группу в случае ошибки
            documentGroups.delete(mediaGroupId);
        }
    }, 2000); // Увеличиваем время ожидания до 2 секунд
});
// Handle final step
// В handleFinalStep добавим:
const handleFinalStep = async (ctx) => {
    var _a, _b;
    try {
        const selectedBranch = ctx.scene.session.registrationForm.selectedBranch;
        if (!selectedBranch) {
            throw new Error('Не выбран филиал');
        }
        const userId = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id;
        console.log('Getting user ID from context:', userId);
        if (!userId) {
            console.error('No user ID found in context');
            return;
        }
        const registrationData = Object.assign(Object.assign({}, ctx.scene.session.registrationForm), { work_address: selectedBranch.address, telegram_id: userId.toString(), branch_name: selectedBranch.name, branch_id: selectedBranch.id, branch_yclients_id: ctx.scene.session.registrationForm.branch_yclients_id });
        console.log('Full registration data being sent:', registrationData);
        const registrationResponse = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].submitRegistration(registrationData);
        console.log('Registration submitted successfully:', registrationResponse);
        const registrationId = registrationResponse.data.id;
        ctx.scene.session.registrationId = registrationId;
        if (!registrationId) {
            throw new Error('Registration ID not found in response');
        }
        await ctx.reply('✅ Ваша заявка успешно создана!\n\n' +
            'Она будет рассмотрена в ближайшее время.\n' +
            'После одобрения вам придут документы для подписания.\n\n' +
            'Пожалуйста, ожидайте.');
    }
    catch (error) {
        console.error('Error in handleFinalStep:', error);
        let errorMessage = 'Произошла ошибка при обработке данных. ';
        if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 422) {
            const validationErrors = error.response.data.errors;
            if (validationErrors.email) {
                errorMessage += 'Этот email уже зарегистрирован в системе. Пожалуйста, используйте другой email.';
            }
            else {
                errorMessage += 'Пожалуйста, проверьте правильность введенных данных.';
            }
        }
        else {
            errorMessage += 'Пожалуйста, попробуйте позже.';
        }
        await ctx.reply(errorMessage);
    }
};
const registrationWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('registration_wizard', showWelcome, checkSelfEmployment, handleSelfEmployment, handleFullName, handleBirthDate, handlePassport, handleIssuedBy, handleIssueDate, handleDivisionCode, handleAddress, handleInn, handleAccountNumber, handleBankName, handleBik, handleCorrAccount, handleBankInn, handleBankKpp, handlePhone, handleEmail, handleMedBook, handleMedBookExpiry, handleEducationCert, handleEducationCertPhoto, handleMasterPrice, // Новый шаг
handleBranchSelection, handleFinalStep, 
// Исправляем этап ожидания документов
async (ctx) => {
    // Явно возвращаем Promise<void>
    await ctx.reply('Ожидаю подписанные документы...');
    return;
});
registrationWizard.action('cancel', async (ctx) => {
    await ctx.reply('❌ Регистрация отменена\n\n' +
        'Вы можете начать заново, когда будете готовы', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Начать заново', 'start_registration')
        ]]));
    return ctx.scene.leave();
});
// Добавляем обработчик документов через middleware
registrationWizard.command('restart', async (ctx) => {
    await ctx.scene.leave();
    await ctx.scene.enter('registration_wizard');
});
// Регистрируем обработчик документов на уровне сцены
registrationWizard.on('document', handleSignedDocuments);
// Добавляем отладочный middleware
registrationWizard.use(async (ctx, next) => {
    var _a, _b;
    console.log('Scene middleware triggered:', {
        step: (_a = ctx.wizard) === null || _a === void 0 ? void 0 : _a.cursor,
        sessionData: (_b = ctx.scene) === null || _b === void 0 ? void 0 : _b.session,
        updateType: ctx.updateType
    });
    return next();
});
// В registration_wizard добавляем обработчик:
registrationWizard.action(/start_employment_(\d+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery('⏳ Отправляем приглашение...');
        const registrationId = ctx.match[1]; // Получаем ID из callback_data
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].sendEmploymentInvite(registrationId);
        if (result.success) {
            await ctx.editMessageText("📱 Вам отправлено СМС-приглашение для регистрации в системе.\n\n" +
                "❗️ Пожалуйста:\n" +
                "1. Проверьте SMS\n" +
                "2. Перейдите по ссылке\n" +
                "3. Завершите регистрацию в системе\n\n" +
                "После регистрации нажмите кнопку ниже:", telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Я зарегистрировался', `complete_registration_${registrationId}`)
                ]]));
        }
        else {
            throw new Error(result.message || 'Failed to send invite');
        }
    }
    catch (error) {
        console.error('Error starting employment:', error);
        await ctx.reply('❌ Произошла ошибка при отправке приглашения.\n' +
            'Пожалуйста, попробуйте позже или обратитесь к администратору.');
    }
});
registrationWizard.action(/^complete_registration_(\d+)$/, async (ctx) => {
    try {
        const regId = ctx.match[1];
        await ctx.answerCbQuery('⏳ Создаем профиль мастера...');
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].createStaffProfile(regId); // Здесь regId уже string
        if (result.success) {
            await ctx.editMessageText("🎉 Поздравляем!\n\n" +
                "Ваш профиль мастера успешно создан.\n" +
                "Добро пожаловать в команду CherryTown! ✨\n\n" +
                "Теперь вы можете приступать к работе.", telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('📱 В главное меню', 'mainmenu')
                ]]));
        }
        else {
            throw new Error(result.message || 'Failed to create profile');
        }
    }
    catch (error) {
        console.error('Error completing registration:', error);
        const currentRegId = ctx.match ? ctx.match[1] : ''; // Безопасное получение ID
        await ctx.reply('❌ Произошла ошибка при создании профиля.\n' +
            'Пожалуйста, попробуйте позже или обратитесь к администратору.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🔄 Попробовать снова', `complete_registration_${currentRegId}`)
            ]]));
    }
});


/***/ }),

/***/ "./src/telegraf/services/bot-master/scenes/scheduleManagementScene.ts":
/*!****************************************************************************!*\
  !*** ./src/telegraf/services/bot-master/scenes/scheduleManagementScene.ts ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   scheduleManagementScene: () => (/* binding */ scheduleManagementScene)
/* harmony export */ });
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! telegraf */ "telegraf");
/* harmony import */ var telegraf__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(telegraf__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_laravelService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../services/laravelService */ "./src/services/laravelService.ts");


const scheduleManagementScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('schedule_management');
// Форматирование даты для API
const formatDateForApi = (date) => {
    const [day, month, year] = date.split('.');
    return `${year}-${month}-${day}`;
};
// Форматирование даты для отображения
const formatDateForDisplay = (date) => {
    const [year, month, day] = date.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return `${day}.${month} (${days[dateObj.getDay()]})`;
};
// Проверка формата даты
const isValidDateFormat = (date) => {
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    return dateRegex.test(date);
};
// Проверка корректности даты
const isValidDate = (dateStr) => {
    if (!isValidDateFormat(dateStr))
        return false;
    const [day, month, year] = dateStr.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day &&
        date.getMonth() === month - 1 &&
        date.getFullYear() === year;
};
// Проверка что дата не в прошлом
const isDateInFuture = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [day, month, year] = dateStr.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    return date >= today;
};
// Вход в сцену
scheduleManagementScene.enter(async (ctx) => {
    try {
        ctx.session.scheduleState = {
            step: 'select_period'
        };
        await ctx.reply('Для изменения графика работы сначала выберите период:\n\n' +
            '⚠️ Убедитесь, что замена согласована с заменяющим мастером.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Один день', 'period_single')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Период дат', 'period_range')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
        ]));
    }
    catch (error) {
        console.error('Error in scheduleManagementScene.enter:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
// Обработка выбора периода
scheduleManagementScene.action(/^period_(single|range)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const periodType = ctx.match[1];
        ctx.session.scheduleState = {
            step: 'enter_date',
            periodType
        };
        if (periodType === 'single') {
            await ctx.editMessageText('Введите дату для замены в формате ДД.ММ.ГГГГ (например, 25.03.2024):', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]]));
        }
        else {
            await ctx.editMessageText('Введите начальную дату периода в формате ДД.ММ.ГГГГ:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]]));
        }
    }
    catch (error) {
        console.error('Error in period selection:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
// Обработка ввода даты/дат
scheduleManagementScene.on('text', async (ctx) => {
    try {
        if (!ctx.session.scheduleState)
            return;
        const state = ctx.session.scheduleState;
        const text = ctx.message.text;
        if (state.step === 'enter_date') {
            if (!isValidDate(text)) {
                await ctx.reply('Неверный формат даты. Пожалуйста, используйте формат ДД.ММ.ГГГГ:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]]));
                return;
            }
            if (!isDateInFuture(text)) {
                await ctx.reply('Нельзя выбрать дату в прошлом. Пожалуйста, введите будущую дату:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]]));
                return;
            }
            if (state.periodType === 'single') {
                state.startDate = formatDateForApi(text);
                state.endDate = state.startDate;
                await showMastersList(ctx);
            }
            else {
                if (!state.startDate) {
                    state.startDate = formatDateForApi(text);
                    await ctx.reply('Теперь введите конечную дату периода в формате ДД.ММ.ГГГГ:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]]));
                }
                else {
                    const endDate = formatDateForApi(text);
                    if (endDate < state.startDate) {
                        await ctx.reply('Конечная дата не может быть раньше начальной. Введите конечную дату снова:', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]]));
                        return;
                    }
                    state.endDate = endDate;
                    await showMastersList(ctx);
                }
            }
        }
    }
    catch (error) {
        console.error('Error in text handler:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
async function showMastersList(ctx) {
    var _a, _b, _c;
    try {
        if (!((_a = ctx.session.scheduleState) === null || _a === void 0 ? void 0 : _a.startDate) || !((_b = ctx.session.scheduleState) === null || _b === void 0 ? void 0 : _b.endDate)) {
            await ctx.reply('Ошибка: не выбраны даты');
            return;
        }
        // Показываем начало загрузки
        const loadingMessage = await ctx.reply('⌛ Подбираем доступных мастеров...', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Отменить', 'back_to_period')
            ]]));
        // Получаем данные текущего мастера
        const masterInfo = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getStaffSchedule(ctx.from.id, ctx.session.scheduleState.startDate, ctx.session.scheduleState.endDate, true);
        if (!((_c = masterInfo === null || masterInfo === void 0 ? void 0 : masterInfo.data) === null || _c === void 0 ? void 0 : _c[0])) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
            await ctx.reply('Не удалось получить информацию о мастере');
            return;
        }
        // Получаем список мастеров филиала
        const allMastersResponse = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getFilialStaff(ctx.from.id, ctx.session.scheduleState.startDate, ctx.session.scheduleState.endDate, true);
        // Удаляем сообщение о загрузке
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
        if (!(allMastersResponse === null || allMastersResponse === void 0 ? void 0 : allMastersResponse.success) || !allMastersResponse.data) {
            await ctx.reply('Не удалось получить список мастеров', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
                ]]));
            return;
        }
        const currentMasterId = masterInfo.data[0].staff_id;
        // Фильтруем список - исключаем текущего мастера
        const availableMasters = allMastersResponse.data.filter(master => master.id !== currentMasterId);
        if (!availableMasters.length) {
            await ctx.reply('Нет доступных мастеров для замены в филиале');
            return;
        }
        // Создаем кнопки выбора мастеров
        const buttons = availableMasters.map(master => {
            const buttonText = master.name
                ? `${master.name}${master.specialization ? ` (${master.specialization})` : ''}`
                : `Мастер ${master.id}`;
            return [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback(buttonText, `select_master_${master.id}`)
            ];
        });
        buttons.push([telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')]);
        const dateRange = ctx.session.scheduleState.periodType === 'single'
            ? formatDateForDisplay(ctx.session.scheduleState.startDate)
            : `${formatDateForDisplay(ctx.session.scheduleState.startDate)} - ${formatDateForDisplay(ctx.session.scheduleState.endDate)}`;
        ctx.session.scheduleState = Object.assign(Object.assign({}, ctx.session.scheduleState), { step: 'select_master', masters: availableMasters, currentMasterId: currentMasterId });
        await ctx.reply(`Выберите мастера для замены на ${dateRange}:`, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard(buttons));
    }
    catch (error) {
        console.error('Error in showMastersList:', error);
        await ctx.reply('😕 Что-то пошло не так, попробуйте еще раз', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
            ]]));
    }
}
// Обработка выбора мастера
scheduleManagementScene.action(/^select_master_(\d+)$/, async (ctx) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        await ctx.answerCbQuery();
        if (!((_a = ctx.session.scheduleState) === null || _a === void 0 ? void 0 : _a.startDate) ||
            !((_b = ctx.session.scheduleState) === null || _b === void 0 ? void 0 : _b.endDate) ||
            !((_c = ctx.session.scheduleState) === null || _c === void 0 ? void 0 : _c.currentMasterId)) {
            await ctx.reply('Ошибка: недостаточно данных для замены');
            return;
        }
        const replacementMasterId = parseInt(ctx.match[1]);
        const currentMasterId = ctx.session.scheduleState.currentMasterId;
        // Показываем начало процесса
        await ctx.editMessageText('⌛ Подготавливаем данные для замены...', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Отменить', 'back_to_period')
            ]]));
        // Получаем расписание текущего мастера для текущего дня
        const currentMasterSchedule = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getStaffSchedule(ctx.from.id, ctx.session.scheduleState.startDate, ctx.session.scheduleState.startDate, true);
        let masterScheduleData = null;
        if (currentMasterSchedule === null || currentMasterSchedule === void 0 ? void 0 : currentMasterSchedule.data) {
            masterScheduleData = currentMasterSchedule.data.find(schedule => schedule.staff_id === currentMasterId);
        }
        // Проверяем существование slots
        if (!(masterScheduleData === null || masterScheduleData === void 0 ? void 0 : masterScheduleData.slots) || !Array.isArray(masterScheduleData.slots) || masterScheduleData.slots.length === 0) {
            await ctx.editMessageText('🤔 Не нашли график работы на выбранную дату', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
                ]]));
            return;
        }
        // Готовим данные для обновления
        const scheduleData = {
            schedules_to_set: [],
            schedules_to_delete: []
        };
        // Создаем массив всех дат диапазона
        const start = new Date(ctx.session.scheduleState.startDate);
        const end = new Date(ctx.session.scheduleState.endDate);
        // Обновляем статус для периода дат
        if (start.getTime() !== end.getTime()) {
            await ctx.editMessageText('⌛ Проверяем графики за выбранный период...', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Отменить', 'back_to_period')
                ]]));
        }
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split('T')[0];
            const daySchedule = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].getStaffSchedule(ctx.from.id, date, date, true);
            const masterDaySchedule = (_d = daySchedule === null || daySchedule === void 0 ? void 0 : daySchedule.data) === null || _d === void 0 ? void 0 : _d.find(schedule => schedule.staff_id === currentMasterId);
            if ((_e = masterDaySchedule === null || masterDaySchedule === void 0 ? void 0 : masterDaySchedule.slots) === null || _e === void 0 ? void 0 : _e.length) {
                scheduleData.schedules_to_set.push({
                    staff_id: replacementMasterId,
                    date,
                    slots: masterDaySchedule.slots
                });
                scheduleData.schedules_to_delete.push({
                    staff_id: currentMasterId,
                    date
                });
            }
        }
        // Проверяем наличие слотов в готовых данных
        if (!((_g = (_f = scheduleData.schedules_to_set[0]) === null || _f === void 0 ? void 0 : _f.slots) === null || _g === void 0 ? void 0 : _g.length)) {
            await ctx.editMessageText('😕 Не нашли рабочих смен в выбранные дни', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
                ]]));
            return;
        }
        const selectedMaster = (_h = ctx.session.scheduleState.masters) === null || _h === void 0 ? void 0 : _h.find(m => m.id === replacementMasterId);
        if (!(selectedMaster === null || selectedMaster === void 0 ? void 0 : selectedMaster.name)) {
            await ctx.editMessageText('😕 Не удалось найти информацию о выбранном мастере', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
                ]]));
            return;
        }
        const dateRange = ctx.session.scheduleState.periodType === 'single'
            ? formatDateForDisplay(ctx.session.scheduleState.startDate)
            : `${formatDateForDisplay(ctx.session.scheduleState.startDate)} - ${formatDateForDisplay(ctx.session.scheduleState.endDate)}`;
        ctx.session.scheduleState = Object.assign(Object.assign({}, ctx.session.scheduleState), { updateData: scheduleData });
        await ctx.editMessageText(`📋 Подтвердите замену:\n\n` +
            `🗓 Период: ${dateRange}\n` +
            `👤 Заменяющий мастер: ${selectedMaster.name}\n\n` +
            `⚠️ Вы действительно хотите передать свой график работы этому мастеру?`, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('✅ Да, подтверждаю', `confirm_replacement_${replacementMasterId}`)],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('❌ Отмена', 'back_to_period')]
        ]));
    }
    catch (error) {
        console.error('Error in master selection:', error);
        await ctx.editMessageText('😕 Что-то пошло не так\n' +
            'Попробуйте выбрать другой период или мастера', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
            ]]));
    }
});
// Обработчик подтверждения замены
scheduleManagementScene.action(/^confirm_replacement_(\d+)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const scheduleState = ctx.session.scheduleState;
        if (!(scheduleState === null || scheduleState === void 0 ? void 0 : scheduleState.updateData)) {
            await ctx.editMessageText('😕 Что-то пошло не так, попробуйте начать сначала', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Назад', 'back_to_period')
                ]]));
            return;
        }
        // Показываем статус обновления
        await ctx.editMessageText('⌛ Обновляем график работы...', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Отменить', 'back_to_period')
            ]]));
        // Форматируем данные для API
        const formattedData = {
            schedules_to_set: scheduleState.updateData.schedules_to_set.map(schedule => {
                if ('dates' in schedule) {
                    const dates = schedule.dates;
                    return {
                        staff_id: schedule.staff_id,
                        date: dates[0].date,
                        slots: dates[0].slots
                    };
                }
                return schedule;
            }),
            schedules_to_delete: scheduleState.updateData.schedules_to_delete.map(schedule => {
                if ('dates' in schedule) {
                    const dates = schedule.dates;
                    return {
                        staff_id: schedule.staff_id,
                        date: dates[0]
                    };
                }
                return schedule;
            })
        };
        // Отправляем запрос на обновление
        const result = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].updateStaffSchedule(ctx.from.id, scheduleState.startDate, formattedData, true);
        if (result === null || result === void 0 ? void 0 : result.success) {
            const dateRange = ctx.session.scheduleState.periodType === 'single'
                ? formatDateForDisplay(ctx.session.scheduleState.startDate)
                : `${formatDateForDisplay(ctx.session.scheduleState.startDate)} - ${formatDateForDisplay(ctx.session.scheduleState.endDate)}`;
            // Показываем успешное завершение
            await ctx.editMessageText(`✨ Отлично! Замена оформлена\n\n` +
                `🗓 Период: ${dateRange}\n\n` +
                `График работы успешно передан заменяющему мастеру`, telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                    telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в меню', 'mainmenu')
                ]]));
        }
        else {
            throw new Error('Failed to update schedule');
        }
    }
    catch (error) {
        console.error('Error in replacement confirmation:', error);
        await ctx.editMessageText('😕 Не удалось обновить график\n' +
            'Возможно, выбранный мастер уже работает в это время', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Попробовать снова', 'back_to_period')
            ]]));
    }
});
// Обработка кнопки "Назад"
scheduleManagementScene.action('back_to_period', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        ctx.session.scheduleState = {
            step: 'select_period'
        };
        await ctx.editMessageText('Для изменения графика работы сначала выберите период:\n\n' +
            '⚠️ Убедитесь, что замена согласована с заменяющим мастером.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Один день', 'period_single')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Период дат', 'period_range')],
            [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👈 Вернуться в главное меню', 'mainmenu')]
        ]));
    }
    catch (error) {
        console.error('Error in back_to_period:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
// Возврат в главное меню
scheduleManagementScene.action('mainmenu', async (ctx) => {
    try {
        await ctx.answerCbQuery('🏠 Главное меню');
        return ctx.scene.enter('main');
    }
    catch (error) {
        console.error('Error in mainmenu:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (scheduleManagementScene);


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

/***/ "date-fns-tz":
/*!******************************!*\
  !*** external "date-fns-tz" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("date-fns-tz");

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

/***/ "openai":
/*!*************************!*\
  !*** external "openai" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("openai");

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
/* harmony import */ var _routes_yclientsRoutes__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./routes/yclientsRoutes */ "./src/routes/yclientsRoutes.ts");
/* harmony import */ var _telegraf_controllers_telegramBotMasterController__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./telegraf/controllers/telegramBotMasterController */ "./src/telegraf/controllers/telegramBotMasterController.ts");


 // For logging


// Import Routes





// Перед настройкой маршрутов добавляем установку webhook URL для каждого бота
const WEBHOOK_DOMAIN = 'https://albacore-famous-opossum.ngrok-free.app';
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
// Основной бот
_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_4__["default"].telegram.setWebhook(`${WEBHOOK_DOMAIN}/webhook/main`)
    .then(() => logger.info('Main bot webhook set'))
    .catch(err => logger.error('Failed to set main bot webhook:', err));
// Мастер бот
_telegraf_controllers_telegramBotMasterController__WEBPACK_IMPORTED_MODULE_9__["default"].telegram.setWebhook(`${WEBHOOK_DOMAIN}/webhook/master`)
    .then(() => logger.info('Master bot webhook set'))
    .catch(err => logger.error('Failed to set master bot webhook:', err));
// Routes
// Webhook route
app.use(_telegraf_controllers_telegramController__WEBPACK_IMPORTED_MODULE_4__["default"].webhookCallback('/webhook/main'));
app.use(_telegraf_controllers_telegramBotMasterController__WEBPACK_IMPORTED_MODULE_9__["default"].webhookCallback('/webhook/master'));
app.use('/api/drafts', _routes_drafts__WEBPACK_IMPORTED_MODULE_5__["default"]);
app.use('/api/orders', _routes_orders__WEBPACK_IMPORTED_MODULE_6__["default"]);
app.use('/api/acceptance', _routes_acceptance__WEBPACK_IMPORTED_MODULE_7__["default"]);
app.use('/api/yclients', _routes_yclientsRoutes__WEBPACK_IMPORTED_MODULE_8__["default"]);
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