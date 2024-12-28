<?php

namespace App\Jobs;

use App\Models\WarehouseNotification;
use App\Models\NotificationLog;
use App\Services\YclientsService;
use App\Services\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckWarehouseNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private YclientsService $yclientsService;
    private TelegramService $telegramService;

    public function __construct()
    {
        //
    }

    public function handle(YclientsService $yclientsService, TelegramService $telegramService)
    {
        $this->yclientsService = $yclientsService;
        $this->telegramService = $telegramService;

        try {
            Log::info('Starting warehouse notifications check');

            // Авторизация через админа
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $this->yclientsService->authenticateByCredentials(
                $adminLogin,
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                throw new \Exception('Failed to authenticate admin');
            }

            $this->yclientsService->setUserToken($authResult['token']);

            // Получаем все активные уведомления, сгруппированные по филиалам
            $notifications = WarehouseNotification::active()
                ->where(function ($query) {
                    $query->whereNull('last_notification_sent_at')
                        ->orWhere('last_notification_sent_at', '<=', now()->subHours(24));
                })
                ->get()
                ->groupBy('company_id');

            foreach ($notifications as $companyId => $companyNotifications) {
                $this->processCompanyNotifications($companyId, $companyNotifications);
            }

            Log::info('Warehouse notifications check completed');

        } catch (\Exception $e) {
            Log::error('Error in warehouse notifications job:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    private function processCompanyNotifications($companyId, $notifications)
    {
        try {
            // Получаем все товары филиала одним запросом
            $products = $this->yclientsService->getProducts($companyId);
            
            if (!$products) {
                throw new \Exception("Failed to get products for company {$companyId}");
            }

            // Группируем уведомления по пользователям
            $userNotifications = $notifications->groupBy('telegram_id');

            foreach ($userNotifications as $telegramId => $userNotifs) {
                $this->processUserNotifications($telegramId, $userNotifs, $products['data']);
            }

        } catch (\Exception $e) {
            Log::error('Error processing company notifications:', [
                'company_id' => $companyId,
                'error' => $e->getMessage()
            ]);
        }
    }

    private function processUserNotifications($telegramId, $notifications, $products)
    {
        $notificationsToSend = [];

        foreach ($notifications as $notification) {
            $product = collect($products)->firstWhere('good_id', $notification->product_id);
            
            if (!$product) {
                continue;
            }

            $currentAmount = $product['actual_amounts'][0]['amount'] ?? 0;

            if ($currentAmount <= $notification->min_amount) {
                $notificationsToSend[] = [
                    'notification' => $notification,
                    'product' => $product,
                    'current_amount' => $currentAmount
                ];
            }
        }

        if (!empty($notificationsToSend)) {
            $this->sendGroupedNotification($telegramId, $notificationsToSend);
        }
    }

    private function sendGroupedNotification($telegramId, $notifications)
{
    try {
        // Используем существующий TelegramService
        $telegramService = app(TelegramService::class);
        $success = $telegramService->sendWarehouseNotification($telegramId, $notifications);

        // Обновляем время последней отправки и логируем
        foreach ($notifications as $data) {
            $data['notification']->update([
                'last_notification_sent_at' => now(),
                'is_active' => false  // Добавляем это поле
            ]);

            NotificationLog::create([
                'notification_id' => $data['notification']->id,
                'current_amount' => $data['current_amount'],
                'sent_at' => now(),
                'status' => $success ? 'delivered' : 'error',
                'error_message' => !$success ? 'Failed to send Telegram message' : null
            ]);
        }

    } catch (\Exception $e) {
        Log::error('Error sending grouped notification:', [
            'telegram_id' => $telegramId,
            'error' => $e->getMessage()
        ]);
    }
}
}