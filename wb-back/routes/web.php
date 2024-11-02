<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\TelegramController;
use App\Http\Controllers\TelegramControllerSupplies;

Route::get('/', function () {
    return "Hey there!";
});

Route::middleware(['telegram.auth'])->group(function () {
    Route::post('/webhook/telegram/feedback', [TelegramController::class, 'handleWebhook']);
    Route::post('/webhook/telegram/supplies', [TelegramControllerSupplies::class, 'handleWebhookSupplies']);
});


Route::get('/payment/return', [PaymentController::class, 'paymentReturn'])->name('payment.return');
Route::post('/webhook/payment/success', [PaymentController::class, 'paymentSuccess'])->name('payment.success');




Route::get('/payment_link/{telegramId}/{tariff}', [PaymentController::class, 'getPaymentLink']);



Route::get('/replace-doc-variables', [GoogleDocsController::class, 'replaceVariablesInDoc']);
