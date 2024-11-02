<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Jobs\TelegramInspire;
use App\Jobs\CheckCoefficientChanges;
use App\Jobs\FetchWarehouseCoefficientsJob;
use App\Jobs\CheckSubscriptionExpiration;
use App\Jobs\SendFeedbacksToTelegramJob;
use App\Jobs\FetchFeedbacksJob;
use App\Models\Cabinet;
use App\Models\Notification;
use App\Models\User;



Artisan::command('warehouse_bot', function () {
   CheckCoefficientChanges::dispatch(config('telegram.bot_token_supplies'));
})->purpose('Fetch coefficients and check for changes')->everyMinute();



Artisan::command('warehouse_bot_check_subscription_expiration', function () {
   CheckSubscriptionExpiration::dispatch();
})->purpose('Check subscription expiration')->hourly();
