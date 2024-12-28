<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\YclientsService;
use App\Models\Employee;
use Illuminate\Support\Facades\Log;

class SyncEmployeesCommand extends Command
{
    protected $signature = 'sync:employees';
    protected $description = 'Synchronize employees data with YClients';

    private YclientsService $yclientsService;

    public function __construct(YclientsService $yclientsService)
    {
        parent::__construct();
        $this->yclientsService = $yclientsService;
    }

    public function handle()
    {
        try {
            $this->info('Starting employees synchronization...');
            Log::info('Starting employees sync');
            
            // Устанавливаем админский токен для полного доступа
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');
            
            $authResult = $this->yclientsService->authenticateByCredentials($adminLogin, $adminPassword);
            if (!isset($authResult['success']) || !$authResult['success']) {
                throw new \Exception('Failed to authenticate as admin');
            }
            
            $this->yclientsService->setUserToken($authResult['token']);
            
            // Получаем список компаний
            $companies = $this->yclientsService->getCompanies(['active' => 1]);
            $this->info('Found ' . count($companies) . ' active companies');
            
            $totalSynced = 0;
            $totalErrors = 0;
            
            foreach ($companies as $company) {
                $companyId = $company['id'];
                $this->info("\nProcessing company: {$company['title']} (ID: {$companyId})");
                
                try {
                    // Получаем сотрудников компании
                    $staff = $this->yclientsService->getStaff($companyId);
                    $this->info("Found " . count($staff) . " employees");
                    
                    foreach ($staff as $employee) {
                        try {
                            if (empty($employee['id'])) {
                                $this->warn("Skipping employee without ID");
                                continue;
                            }

                            $this->syncEmployee($employee, $companyId);
                            $totalSynced++;
                            
                        } catch (\Exception $e) {
                            $totalErrors++;
                            $this->error("Failed to sync employee {$employee['name']}: " . $e->getMessage());
                            Log::error('Employee sync error:', [
                                'employee' => $employee,
                                'error' => $e->getMessage()
                            ]);
                        }
                    }
                    
                } catch (\Exception $e) {
                    $this->error("Failed to get staff for company {$companyId}: " . $e->getMessage());
                    Log::error('Failed to get staff', [
                        'company_id' => $companyId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $this->info("\nSync completed!");
            $this->info("Total synced: $totalSynced");
            $this->info("Total errors: $totalErrors");
            
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Synchronization failed: ' . $e->getMessage());
            Log::error('Sync failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }

    private function syncEmployee(array $employeeData, int $companyId): void 
{
    $employee = Employee::updateOrCreate(
        [
            'yclients_id' => $employeeData['id'],
            'branch_id' => $companyId
        ],
        [
            'full_name' => $employeeData['name'],
            'position' => $employeeData['position']['title'] ?? $employeeData['specialization'] ?? null,
            'avatar' => $employeeData['avatar'] ?? null,
            'is_active' => !($employeeData['fired'] ?? false || $employeeData['hidden'] ?? false),
        ]
    );

    // Ищем завершенную регистрацию для этого сотрудника
    $registration = \App\Models\EmployeeRegistration::where('yclients_staff_id', $employeeData['id'])
        ->where('status', 'completed')
        ->whereNotNull('med_book_expiry')
        ->where('has_med_book', true)
        ->first();

    if ($registration) {
        // Обновляем информацию о медкнижке
        $employee->update([
            'has_med_book' => true,
            'med_book_expiry' => $registration->med_book_expiry
        ]);

        $this->line("  ✓ Added med book info for: {$employee->full_name} (expires: {$registration->med_book_expiry})");
        Log::info('Updated employee med book info', [
            'employee_id' => $employee->id,
            'yclients_id' => $employee->yclients_id,
            'name' => $employee->full_name,
            'med_book_expiry' => $registration->med_book_expiry
        ]);
    }

    $this->line("  ✓ Synced: {$employee->full_name}");
    Log::info('Employee synced', [
        'id' => $employee->id,
        'yclients_id' => $employee->yclients_id,
        'name' => $employee->full_name
    ]);
}
}