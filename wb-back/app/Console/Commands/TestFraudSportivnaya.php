<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\YclientsService;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TestFraudSportivnaya extends Command
{
    protected $signature = 'app:test-fraud-sportivnaya {phone?}';
    protected $description = 'Test fraud detection specifically for Sportivnaya branch';

    private const BRANCH_ID = 490462; // ID филиала Спортивная

    public function handle(YclientsService $yclientsService, TelegramService $telegramService)
    {
        $phone = $this->argument('phone') ?? '+79059924787';
        
        $this->info('Starting fraud detection test for Sportivnaya branch');
        $this->info("Testing phone number: {$phone}");

        try {
            // 1. Авторизация
            $this->info('Authenticating...');
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $yclientsService->authenticateByCredentials(
                $adminLogin,
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                $this->error('Authentication failed!');
                $this->table(['Key', 'Value'], collect($authResult)->map(function ($value, $key) {
                    return [$key, is_string($value) ? $value : json_encode($value)];
                })->toArray());
                return 1;
            }

            $this->info('Authentication successful');
            $yclientsService->setUserToken($authResult['token']);

            // 2. Получение записей
            $startDate = Carbon::now()->startOfDay();
            $endDate = Carbon::now()->addDays(14)->endOfDay();

            $this->info('Fetching records...');
            $this->info("Date range: {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");

            $records = $yclientsService->getRecords(self::BRANCH_ID, [
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d')
            ]);

            if (empty($records)) {
                $this->warn('No records found in date range!');
                return 1;
            }

            $this->info('Found ' . count($records) . ' total records');

            // 3. Детальный анализ записей
            $this->info('Analyzing records...');
            
            $targetRecords = [];
            $recordsTable = [];

            foreach ($records as $record) {
                try {
                    $details = $yclientsService->getRecord(self::BRANCH_ID, $record['id']);
                    
                    if (isset($details['client']['phone']) && $details['client']['phone'] === $phone) {
                        $targetRecords[] = $details;
                        
                        $recordsTable[] = [
                            'id' => $details['id'],
                            'date' => Carbon::parse($details['date'])->format('Y-m-d H:i'),
                            'client_name' => $details['client']['name'] ?? 'N/A',
                            'services' => implode(', ', array_map(function($service) {
                                return $service['title'];
                            }, $details['services'])),
                            'status' => $details['status'] ?? 'N/A'
                        ];
                    }
                    
                    usleep(100000); // 100ms pause between requests
                } catch (\Exception $e) {
                    $this->error("Error fetching record {$record['id']}: " . $e->getMessage());
                }
            }

            $this->info("\nFound " . count($targetRecords) . " records for phone {$phone}:");
            $this->table(
                ['ID', 'Date/Time', 'Client Name', 'Services', 'Status'],
                $recordsTable
            );

            // 4. Анализ на фрод
            $this->info("\nAnalyzing for fraud patterns...");

            // Группировка по дням
            $recordsByDay = [];
            foreach ($targetRecords as $record) {
                $date = Carbon::parse($record['date'])->format('Y-m-d');
                if (!isset($recordsByDay[$date])) {
                    $recordsByDay[$date] = [];
                }
                $recordsByDay[$date][] = $record;
            }

            // Проверка паттернов фрода
            foreach ($recordsByDay as $date => $dayRecords) {
                $this->info("\nAnalyzing date: {$date}");
                $this->info("Records count: " . count($dayRecords));

                if (count($dayRecords) >= 2) {
                    $this->warn("⚠️ Found multiple bookings on same day: " . count($dayRecords));
                    
                    // Проверка последовательных часов
                    $hours = array_map(function($record) {
                        return Carbon::parse($record['date'])->format('H');
                    }, $dayRecords);
                    sort($hours);
                    
                    for ($i = 0; $i < count($hours) - 1; $i++) {
                        if ($hours[$i + 1] - $hours[$i] === 1) {
                            $this->warn("⚠️ Found consecutive hour bookings: {$hours[$i]}:00 and {$hours[$i + 1]}:00");
                        }
                    }

                    // Проверка одинаковых услуг
                    $serviceIds = [];
                    foreach ($dayRecords as $record) {
                        foreach ($record['services'] as $service) {
                            $serviceIds[] = $service['id'];
                        }
                    }
                    $duplicateServices = array_filter(array_count_values($serviceIds), function($count) {
                        return $count > 1;
                    });
                    
                    if (!empty($duplicateServices)) {
                        $this->warn("⚠️ Found duplicate services in day's bookings");
                    }
                }
            }

            if (count($targetRecords) >= 3) {
                $this->warn("\n🚨 This should trigger fraud detection!");
                $this->info("If you haven't received a Telegram notification, there might be an issue with:");
                $this->info("1. Telegram notification sending");
                $this->info("2. Queue processing");
                $this->info("3. Fraud detection thresholds");
            } else {
                $this->info("\nNot enough records to trigger fraud detection");
            }

        } catch (\Exception $e) {
            $this->error('Error during testing: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }

        return 0;
    }
}