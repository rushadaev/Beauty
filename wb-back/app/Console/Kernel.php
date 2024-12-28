<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;
use App\Jobs\CheckWarehouseNotificationsJob;
use Throwable;
use App\Console\Commands\CheckWarehouseNotifications;

class Kernel extends ConsoleKernel
{

    public function boot()
{
    \Log::info('>>> Kernel boot started, I am here!');
    parent::boot();
}
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        Log::info('Регистрация запланированных задач');
        Log::info('Starting schedule registration', [
            'time' => now()->toDateTimeString(),
            'timezone' => config('app.timezone')
        ]);

        // Ежечасная синхронизация филиалов
        $schedule->command('app:fetch-branches-info')
            ->hourly()
            ->withoutOverlapping(60)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/branches-sync.log'))
            ->before(function () {
                Log::info('Starting hourly branch sync', ['time' => now()->toDateTimeString()]);
            })
            ->onSuccess(function () {
                Log::info('Hourly branch synchronization completed successfully');
            })
            ->onFailure(function () {
                Log::error('Hourly branch synchronization failed');
            });

        // Полная синхронизация раз в день рано утром
        $schedule->command('app:fetch-branches-info --full')
            ->dailyAt('03:00')
            ->withoutOverlapping(120)
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/branches-sync-daily.log'))
            ->before(function () {
                Log::info('Starting daily full branch sync', ['time' => now()->toDateTimeString()]);
            })
            ->onSuccess(function () {
                Log::info('Daily full branch synchronization completed successfully');
            })
            ->onFailure(function () {
                Log::error('Daily full branch synchronization failed');
            });

            $schedule->command('sync:employees')
    ->everyTenMinutes()
    ->withoutOverlapping(5)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/employees-sync.log'))
    ->before(function () {
        Log::info('Starting employees sync', [
            'time' => now()->toDateTimeString()
        ]);
    })
    ->onSuccess(function () {
        Log::info('Employees sync completed successfully');
    })
    ->onFailure(function (Throwable $e) {
        Log::error('Employees sync failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    });

        // Очистка старых логов синхронизации
        $schedule->command('app:cleanup-sync-logs --older-than=30')
            ->weekly()
            ->sundays()
            ->at('00:00')
            ->runInBackground()
            ->before(function () {
                Log::info('Starting cleanup of old sync logs');
            });
            
            Log::info('Регистрация warehouse notification task', [
                'time' => now()->toDateTimeString(),
                'command' => 'app:check-warehouse'
            ]);

            $schedule->call(function () {
                \File::append(storage_path('logs/test.log'), 'Cron работает! ' . now() . "\n");
            })->everyMinute();
        

            $schedule->command('app:check-fraud')
    ->everyThreeMinutes()
    ->withoutOverlapping(5)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/fraud-detection.log'))
    ->before(function () {
        Log::info('Starting fraud detection check', [
            'time' => now()->toDateTimeString()
        ]);
    })
    ->onSuccess(function () {
        Log::info('Fraud detection completed successfully');
    })
    ->onFailure(function (Throwable $e) {
        Log::error('Fraud detection failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    });

        // Проверка склада каждую минуту
        $schedule->command('app:check-warehouse')
        ->everyMinute()
        ->withoutOverlapping(5)
        ->runInBackground()
        ->appendOutputTo(storage_path('logs/warehouse-notifications.log'))
        ->before(function () {
            Log::info('Warehouse check starting from scheduler', [
                'time' => now()->toDateTimeString(),
                'memory' => memory_get_usage(true),
                'pid' => getmypid()
            ]);
        })
        ->after(function () {
            Log::info('Warehouse check completed from scheduler', [
                'time' => now()->toDateTimeString(),
                'memory' => memory_get_usage(true),
                'pid' => getmypid()
            ]);
        })
        ->onSuccess(function () {
            Log::info('Warehouse check successful from scheduler');
            // Пробуем запустить команду напрямую для проверки
            \Illuminate\Support\Facades\Artisan::call('app:check-warehouse', [], new \Symfony\Component\Console\Output\BufferedOutput());
        })
        ->onFailure(function (Throwable $e) {
            Log::error('Warehouse check failed from scheduler', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'time' => now()->toDateTimeString()
            ]);
        });

        $schedule->command('app:check-notifications')
    ->everyMinute()
    ->withoutOverlapping(5)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/admin-notifications.log'))
    ->before(function () {
        Log::info('Admin notifications check starting', [
            'time' => now()->toDateTimeString(),
            'memory' => memory_get_usage(true),
            'pid' => getmypid()
        ]);
    })
    ->after(function () {
        Log::info('Admin notifications check completed', [
            'time' => now()->toDateTimeString()
        ]);
    })
    ->onSuccess(function () {
        Log::info('Admin notifications check successful');
    })
    ->onFailure(function (Throwable $e) {
        Log::error('Admin notifications check failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    });

    Log::info('Регистрация запланированных задач завершена', [
        'registered_tasks' => collect($schedule->events())->map(function ($event) {
            return [
                'command' => $event->command,
                'expression' => $event->expression,
                'next_run' => $event->nextRunDate()->toDateTimeString(),
                'timezone' => $event->timezone
            ];
        })->toArray()
    ]);
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

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