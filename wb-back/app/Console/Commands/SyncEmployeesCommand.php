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
        
        $this->yclientsService->setUserToken(config('services.yclients.user_token'));
        
        $companies = $this->yclientsService->getCompanies();
        $this->info('Found companies: ' . count($companies));
        
        // Добавляем отладочную информацию
        Log::info('Companies data:', ['companies' => $companies]);
        
        foreach ($companies as $company) {
            $companyId = $company['id'] ?? null;
            
            if (!$companyId) {
                $this->warn("Skipping company without ID: " . json_encode($company));
                continue;
            }
            
            // Выводим всю информацию о компании для отладки
            $this->info("\nProcessing company: " . json_encode($company));
            
            try {
                $staff = $this->yclientsService->getStaff($companyId);
                $this->info("Found " . count($staff) . " employees");
                
                foreach ($staff as $employee) {
                    if (empty($employee['id'])) {
                        $this->warn("Skipping employee without ID: " . json_encode($employee));
                        continue;
                    }
                    
                    try {
                        $this->syncEmployee($employee, $companyId);
                    } catch (\Exception $e) {
                        $this->error("Failed to sync employee: " . $e->getMessage());
                        Log::error('Employee sync error:', [
                            'employee' => $employee,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            } catch (\Exception $e) {
                $this->error("Failed to get staff for company {$companyId}: " . $e->getMessage());
            }
        }
        
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
            'position' => $employeeData['position']['title'] ?? null,
            'avatar' => $employeeData['avatar_big'] ?? null,
            'is_active' => !($employeeData['fired'] || $employeeData['hidden']),
        ]
    );

    $this->line("  ✓ Synced: {$employee->full_name}");
}
}