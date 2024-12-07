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
    const startPayload = ctx.payload;
    if (startPayload) {
        if (startPayload === 'registration') {
            await ctx.scene.enter('registration_wizard');
            return;
        }
        await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_4__.cabinetGate)(ctx, 'main');
        return;
    }
    else {
        await (0,_utils_cabinetGate__WEBPACK_IMPORTED_MODULE_4__.cabinetGate)(ctx, 'main');
        return;
    }
});
// Handle 'mainmenu' action
botMaster.action('mainmenu', async (ctx) => {
    //if user authenticated then show main menu else show login menu
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
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => { });
        await ctx.reply('✅ Описание успешно обновлено!\n\n' +
            '💫 Новое описание уже доступно в вашем профиле.', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([[telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('🏠 В главное меню', 'back_to_menu')]]));
        return ctx.scene.enter('main');
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
handlePasswordInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    // Очищаем данные сессии
    if (ctx.session) {
        ctx.session = {};
    }
    return ctx.scene.enter('login_wizard'); // Возвращаемся в начало сцены
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
            // Сохраняем данные авторизации в сессию
            ctx.session.phone = phone;
            ctx.session.password = password;
            // Также можно сохранить токен, если он нужен
            if (response.token) {
                ctx.session.apiToken = response.token;
            }
            // Сохраняем данные пользователя
            if (response.user) {
                ctx.session.user = response.user;
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
handlePasswordInput.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.scene.session) {
        ctx.scene.session = {};
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
    const message = `[Мои документы]\n\nВ кнопках выводим три документа из карточки мастера`;
    const documentsKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('документ 1', 'document_1'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('документ 2', 'document_2'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('документ 3', 'document_3'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]
    ]);
    await ctx.editMessageText(message, documentsKeyboard);
});
mainScene.action('clients_management', async (ctx) => {
    const message = `[работа с клиентами]`;
    const clientsManagementKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить время услуги', 'change_service_time'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('удалить услугу из заказа', 'delete_service_from_order'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('добавить услугу в заказ', 'add_service_to_order'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить номер телефона', 'change_phone_number'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('изменить состав заказа', 'change_order_content'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('отменить запись клиента', 'cancel_client_booking'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu'),
        ]
    ]);
    await ctx.editMessageText(message, clientsManagementKeyboard);
});
mainScene.action('change_description', async (ctx) => {
    await ctx.answerCbQuery();
    // Просто переходим в сцену без отправки сообщения
    return ctx.scene.enter('change_description_scene');
});
mainScene.action('change_photo', async (ctx) => {
    ctx.reply('Изменить фотографию');
});
mainScene.action('change_schedule', async (ctx) => {
    ctx.reply('Изменить график работы');
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
        isSelfEmployed: false
    };
    ctx.scene.session.registrationForm = registrationForm;
    const messageText = 'Давайте вместе устроимся на работу?!!!';
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
const checkSelfEmployment = async (ctx) => {
    var _a;
    if (((_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.data) === 'start_registration') {
        const messageText = 'Вы являетесь самозанятым?';
        const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
            [
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да', 'self_employed_yes'),
                telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет', 'self_employed_no')
            ]
        ]);
        await ctx.editMessageText(messageText, keyboard);
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
    await ctx.reply('Отправьте пожалуйста фото сертификата');
    return ctx.wizard.next();
});
handleEducationCert.action('education_cert_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasEducationCert = false;
    return handleFinalStep(ctx);
});
// Handle education certificate photo
const handleEducationCertPhoto = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleEducationCertPhoto.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    ctx.scene.session.registrationForm.educationCertPhoto = photo.file_id;
    return handleFinalStep(ctx);
});
// Создаем улучшенное хранилище для групп документов
const documentGroups = new Map();
// Функция логирования
function logDebug(message, data) {
    console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}
const handleSignedDocuments = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleSignedDocuments.on('document', async (ctx) => {
    var _a;
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
    const fileName = (_a = document.file_name) === null || _a === void 0 ? void 0 : _a.toLowerCase();
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
            await ctx.reply('Спасибо! Документы успешно получены. В ближайшее время мы проверим их и сообщим вам о результатах.');
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
    var _a;
    await ctx.reply('Отлично, мы подготовим документы и отправим вам их сюда.');
    try {
        console.log('Attempting to submit registration with data:', ctx.scene.session.registrationForm);
        const registrationResponse = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].submitRegistration(ctx.scene.session.registrationForm);
        console.log('Registration submitted successfully:', registrationResponse);
        const registrationId = registrationResponse.data.id;
        ctx.scene.session.documentUpload = {
            documents: [],
            registrationId: registrationId
        };
        if (!registrationId) {
            throw new Error('Registration ID not found in response');
        }
        const zipBuffer = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].generateContract({
            id: registrationId
        });
        await ctx.replyWithDocument({
            source: zipBuffer,
            filename: `Документы_${registrationResponse.data.contract_number}.zip`
        });
        const instructions = `
Пожалуйста, внимательно прочитайте инструкцию!!!

1. Распакуйте полученный архив
2. Подпишите все документы
3. Отправьте ВСЕ подписанные документы ОДНИМ СООБЩЕНИЕМ в этот чат

❗️ Важные требования:
- Отправьте все документы одним сообщением (можно выбрать несколько файлов)
- Принимаются файлы в форматах PDF или DOCX
- Убедитесь, что все документы хорошо читаемы
- Проверьте наличие всех подписей перед отправкой

Чтобы отправить несколько файлов одним сообщением:
📱 В мобильном приложении:
1. Нажмите на скрепку
2. Выберите "Файл"
3. Нажмите на три точки в правом верхнем углу
4. Выберите все нужные документы
5. Нажмите "Отправить"

💻 В десктопной версии:
1. Нажмите на скрепку
2. Зажмите Ctrl и выберите все нужные файлы
3. Нажмите "Открыть"`;
        await ctx.reply(instructions, { parse_mode: 'HTML' });
        return ctx.wizard.next();
    }
    catch (error) {
        console.error('Error in handleFinalStep:', error);
        let errorMessage = 'Произошла ошибка при обработке данных. ';
        if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 422) {
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
// Create and export the wizard scene
const registrationWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('registration_wizard', showWelcome, checkSelfEmployment, handleSelfEmployment, handleFullName, handleBirthDate, handlePassport, handleIssuedBy, handleIssueDate, handleDivisionCode, handleAddress, handleInn, handleAccountNumber, handleBankName, handleBik, handleCorrAccount, handleBankInn, handleBankKpp, handlePhone, handleEmail, handleMedBook, handleMedBookExpiry, handleEducationCert, handleEducationCertPhoto, handleSignedDocuments);


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

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");

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