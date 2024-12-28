<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\CheckAdminNotificationsJob;
use App\Services\TelegramService;
use Illuminate\Support\Facades\Log;
use Exception;

class CheckAdminNotifications extends Command
{
    protected $signature = 'app:check-notifications';
    protected $description = 'Check and send admin notifications';

    private TelegramService $telegramService;

    public function __construct(TelegramService $telegramService)
    {
        parent::__construct();
        $this->telegramService = $telegramService;
    }

    public function handle()
{
    try {
        Log::info('Starting admin notifications check command');
        
        // Логируем все активные уведомления
        $allNotifications = \App\Models\AdminNotification::active()->get();
        Log::info('All active notifications:', [
            'notifications' => $allNotifications->toArray()
        ]);

        // Используем scope due() из модели
        $dueNotifications = \App\Models\AdminNotification::active()
            ->due()
            ->get();
            
        Log::info('Due notifications details:', [
            'count' => $dueNotifications->count(),
            'notifications' => $dueNotifications->toArray(),
            'current_time' => now()->toDateTimeString(),
            'current_time_utc' => now()->utc()->toDateTimeString(),
            'timezone' => config('app.timezone')
        ]);

        if ($dueNotifications->isNotEmpty()) {
            Log::info('Processing notifications through job');
            $job = new CheckAdminNotificationsJob();
            $job->handle($this->telegramService);
            Log::info('Job completed');
        } else {
            Log::info('No notifications require processing');
        }

        return Command::SUCCESS;
        
    } catch (Exception $e) {
        Log::error('Command failed:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return Command::FAILURE;
    }
}
}