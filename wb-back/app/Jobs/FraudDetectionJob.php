<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
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

    // Improved fraud detection rules
    private const MIN_RECORDS_PER_DAY = 2;
    private const CRITICAL_RECORDS_PER_DAY = 4;
    private const SUSPICIOUS_HOURS_SEQUENCE = 2;
    private const CRITICAL_HOURS_SEQUENCE = 1;
    private const RATE_LIMIT_DELAY = 1000000; // 1 second in microseconds
    private const MAX_RETRIES_ON_RATE_LIMIT = 3;
    
    private const TRAINING_CENTER_ID = 1019467;

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
            if ($this->branchId === self::TRAINING_CENTER_ID) {
                Log::info('🎓 Skipping fraud detection for training center', [
                    'branch_id' => $this->branchId
                ]);
                return;
            }

            Log::info('🚀 Starting fraud detection', [
                'branch_id' => $this->branchId,
                'start_date' => $this->startDate,
                'end_date' => $this->endDate,
                'job_id' => $this->job->getJobId()
            ]);

            $authResult = $this->authenticate($yclientsService);
            if (!$authResult) return;

            $records = $this->fetchRecords($yclientsService);
            if (empty($records)) return;

            $detailedRecords = $this->processRecords($yclientsService, $records);
            if (empty($detailedRecords)) return;
            
            $this->analyzeRecords($detailedRecords, $telegramService);

            Log::info('✅ Fraud detection completed successfully');

        } catch (\Exception $e) {
            Log::error('❌ Error in fraud detection', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function authenticate(YclientsService $yclientsService)
    {
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('❌ Authentication failed', [
                'auth_result' => $authResult
            ]);
            return false;
        }

        $yclientsService->setUserToken($authResult['token']);
        return true;
    }

    private function getRecordWithRetry(YclientsService $yclientsService, int $recordId, int $attempts = 0)
{
    try {
        $record = $yclientsService->getRecord($this->branchId, $recordId);
        return $record;
    } catch (\Exception $e) {
        $message = $e->getMessage();
        
        // Проверяем на превышение лимита запросов
        if ($attempts < self::MAX_RETRIES_ON_RATE_LIMIT && 
            (strpos($message, 'Too Many Requests') !== false || 
             strpos($message, '429') !== false)) {
            
            Log::warning('Rate limit hit, retrying...', [
                'attempt' => $attempts + 1,
                'record_id' => $recordId,
                'delay' => self::RATE_LIMIT_DELAY/1000000 . 's'
            ]);
            
            // Увеличиваем задержку с каждой попыткой
            usleep(self::RATE_LIMIT_DELAY * ($attempts + 1));
            
            return $this->getRecordWithRetry(
                $yclientsService, 
                $recordId, 
                $attempts + 1
            );
        }
        
        Log::error('Error getting record details from YClients:', [
            'company_id' => $this->branchId,
            'record_id' => $recordId,
            'error' => $message,
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
}

    private function fetchRecords(YclientsService $yclientsService)
    {
        $records = $yclientsService->getRecords($this->branchId, [
            'start_date' => $this->startDate,
            'end_date' => $this->endDate
        ]);

        Log::info('📊 Records fetched', [
            'total_records' => count($records)
        ]);

        return $records;
    }

    private function processRecords(YclientsService $yclientsService, array $records)
{
    $detailedRecords = [];
    $processedCount = 0;
    $totalRecords = count($records);

    foreach ($records as $record) {
        $processedCount++;
        try {
            // Добавляем небольшую задержку между запросами
            usleep(500000); // 0.5 секунды между запросами 
            
            $recordDetails = $this->getRecordWithRetry($yclientsService, $record['id']);
            if ($recordDetails && isset($recordDetails['client']['phone'])) {
                $detailedRecords[] = $recordDetails;
            }
            
            Log::info('Record processed', [
                'progress' => "{$processedCount}/{$totalRecords}",
                'record_id' => $record['id']
            ]);
            
        } catch (\Exception $e) {
            Log::error('❌ Error fetching record details', [
                'record_id' => $record['id'],
                'error' => $e->getMessage(),
                'progress' => "{$processedCount}/{$totalRecords}"
            ]);
            continue;
        }
    }

    return $detailedRecords;
}

    private function analyzeRecords(array $detailedRecords, TelegramService $telegramService)
    {
        // Группируем записи по телефонам клиентов
        $recordsByPhone = [];
        foreach ($detailedRecords as $record) {
            if (isset($record['client']['phone'])) {
                $phone = $record['client']['phone'];
                if (!isset($recordsByPhone[$phone])) {
                    $recordsByPhone[$phone] = [];
                }
                $recordsByPhone[$phone][] = $record;
            }
        }

        // Анализируем записи для каждого клиента
        foreach ($recordsByPhone as $phone => $clientRecords) {
            $this->analyzeClientRecords($phone, $clientRecords, $telegramService);
        }
    }

    private function analyzeClientRecords($phone, $records, $telegramService)
    {
        Log::info('🔍 Analyzing records', [
            'phone' => $phone,
            'records_count' => count($records)
        ]);

        $existingFraud = DB::table('fraud_checks')
            ->where('client_phone', $phone)
            ->where('status', 'pending')
            ->where('check_date', '>=', Carbon::now()->subDays(7))
            ->first();

        if ($existingFraud) {
            Log::info('Skip: Unresolved fraud exists', [
                'phone' => $phone,
                'fraud_check_id' => $existingFraud->id
            ]);
            return;
        }

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
        $maxSeverity = 'suspicious';
        $anomalyTypes = [];

        foreach ($recordsByDay as $date => $dayRecords) {
            usort($dayRecords, function($a, $b) {
                return Carbon::parse($a['date'])->timestamp - Carbon::parse($b['date'])->timestamp;
            });

            $recordsCount = count($dayRecords);
            $hasRepeatedServices = $this->checkRepeatedServices($dayRecords);
            
            $minTimeDifference = $this->getMinTimeDifference($dayRecords);
            
            $daySeverity = $this->determineRecordSeverity(
                $recordsCount,
                $minTimeDifference,
                $hasRepeatedServices
            );

            if ($daySeverity === 'critical') {
                $maxSeverity = 'critical';
            }

            if ($recordsCount >= self::MIN_RECORDS_PER_DAY) {
                $suspiciousPatterns[] = "Множественные записи за день ({$date}): {$recordsCount}";
                $anomalyTypes[] = 'multiple_bookings';
                $hasFraud = true;
            }

            $this->addConsecutiveBookingPatterns($dayRecords, $suspiciousPatterns, $anomalyTypes);
            $this->addRepeatedServicePatterns($dayRecords, $suspiciousPatterns, $anomalyTypes);
        }

        if ($hasFraud) {
            $this->createFraudRecord(
                $phone,
                $records,
                $suspiciousPatterns,
                $anomalyTypes,
                $maxSeverity,
                $telegramService
            );
        }
    }

    private function determineRecordSeverity($recordsCount, $timeDifference, $hasRepeatedServices)
    {
        if ($recordsCount >= self::CRITICAL_RECORDS_PER_DAY) {
            return 'critical';
        }
        
        if ($timeDifference <= self::CRITICAL_HOURS_SEQUENCE) {
            return 'critical';
        }

        if ($hasRepeatedServices && $recordsCount >= 3) {
            return 'critical';
        }

        return 'suspicious';
    }

    private function getMinTimeDifference($dayRecords)
    {
        $minDiff = 24;
        
        for ($i = 0; $i < count($dayRecords) - 1; $i++) {
            $current = Carbon::parse($dayRecords[$i]['date']);
            $next = Carbon::parse($dayRecords[$i + 1]['date']);
            $diff = $next->diffInHours($current, true);
            $minDiff = min($minDiff, $diff);
        }
        
        return $minDiff;
    }

    private function checkRepeatedServices($dayRecords)
{
    $serviceIds = [];
    foreach ($dayRecords as $record) {
        if (!isset($record['services']) || !is_array($record['services'])) {
            continue;
        }
        foreach ($record['services'] as $service) {
            if (isset($service['id'])) {
                $serviceIds[] = $service['id'];
            }
        }
    }
    
    if (empty($serviceIds)) {
        return false;
    }
    
    $serviceCounts = array_count_values($serviceIds);
    return max($serviceCounts) > 1;
}

    private function addConsecutiveBookingPatterns($dayRecords, &$suspiciousPatterns, &$anomalyTypes)
    {
        for ($i = 0; $i < count($dayRecords) - 1; $i++) {
            $current = Carbon::parse($dayRecords[$i]['date']);
            $next = Carbon::parse($dayRecords[$i + 1]['date']);
            $hoursDiff = $next->diffInHours($current);
            
            if ($hoursDiff <= self::SUSPICIOUS_HOURS_SEQUENCE) {
                $suspiciousPatterns[] = "Последовательные записи: {$current->format('H:i')} и {$next->format('H:i')}";
                $anomalyTypes[] = 'consecutive_bookings';
            }
        }
    }

    private function addRepeatedServicePatterns($dayRecords, &$suspiciousPatterns, &$anomalyTypes)
    {
        $serviceIds = [];
        foreach ($dayRecords as $record) {
            foreach ($record['services'] as $service) {
                $serviceIds[] = $service['id'];
            }
        }
        
        $serviceCounts = array_count_values($serviceIds);
        foreach ($serviceCounts as $serviceId => $count) {
            if ($count > 1) {
                $serviceName = $dayRecords[0]['services'][array_search($serviceId, array_column($dayRecords[0]['services'], 'id'))]['title'];
                $suspiciousPatterns[] = "Повторяющаяся услуга: {$serviceName} ({$count} раз)";
                $anomalyTypes[] = 'repeated_service';
            }
        }
    }

    private function createFraudRecord($phone, $records, $patterns, $anomalyTypes, $severity, $telegramService)
    {
        $anomalyTypes = array_unique($anomalyTypes);
        $primaryAnomalyType = reset($anomalyTypes);

        $fraudCheckId = DB::table('fraud_checks')->insertGetId([
            'client_phone' => $phone,
            'check_date' => now(),
            'anomaly_type' => $primaryAnomalyType,
            'severity' => $severity,
            'records_affected' => json_encode(array_column($records, 'id')),
            'record_details' => json_encode([
                'patterns' => $patterns,
                'branch_id' => $this->branchId,
                'all_anomaly_types' => $anomalyTypes
            ]),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $branch = Branch::where('yclients_id', $this->branchId)->first();
        $branchName = $branch ? $branch->name : "Филиал {$this->branchId}";
        
        $this->sendFraudAlert($phone, $records, $patterns, $telegramService, $branchName, $severity);
    }

    private function sendFraudAlert($phone, $records, $patterns, $telegramService, $branchName, $severity)
    {
        $severityEmoji = $severity === 'critical' ? '🔴' : '🟡';
        $message = "{$severityEmoji} *Обнаружены подозрительные записи!*\n\n";
        $message .= "📱 Телефон клиента: `{$phone}`\n";
        $message .= "🏢 Филиал: {$branchName}\n";
        $message .= "⚠️ Уровень: " . ($severity === 'critical' ? '*КРИТИЧЕСКИЙ*' : 'Подозрительный') . "\n\n";

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