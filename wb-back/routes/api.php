<?php

use App\Http\Controllers\TaskController;
use App\Http\Controllers\WildberriesController;
use App\Http\Controllers\YclientsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SalaryExportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\Api\V1\EmployeeRegistrationController;
use App\Http\Controllers\Api\V1\ContractGeneratorController;

Route::get('/test-config', function () {
    return [
        'env_direct' => env('TELEGRAM_BOT_TOKEN_MASTER'),
        'config_value' => config('telegram.bot_token_master'),
        'all_telegram_config' => config('telegram')
    ];
});

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

Route::post('/auth/admin', [UserController::class, 'authAdmin']);

Route::post('auth/logout', [UserController::class, 'logout']);

Route::post('masters/update-description', [UserController::class, 'updateDescription']);

Route::get('test', function() {
    return response()->json(['status' => 'ok']);
});

Route::post('employee-registrations', [\App\Http\Controllers\Api\V1\EmployeeRegistrationController::class, 'store']);

Route::prefix('employee-registrations')->group(function () {
    Route::get('/', [EmployeeRegistrationController::class, 'getPendingRegistrations']); // Добавляем этот маршрут
    Route::get('/pending', [EmployeeRegistrationController::class, 'getPendingRegistrations']);
    Route::get('/{id}', [EmployeeRegistrationController::class, 'show']);
    Route::post('/{id}/approve', [EmployeeRegistrationController::class, 'approve']);
    Route::post('/{id}/reject', [EmployeeRegistrationController::class, 'reject']);
    Route::get('/{id}/documents', [EmployeeRegistrationController::class, 'getDocuments']);
});

Route::post('employee-registrations/generate-contract', [\App\Http\Controllers\Api\V1\ContractGeneratorController::class, 'generate']);

// routes/api.php
Route::post('employee-registrations/{id}/upload-signed-documents', [\App\Http\Controllers\Api\V1\EmployeeRegistrationController::class, 'uploadSignedDocuments']);

Route::get('/employee-registrations/{id}/education-certificate', 'EmployeeRegistrationController@getEducationCertificate');

// Маршруты для работы с расписанием
Route::get('/schedule', [UserController::class, 'getSchedule']);
Route::put('/schedule', [UserController::class, 'updateSchedule']);
Route::get('/schedule/check-availability', [UserController::class, 'checkScheduleAvailability']);

Route::post('/masters/update-photo', [UserController::class, 'updatePhoto']);

Route::get('/staff/filial', [UserController::class, 'getFilialStaff']);

// routes/api.php
Route::post('/records/master', [UserController::class, 'getMasterRecords']);
Route::post('/records/master/details', [UserController::class, 'getMasterRecordDetails']);
Route::post('/records/master/cancel', [UserController::class, 'cancelMasterRecord']);
Route::post('/records/master/update', [UserController::class, 'updateMasterRecord']);
Route::post('/services/master', [UserController::class, 'getMasterServices']);

// routes/api.php
Route::get('/companies', [UserController::class, 'getCompanies']);

Route::get('/products/{companyId}', [UserController::class, 'getProducts']);

Route::prefix('warehouse-notifications')->group(function () {
    Route::post('/', [UserController::class, 'createWarehouseNotification']);
    Route::get('/', [UserController::class, 'getWarehouseNotifications']);
    Route::get('/{id}', [UserController::class, 'getWarehouseNotification']); // Добавляем этот маршрут
    Route::put('/{id}', [UserController::class, 'updateWarehouseNotification']);
    Route::delete('/{id}', [UserController::class, 'deleteWarehouseNotification']);
});

Route::prefix('admin-notifications')->group(function () {
    Route::post('/', [UserController::class, 'createAdminNotification']);
    Route::get('/', [UserController::class, 'getAdminNotifications']);
    Route::get('/{id}', [UserController::class, 'getAdminNotification']);
    Route::put('/{id}', [UserController::class, 'updateAdminNotification']);
    Route::delete('/{id}', [UserController::class, 'deleteAdminNotification']);
    Route::patch('/{notification}/reschedule', [UserController::class, 'rescheduleNotification']); // Добавляем новый маршрут
});

Route::prefix('admin-tasks')->group(function () {
    Route::post('/', [UserController::class, 'createAdminTask']);
    Route::get('/', [UserController::class, 'getAdminTasks']);
    Route::get('/{id}', [UserController::class, 'getAdminTask']);
    Route::put('/{id}', [UserController::class, 'updateAdminTask']);
    Route::delete('/{id}', [UserController::class, 'deleteAdminTask']);
    Route::post('/{id}/complete', [UserController::class, 'completeAdminTask']);
    Route::put('/{id}/status', [UserController::class, 'updateAdminTaskStatus']);
});

Route::post('/masters/info', [UserController::class, 'getMasterByPhone']);

Route::post('masters/get-photo', [UserController::class, 'getMasterPhoto']);

Route::post('admin-notifications/send', [UserController::class, 'sendAdminNotification']);
Route::post('admin-notifications/employment', [UserController::class, 'sendEmploymentNotification']);

Route::get('/branches/{branchId}/yclients-id', [UserController::class, 'getYclientsId']);

Route::post('employee-registrations/{id}/send-invite', [EmployeeRegistrationController::class, 'sendInvite']);
Route::post('employee-registrations/{id}/create-staff-after-invite', [EmployeeRegistrationController::class, 'createStaffAfterInvite']);
Route::get('/master/documents/{phone}', [EmployeeRegistrationController::class, 'getMasterDocumentsByPhone']);

Route::get('/salary/master', [UserController::class, 'getMasterSalary']);

Route::get('/salary/export', [SalaryExportController::class, 'exportPayroll']);