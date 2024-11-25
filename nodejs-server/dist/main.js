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


// Step 1: Initial menu display
const showMainMenu = async (ctx) => {
    const messageText = `Первый экран бота`;
    const mainMenuKeyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('трудоустройство', 'registration'),
        ],
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('авторизация', 'authorization'),
        ],
    ]);
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
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
    return ctx.wizard.next(); // Move to the next step
};
// Step 2: Handle registration action
const handleRegistration = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleRegistration.action('registration', async (ctx) => {
    const message = `Трудоустройство`;
    await ctx.scene.enter('registration_wizard');
    return;
});
// Step 3: Handle authorization (phone input)
const handleAuthorization = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAuthorization.action('authorization', async (ctx) => {
    const message = `Введите номер телефона для авторизации в личном кабинете:`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    await ctx.editMessageText(message, keyboard);
    return ctx.wizard.next(); // Move to the phone input step
});
const handlePhoneInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePhoneInput.on('text', async (ctx) => {
    const phone = ctx.message.text;
    ctx.scene.session.phone = phone;
    await ctx.reply('Введите пароль от личного кабинета:');
    return ctx.wizard.next();
});
const handlePasswordInput = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePasswordInput.on('text', async (ctx) => {
    const password = ctx.message.text;
    ctx.scene.session.password = password;
    try {
        const response = await _services_laravelService__WEBPACK_IMPORTED_MODULE_1__["default"].auth(ctx.scene.session.phone, ctx.scene.session.password, ctx.from.id);
        console.log('response', response);
    }
    catch (error) {
        await ctx.reply('Ошибка авторизации. Попробуйте еще раз');
        return ctx.scene.reenter();
    }
    await ctx.reply('Авторизация успешна!');
    return ctx.scene.leave();
});
const handleAction = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAction.use(handleRegistration);
handleAction.use(handleAuthorization);
// Define the wizard scene
const loginWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('login_wizard', showMainMenu, handleAction, handlePhoneInput, handlePasswordInput);


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

const mainScene = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.BaseScene('main');
// Define the enter handler
mainScene.enter(async (ctx) => {
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
mainScene.action('education', async (ctx) => {
    const message = `[модуль обучения]

ссылка на обучение`;
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('перейти к обучению', 'https://t.me/dmitrynovikov21')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('👌 Главное меню', 'mainmenu')],
    ]);
    await ctx.editMessageText(message, keyboard);
});
mainScene.action('documents', async (ctx) => {
    const message = `[Мои документы]

В кнопках выводим три документа из карточки мастера`;
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
    ctx.reply('Изменить описание');
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
    const messageText = 'Давайте вместе устроимся на работу?!';
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
    ctx.scene.session.registrationForm.isSelfEmployed = true;
    const messageText = 'Оформитесь как СМЗ и продолжите трудоустройство';
    const keyboard = telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.url('Оформиться', 'https://npd.nalog.ru/')],
        [telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Продолжить', 'continue_registration')]
    ]);
    await ctx.editMessageText(messageText, keyboard);
});
handleSelfEmployment.action('self_employed_yes', async (ctx) => {
    ctx.scene.session.registrationForm.isSelfEmployed = false;
    return requestFullName(ctx);
});
handleSelfEmployment.action('continue_registration', async (ctx) => {
    return requestFullName(ctx);
});
// Request full name
const requestFullName = async (ctx) => {
    await ctx.reply('Отлично, теперь нам необходимо получить ваши данные для составления договора.\nНапишите, пожалуйста, свое ФИО');
    return ctx.wizard.next();
};
// Handle full name input and subsequent steps
const handleFullName = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleFullName.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.fullName = ctx.message.text;
    await ctx.reply('Напишите, пожалуйста, дату рождения');
    return ctx.wizard.next();
});
// Continue with other handlers for each step...
const handleBirthDate = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBirthDate.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.birthDate = ctx.message.text;
    await ctx.reply('Паспорт: серия *номер *_');
    return ctx.wizard.next();
});
// Add handlers for all remaining steps...
const handlePassport = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePassport.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.passport = ctx.message.text;
    await ctx.reply('Выдан:');
    return ctx.wizard.next();
});
const handleIssuedBy = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleIssuedBy.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.issuedBy = ctx.message.text;
    await ctx.reply('Дата выдачи:');
    return ctx.wizard.next();
});
const handleIssueDate = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleIssueDate.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.issueDate = ctx.message.text;
    await ctx.reply('Код разделение:');
    return ctx.wizard.next();
});
const handleDivisionCode = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleDivisionCode.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.divisionCode = ctx.message.text;
    await ctx.reply('Адрес регистрации:');
    return ctx.wizard.next();
});
const handleAddress = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAddress.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.registrationAddress = ctx.message.text;
    await ctx.reply('ИНН:');
    return ctx.wizard.next();
});
const handleInn = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleInn.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.inn = ctx.message.text;
    await ctx.reply('Номер счета:');
    return ctx.wizard.next();
});
const handleAccountNumber = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleAccountNumber.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.accountNumber = ctx.message.text;
    await ctx.reply('Банк получателя:');
    return ctx.wizard.next();
});
const handleBankName = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBankName.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bankName = ctx.message.text;
    await ctx.reply('БИК:');
    return ctx.wizard.next();
});
const handleBik = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBik.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bik = ctx.message.text;
    await ctx.reply('Корр. счет:');
    return ctx.wizard.next();
});
const handleCorrAccount = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleCorrAccount.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.corrAccount = ctx.message.text;
    await ctx.reply('ИНН банка:');
    return ctx.wizard.next();
});
const handleBankInn = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBankInn.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bankInn = ctx.message.text;
    await ctx.reply('КПП банка:');
    return ctx.wizard.next();
});
const handleBankKpp = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleBankKpp.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.bankKpp = ctx.message.text;
    await ctx.reply('Ваш номер телефона:');
    return ctx.wizard.next();
});
const handlePhone = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handlePhone.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.phone = ctx.message.text;
    await ctx.reply('Ваша почта:');
    return ctx.wizard.next();
});
const handleEmail = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleEmail.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.email = ctx.message.text;
    await ctx.reply('У вас есть мед книжка?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да', 'med_book_yes'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет', 'med_book_no')
        ]
    ]));
    return ctx.wizard.next();
});
const handleMedBook = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleMedBook.action('med_book_yes', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = true;
    await ctx.reply('Когда она истекает?');
    return ctx.wizard.next();
});
handleMedBook.action('med_book_no', async (ctx) => {
    ctx.scene.session.registrationForm.hasMedBook = false;
    return handleEducationCertQuestion(ctx);
});
const handleMedBookExpiry = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleMedBookExpiry.on('text', async (ctx) => {
    ctx.scene.session.registrationForm.medBookExpiry = ctx.message.text;
    return handleEducationCertQuestion(ctx);
});
const handleEducationCertQuestion = async (ctx) => {
    await ctx.reply('У вас есть сертификат об образовании?', telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.inlineKeyboard([
        [
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Да', 'education_cert_yes'),
            telegraf__WEBPACK_IMPORTED_MODULE_0__.Markup.button.callback('Нет', 'education_cert_no')
        ]
    ]));
    return ctx.wizard.next();
};
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
const handleEducationCertPhoto = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Composer();
handleEducationCertPhoto.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    ctx.scene.session.registrationForm.educationCertPhoto = photo.file_id;
    return handleFinalStep(ctx);
});
const handleFinalStep = async (ctx) => {
    await ctx.reply('Отлично, мы подготовим договор и отправим вам его сюда.');
    console.log(ctx.scene.session.registrationForm);
    // Here you can add code to send the collected data to your backend
    // try {
    //     await laravelService.submitRegistration(ctx.scene.session);
    // } catch (error) {
    //     await ctx.reply('Произошла ошибка при отправке данных. Пожалуйста, попробуйте позже.');
    // }
    return ctx.scene.leave();
};
// Create the wizard scene with all steps
const registrationWizard = new telegraf__WEBPACK_IMPORTED_MODULE_0__.Scenes.WizardScene('registration_wizard', showWelcome, checkSelfEmployment, handleSelfEmployment, handleFullName, handleBirthDate, handlePassport, handleIssuedBy, handleIssueDate, handleDivisionCode, handleAddress, handleInn, handleAccountNumber, handleBankName, handleBik, handleCorrAccount, handleBankInn, handleBankKpp, handlePhone, handleEmail, handleMedBook, handleMedBookExpiry, handleEducationCert, handleEducationCertPhoto);


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
app.use(_telegraf_controllers_telegramBotMasterController__WEBPACK_IMPORTED_MODULE_9__["default"].webhookCallback('/webhook/telegram-master'));
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