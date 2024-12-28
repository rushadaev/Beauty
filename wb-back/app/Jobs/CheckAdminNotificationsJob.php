<?php

namespace App\Jobs;

use App\Models\AdminNotification;
use App\Models\AdminNotificationLog;
use App\Services\TelegramService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup; 

class CheckAdminNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private TelegramService $telegramService;

    public function __construct()
    {
        //
    }

    public function handle(TelegramService $telegramService)
    {
        $this->telegramService = $telegramService;
    
        try {
            Log::info('Starting notifications job execution');
    
            $notifications = AdminNotification::active()
                ->due()
                ->get();
                
            Log::info('Found notifications in job:', [
                'count' => $notifications->count(),
                'notifications' => $notifications->toArray()
            ]);
    
            if ($notifications->isEmpty()) {
                Log::info('No notifications to process in job');
                return;
            }
    
            $groupedNotifications = $notifications->groupBy('telegram_id');
    
            foreach ($groupedNotifications as $telegramId => $userNotifications) {
                Log::info('Processing notifications for user:', [
                    'telegram_id' => $telegramId,
                    'notifications_count' => $userNotifications->count()
                ]);
                $this->processUserNotifications($telegramId, $userNotifications);
            }
    
        } catch (\Exception $e) {
            Log::error('Job failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }


    private function processUserNotifications($telegramId, $notifications)
    {
        if ($notifications->isEmpty()) {
            return;
        }
    
        foreach ($notifications as $notification) {
            $message = sprintf(
                "🔔 Напоминание:\n\n📝 %s\n%s%s",
                $notification->name,
                $notification->sum ? "💰 Сумма: {$notification->sum} руб.\n" : '',
                $notification->type === 'recurring' ? "🔄 Периодическое" : "⚡️ Разовое"
            );
    
            try {
                // Если уведомление разовое, добавляем кнопку
                $keyboard = null;
                if ($notification->type === 'single') {
                    $keyboard = new InlineKeyboardMarkup([[
                        ['text' => '⏰ Напомнить позже', 'callback_data' => "remind_later_{$notification->id}"]
                    ]]);
                }
    
                // Обновляем статус
                $notification->update([
                    'last_notification_sent_at' => now(),
                    'is_active' => $notification->type === 'recurring'
                ]);
    
                $sent = $this->telegramService->sendMessage(
                    $telegramId, 
                    $message,
                    'HTML',
                    true,
                    null,
                    $keyboard
                );
    
                Log::info('Sent notification message:', [
                    'notification_id' => $notification->id,
                    'telegram_id' => $telegramId,
                    'success' => $sent
                ]);
    
            } catch (\Exception $e) {
                Log::error('Failed to process notification:', [
                    'id' => $notification->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }
}