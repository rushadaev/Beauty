<?php

use App\Http\Controllers\TaskController;
use App\Http\Controllers\WildberriesController;
use App\Http\Controllers\YclientsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;

Route::get('/wildberries/questions', [WildberriesController::class, 'getQuestions']);

 // const response = await axios.get(`${process.env.LARAVEL_API_URL}/api/users/telegram/${telegramId}`);
Route::get('/users/telegram/{telegramId}', [UserController::class, 'getUserByTelegramId']);

Route::post('/cabinets/telegram/{telegramId}', [UserController::class, 'createCabinet']);
Route::delete('/cabinets/telegram/{telegramId}/{cabinetId}', [UserController::class, 'deleteCabinet']);
Route::put('/cabinets/telegram/{telegramId}/{cabinetId}', [UserController::class, 'updateCabinet']);

Route::get('/notifications/telegram/{telegramId}', [NotificationController::class, 'getNotifications']);
Route::post('/notifications/telegram/{telegramId}', [NotificationController::class, 'createNotification']);
Route::put('/notifications/telegram/update/{notificationId}', [NotificationController::class, 'updateNotification']);
Route::delete('/notifications/telegram/{notificationId}', [NotificationController::class, 'deleteNotification']);

Route::get('/coefficients', [WildberriesController::class, 'getCoefficients']);
Route::get('/warehouses', [WildberriesController::class, 'getWarehouses']);


Route::get('/payment_link/{telegramId}/{tariff}', [PaymentController::class, 'getPaymentLink']);

Route::get('/yclients/goods/{telegramId}', [YclientsController::class, 'getGoods']);
Route::get('/yclients/companies', [YclientsController::class, 'getCompanies']);
Route::get('/yclients/my_company/{telegramId}', [YclientsController::class, 'getMyCompany']);

Route::resource('tasks', TaskController::class);


#/tasks/close/{id}
Route::put('/tasks/close/{id}', [TaskController::class, 'closeTask']);


Route::get('/staff', [UserController::class, 'getStaff']);


Route::post('/auth', [UserController::class, 'auth']);

