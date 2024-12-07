<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Ежечасная синхронизация филиалов
        $schedule->command('app:fetch-branches-info')
            ->hourly()
            ->withoutOverlapping(60) // Предотвращает перекрытие заданий, блокировка на 60 минут
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/branches-sync.log'))
            ->onSuccess(function () {
                Log::info('Hourly branch synchronization completed successfully');
            })
            ->onFailure(function () {
                Log::error('Hourly branch synchronization failed');
            });

        // Полная синхронизация раз в день рано утром
        $schedule->command('app:fetch-branches-info --full')
            ->dailyAt('03:00')
            ->withoutOverlapping(120) // Больше времени для полной синхронизации
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/branches-sync-daily.log'))
            ->emailOutputOnFailure(config('mail.admin_email'))
            ->onSuccess(function () {
                Log::info('Daily full branch synchronization completed successfully');
            })
            ->onFailure(function () {
                Log::error('Daily full branch synchronization failed');
            });

        // Очистка старых логов синхронизации
        $schedule->command('app:cleanup-sync-logs --older-than=30')
            ->weekly()
            ->sundays()
            ->at('00:00')
            ->runInBackground();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        $this->command(\App\Console\Commands\SyncEmployeesCommand::class);

        require base_path('routes/console.php');
    }

    /**
     * Get the timezone that should be used by default for scheduled events.
     */
    protected function scheduleTimezone(): string
    {
        return config('app.timezone', 'Europe/Moscow');
    }

    
}