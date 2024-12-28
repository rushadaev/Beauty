<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\FraudDetectionJob;
use App\Models\Branch;
use Illuminate\Support\Facades\Queue; // Добавляем импорт
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class CheckFraud extends Command
{
    protected $signature = 'app:check-fraud {--force}';
    protected $description = 'Check for fraudulent booking patterns';

    public function handle()
    {
        try {
            Log::info('Starting fraud detection check');

            if (!$this->option('force')) {
                $this->info('Clearing existing fraud detection queue...');
                
                // Очищаем очередь через Redis
                Redis::connection()->del('queues:fraud-detection');
                
                Log::info('Fraud detection queue cleared');
            }

            // Получаем активные филиалы из базы данных
            $branches = Branch::query()
                ->where('is_active', true)
                ->whereNotNull('yclients_id')
                ->select(['yclients_id', 'name'])
                ->get();

            if ($branches->isEmpty()) {
                Log::warning('No active branches found for fraud detection');
                return Command::FAILURE;
            }

            // Устанавливаем более широкий временной диапазон
            $startDate = Carbon::now()->startOfDay()->format('Y-m-d'); // начало текущего дня
            $endDate = Carbon::now()->addDays(14)->endOfDay()->format('Y-m-d'); // две недели вперёд

            Log::info('Found branches for checking:', [
                'count' => $branches->count(),
                'branches' => $branches->pluck('name', 'yclients_id')->toArray(),
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ]
            ]);

            // Запускаем проверку для каждого филиала
            foreach ($branches as $index => $branch) {
                FraudDetectionJob::dispatch(
                    $branch->yclients_id,
                    $startDate,
                    $endDate
                )->onQueue('fraud-detection')
                ->delay(now()->addSeconds($index * 5));
                
                Log::info('Dispatched fraud check job for branch', [
                    'branch_id' => $branch->yclients_id,
                    'branch_name' => $branch->name,
                    'delay' => $index * 5 . ' seconds'
                ]);

                // Небольшая пауза между отправками
                usleep(500000); // 0.5 секунды
            }

            return Command::SUCCESS;

        } catch (Exception $e) {
            Log::error('Fraud detection command failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
}