<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB; // Добавляем правильный импорт
use App\Services\YclientsService;
use App\Services\TelegramService;
use App\Models\Branch;
use Carbon\Carbon;

class FraudDetectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private $branchId;
    private $startDate;
    private $endDate;
    
    public $timeout = 300;
    public $tries = 3;
    public $maxExceptions = 3;
    

    // Константы для настройки правил фрода
    private const MIN_RECORDS_PER_DAY = 2;
    private const SUSPICIOUS_HOURS_SEQUENCE = 2;
    private const RATE_LIMIT_DELAY = 1000000; // 1 секунда в микросекундах
    private const MAX_RETRIES_ON_RATE_LIMIT = 3;

    public function __construct(int $branchId, string $startDate, string $endDate)
    {
        $this->branchId = $branchId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;

        $this->onQueue('fraud-detection');
    }

    public function handle(YclientsService $yclientsService, TelegramService $telegramService)
    {
        try {
            Log::info('🚀 FraudDetectionJob: Starting job', [
                'branch_id' => $this->branchId,
                'start_date' => $this->startDate,
                'end_date' => $this->endDate,
                'job_id' => $this->job->getJobId()
            ]);

            // 1. Авторизация
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $yclientsService->authenticateByCredentials(
                $adminLogin,
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                Log::error('❌ FraudDetectionJob: Authentication failed', [
                    'auth_result' => $authResult
                ]);
                return;
            }

            $yclientsService->setUserToken($authResult['token']);
            Log::info('✅ FraudDetectionJob: Authentication successful');

            // 2. Получение записей
            $records = $yclientsService->getRecords($this->branchId, [
                'start_date' => $this->startDate,
                'end_date' => $this->endDate
            ]);

            if (empty($records)) {
                Log::info('ℹ️ FraudDetectionJob: No records found');
                return;
            }

            Log::info('📊 FraudDetectionJob: Records fetched', [
                'total_records' => count($records)
            ]);

            // 3. Сбор детальной информации
            $detailedRecords = [];
            $processedCount = 0;
            $totalRecords = count($records);

            foreach ($records as $record) {
                $processedCount++;
                
                try {
                    Log::debug('🔄 Processing record', [
                        'record_id' => $record['id'],
                        'progress' => "{$processedCount}/{$totalRecords}"
                    ]);

                    $recordDetails = $this->getRecordWithRetry($yclientsService, $record['id']);
                    
                    if ($recordDetails && isset($recordDetails['client']['phone'])) {
                        $detailedRecords[] = $recordDetails;
                    }

                } catch (\Exception $e) {
                    Log::error('❌ Error getting record details', [
                        'record_id' => $record['id'],
                        'error' => $e->getMessage(),
                        'progress' => "{$processedCount}/{$totalRecords}"
                    ]);
                    continue;
                }
            }

            // 4. Группировка по телефону
            $groupedByPhone = [];
            foreach ($detailedRecords as $record) {
                $phone = $record['client']['phone'];
                if (!isset($groupedByPhone[$phone])) {
                    $groupedByPhone[$phone] = [];
                }
                $groupedByPhone[$phone][] = $record;
            }

            Log::info('👥 FraudDetectionJob: Grouped by phone', [
                'total_phones' => count($groupedByPhone),
                'records_processed' => count($detailedRecords)
            ]);

            // 5. Анализ записей по каждому телефону
            foreach ($groupedByPhone as $phone => $clientRecords) {
                $this->analyzeClientRecords($phone, $clientRecords, $telegramService);
            }

            Log::info('✅ FraudDetectionJob: Job completed successfully');

        } catch (\Exception $e) {
            Log::error('❌ FraudDetectionJob: Error in job execution', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function getRecordWithRetry(YclientsService $yclientsService, $recordId, $attempt = 1)
    {
        try {
            // Добавляем задержку перед каждым запросом
            usleep(self::RATE_LIMIT_DELAY);
            
            $recordDetails = $yclientsService->getRecord($this->branchId, $recordId);
            return $recordDetails;
            
        } catch (\Exception $e) {
            // Проверяем, является ли это ошибкой rate limit
            if ($e instanceof RequestException && $e->response->status() === 429) {
                if ($attempt <= self::MAX_RETRIES_ON_RATE_LIMIT) {
                    Log::info('Rate limit hit, waiting before retry', [
                        'attempt' => $attempt,
                        'record_id' => $recordId
                    ]);
                    
                    // Увеличиваем задержку с каждой попыткой
                    sleep(pow(2, $attempt));
                    
                    return $this->getRecordWithRetry($yclientsService, $recordId, $attempt + 1);
                }
            }
            
            throw $e;
        }
    }

    private function analyzeClientRecords($phone, $records, $telegramService)
    {
        Log::info('🔍 Analyzing records for phone', [
            'phone' => $phone,
            'records_count' => count($records)
        ]);

        // Проверяем, нет ли уже необработанного фрода для этого телефона сегодня
        $existingFraud = DB::table('fraud_checks')
            ->where('client_phone', $phone)
            ->where('status', 'pending')
            ->whereDate('check_date', Carbon::today())
            ->first();

        if ($existingFraud) {
            Log::info('Skip: Unresolved fraud already exists for this phone today', [
                'phone' => $phone,
                'fraud_check_id' => $existingFraud->id
            ]);
            return;
        }

        // Сохраняем текущую логику группировки по дням
        $recordsByDay = [];
        foreach ($records as $record) {
            $date = Carbon::parse($record['date'])->format('Y-m-d');
            if (!isset($recordsByDay[$date])) {
                $recordsByDay[$date] = [];
            }
            $recordsByDay[$date][] = $record;
        }

        $suspiciousPatterns = [];
        $hasFraud = false;
        $severity = 'suspicious';
        $anomalyTypes = [];

        // Анализ по дням с определением уровня серьезности
        foreach ($recordsByDay as $date => $dayRecords) {
            usort($dayRecords, function($a, $b) {
                return Carbon::parse($a['date'])->timestamp - Carbon::parse($b['date'])->timestamp;
            });

            if (count($dayRecords) >= self::MIN_RECORDS_PER_DAY) {
                $suspiciousPatterns[] = "Множественные записи за день ({$date}): " . count($dayRecords);
                $anomalyTypes[] = 'multiple_bookings';
                $hasFraud = true;
                
                if (count($dayRecords) >= 4) {
                    $severity = 'critical';
                }
            }

            // Проверка последовательных часов
            for ($i = 0; $i < count($dayRecords) - 1; $i++) {
                $current = Carbon::parse($dayRecords[$i]['date']);
                $next = Carbon::parse($dayRecords[$i + 1]['date']);
                
                $hoursDiff = $next->diffInHours($current);
                
                if ($hoursDiff <= self::SUSPICIOUS_HOURS_SEQUENCE) {
                    $suspiciousPatterns[] = "Последовательные записи: {$current->format('H:i')} и {$next->format('H:i')}";
                    $anomalyTypes[] = 'consecutive_bookings';
                    $hasFraud = true;
                    
                    if ($hoursDiff <= 1) {
                        $severity = 'critical';
                    }
                }
            }

            // Проверка повторяющихся услуг
            $serviceIds = [];
            foreach ($dayRecords as $record) {
                foreach ($record['services'] as $service) {
                    $serviceIds[] = $service['id'];
                }
            }
            
            $serviceCounts = array_count_values($serviceIds);
            foreach ($serviceCounts as $serviceId => $count) {
                if ($count > 1) {
                    $hasFraud = true;
                    $serviceName = $dayRecords[0]['services'][array_search($serviceId, array_column($dayRecords[0]['services'], 'id'))]['title'];
                    $suspiciousPatterns[] = "Повторяющаяся услуга: {$serviceName} ({$count} раз)";
                    $anomalyTypes[] = 'repeated_service';
                }
            }
        }

        if ($hasFraud) {
            // Получаем уникальные типы аномалий
            $anomalyTypes = array_unique($anomalyTypes);
            $primaryAnomalyType = reset($anomalyTypes); // Берем первый тип как основной

            // Сохраняем в БД
            $fraudCheckId = DB::table('fraud_checks')->insertGetId([
                'client_phone' => $phone,
                'check_date' => now(),
                'anomaly_type' => $primaryAnomalyType,
                'severity' => $severity,
                'records_affected' => json_encode(array_column($records, 'id')),
                'record_details' => json_encode([
                    'patterns' => $suspiciousPatterns,
                    'branch_id' => $this->branchId,
                    'all_anomaly_types' => $anomalyTypes
                ]),
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::warning('⚠️ Created fraud check record', [
                'id' => $fraudCheckId,
                'phone' => $phone,
                'severity' => $severity,
                'anomaly_types' => $anomalyTypes
            ]);

            $branch = Branch::where('yclients_id', $this->branchId)->first();
            $branchName = $branch ? $branch->name : "Филиал {$this->branchId}";
            
            $result = $this->sendFraudAlert($phone, $records, $suspiciousPatterns, $telegramService, $branchName, $severity);
            
            Log::info('📨 Fraud alert sending result', [
                'success' => $result,
                'fraud_check_id' => $fraudCheckId,
                'phone' => $phone
            ]);
        }
    }

    private function sendFraudAlert($phone, $records, $patterns, $telegramService, $branchName, $severity)
    {
        $severityEmoji = $severity === 'critical' ? '🔴' : '🟡';
        $message = "{$severityEmoji} *Обнаружены подозрительные записи!*\n\n";
        $message .= "📱 Телефон клиента: `{$phone}`\n";
        $message .= "🏢 Филиал: {$branchName}\n";
        $message .= "⚠️ Уровень: " . ($severity === 'critical' ? '*КРИТИЧЕСКИЙ*' : 'Подозрительный') . "\n\n";

        // Оставляем текущую логику группировки и вывода записей
        $groupedRecords = [];
        foreach ($records as $record) {
            $date = Carbon::parse($record['date'])->format('Y-m-d');
            if (!isset($groupedRecords[$date])) {
                $groupedRecords[$date] = [];
            }
            $groupedRecords[$date][] = $record;
        }

        foreach ($groupedRecords as $date => $dayRecords) {
            $message .= "\n📅 *" . Carbon::parse($date)->format('d.m.Y') . "*\n";
            $message .= "Количество записей: " . count($dayRecords) . "\n";
            
            usort($dayRecords, function($a, $b) {
                return Carbon::parse($a['date'])->timestamp - Carbon::parse($b['date'])->timestamp;
            });

            foreach ($dayRecords as $record) {
                $time = Carbon::parse($record['date'])->format('H:i');
                $services = implode(', ', array_map(function($service) {
                    return $service['title'];
                }, $record['services']));

                $message .= "\n🕒 {$time}\n";
                $message .= "📝 Услуги: {$services}\n";
            }
        }

        $message .= "\n⚠️ Выявленные подозрительные паттерны:\n";
        foreach ($patterns as $pattern) {
            $message .= "- {$pattern}\n";
        }

        $message .= "\n⚠️ Необходимо проверить записи и связаться с клиентом!";

        return $telegramService->sendMessageToAllAdmins($message);
    }

    public function failed(\Throwable $e)
    {
        Log::error('❌ FraudDetectionJob: Job failed finally', [
            'branch_id' => $this->branchId,
            'error' => $e->getMessage()
        ]);
    }
}