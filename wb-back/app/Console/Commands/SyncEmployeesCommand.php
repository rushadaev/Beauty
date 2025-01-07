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
            
            // Авторизация админа
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');
            
            Log::info('Attempting admin authentication');
            
            $authResult = $this->yclientsService->authenticateByCredentials($adminLogin, $adminPassword);
            if (!isset($authResult['success']) || !$authResult['success']) {
                throw new \Exception('Failed to authenticate as admin');
            }
            
            $this->yclientsService->setUserToken($authResult['token']);
            Log::info('Admin authentication successful');
            
            // Получаем список компаний
            $companies = $this->yclientsService->getCompanies(['my' => 1, 'active' => 1]);
            $this->info('Found ' . count($companies) . ' active companies');
            Log::info('Retrieved companies', ['count' => count($companies)]);
            
            $totalSynced = 0;
            $totalErrors = 0;
            $totalUsersFound = 0;
            $totalPhonesFound = 0;
            
            foreach ($companies as $company) {
                $companyId = $company['id'];
                $this->info("\nProcessing company: {$company['title']} (ID: {$companyId})");
                Log::info('Processing company', [
                    'company_id' => $companyId,
                    'company_name' => $company['title']
                ]);
                
                try {
                    // Получаем сотрудников компании
                    $staff = $this->yclientsService->getStaff($companyId);
                    $this->info("Found " . count($staff) . " employees");
                    Log::info('Retrieved staff', [
                        'company_id' => $companyId,
                        'staff_count' => count($staff)
                    ]);
                    
                    foreach ($staff as $employee) {
                        try {
                            if (empty($employee['id'])) {
                                $this->warn("Skipping employee without ID");
                                Log::warning('Skipping employee without ID', ['employee' => $employee]);
                                continue;
                            }

                            $syncResult = $this->syncEmployee($employee, $companyId);
                            
                            $totalSynced++;
                            if ($syncResult['user_found']) $totalUsersFound++;
                            if ($syncResult['phone_found']) $totalPhonesFound++;
                            
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
            $this->info("Users found: $totalUsersFound");
            $this->info("Phones found: $totalPhonesFound");
            $this->info("Total errors: $totalErrors");
            
            Log::info('Sync completed', [
                'total_synced' => $totalSynced,
                'users_found' => $totalUsersFound,
                'phones_found' => $totalPhonesFound,
                'total_errors' => $totalErrors
            ]);
            
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

    private function syncEmployee(array $employeeData, int $companyId): array
{
    $userFound = false;
    $phoneFound = false;
    $telegramId = null;
    $userPhone = null;

    // Логируем начало синхронизации сотрудника
    Log::info('Starting employee sync', [
        'employee_id' => $employeeData['id'],
        'employee_name' => $employeeData['name'],
        'user_id' => $employeeData['user_id'] ?? 'no user id'
    ]);

    // Получаем данные пользователя и его телефон
    if (!empty($employeeData['user_id'])) {
        try {
            // Получаем список пользователей компании
            $users = $this->yclientsService->getUsers($companyId);
            
            // Ищем нужного пользователя по user_id
            $userData = collect($users)->firstWhere('id', $employeeData['user_id']);
            
            if ($userData) {
                $userFound = true;
                
                Log::info('Retrieved user data', [
                    'employee_id' => $employeeData['id'],
                    'user_id' => $employeeData['user_id'],
                    'user_data' => $userData
                ]);

                if (!empty($userData['phone'])) {
                    $userPhone = $userData['phone'];
                    $phoneFound = true;
                    
                    Log::info('Found phone for employee', [
                        'employee_id' => $employeeData['id'],
                        'phone' => $userPhone
                    ]);

                    // Ищем telegram_id в таблице users по телефону
                    $user = \App\Models\User::where('phone_number', $userPhone)->first();
                    if ($user && $user->telegram_id) {
                        $telegramId = $user->telegram_id;
                        Log::info('Found telegram_id for employee', [
                            'employee_id' => $employeeData['id'],
                            'telegram_id' => $telegramId
                        ]);
                    } else {
                        Log::info('No telegram_id found for phone', [
                            'phone' => $userPhone
                        ]);
                    }
                } else {
                    Log::info('No phone found in user data', [
                        'user_id' => $employeeData['user_id']
                    ]);
                }
            } else {
                Log::info('User not found in company users list', [
                    'user_id' => $employeeData['user_id']
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to get user data', [
                'employee_id' => $employeeData['id'],
                'user_id' => $employeeData['user_id'],
                'error' => $e->getMessage()
            ]);
        }
    } else {
        Log::info('No user_id found for employee', [
            'employee_id' => $employeeData['id']
        ]);
    }

    // Обновляем или создаем запись сотрудника
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
            'phone' => $userPhone,
            'telegram_id' => $telegramId
        ]
    );

    Log::info('Employee record updated', [
        'employee_id' => $employee->id,
        'yclients_id' => $employee->yclients_id,
        'phone' => $employee->phone,
        'telegram_id' => $employee->telegram_id
    ]);

        // Ищем завершенную регистрацию для этого сотрудника
        $registration = \App\Models\EmployeeRegistration::where('yclients_staff_id', $employeeData['id'])
            ->where('status', 'completed')
            ->whereNotNull('med_book_expiry')
            ->where('has_med_book', true)
            ->first();

        if ($registration) {
            try {
                $employee->update([
                    'has_med_book' => true,
                    'med_book_expiry' => $registration->med_book_expiry,
                    'account_number' => $registration->account_number,
                    'bank_name' => $registration->bank_name
                ]);
                
                Log::info('Updated employee medical book info', [
                    'employee_id' => $employee->id,
                    'med_book_expiry' => $registration->med_book_expiry
                ]);
                
            } catch (\Exception $e) {
                Log::error('Failed to update employee medical book info', [
                    'employee_id' => $employee->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("Synced: {$employee->full_name}" . 
            ($userPhone ? " (Phone: {$userPhone})" : "") . 
            ($telegramId ? " (Telegram ID: {$telegramId})" : ""));

        return [
            'user_found' => $userFound,
            'phone_found' => $phoneFound
        ];
    }
}