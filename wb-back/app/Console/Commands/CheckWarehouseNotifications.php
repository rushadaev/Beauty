<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\CheckWarehouseNotificationsJob;
use App\Services\YclientsService;
use App\Services\TelegramService;
use Illuminate\Support\Facades\Log;
use Exception;

class CheckWarehouseNotifications extends Command
{
    protected $signature = 'app:check-warehouse';
    protected $description = 'Check warehouse notifications';

    private YclientsService $yclientsService;
    private TelegramService $telegramService;

    public function __construct(
        YclientsService $yclientsService,
        TelegramService $telegramService
    ) {
        parent::__construct();
        $this->yclientsService = $yclientsService;
        $this->telegramService = $telegramService;
    }

    public function handle()
    {
        Log::info('Starting warehouse notifications check command', [
            'time' => now()->toDateTimeString(),
            'memory' => memory_get_usage(true),
            'pid' => getmypid(),
        ]);
        
        try {
            $activeNotifications = \App\Models\WarehouseNotification::active()->count();
            Log::info('Found active notifications', ['count' => $activeNotifications]);

            if ($activeNotifications > 0) {
                // Создаем и сразу выполняем job
                $job = new CheckWarehouseNotificationsJob();
                $job->handle($this->yclientsService, $this->telegramService);
                
                Log::info('Warehouse notifications processed directly');
            } else {
                Log::info('No active notifications found');
            }

            $this->info('Warehouse notifications check completed');
            return Command::SUCCESS;
            
        } catch (Exception $e) {
            Log::error('Warehouse check command failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->error('Warehouse notifications check failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}