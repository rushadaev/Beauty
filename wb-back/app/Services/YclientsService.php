<?php

namespace App\Services;

use App\Models\User;
use App\Models\SyncLog;
use App\Models\Branch;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;

class YclientsService
{
    private const API_BASE_URL = 'https://api.yclients.com/api/v1';
    private const TOKEN_TTL = 86400; // 24 hours

    private string $partnerToken;
    private ?string $userToken = null;
    private array $defaultHeaders;

    public function __construct()
    {
        $this->partnerToken = config('services.yclients.partner_token');
        $this->defaultHeaders = [
            'Accept' => 'application/vnd.yclients.v2+json',
            'Content-Type' => 'application/json'
        ];
    }

    /**
     * Создает базовый HTTP-клиент с заголовками
     */
    protected function http(bool $onlyPartnerToken = false): PendingRequest
{
    $headers = $this->defaultHeaders;
    
    if ($onlyPartnerToken) {
        $headers['Authorization'] = "Bearer {$this->partnerToken}";
    } else if ($this->userToken) {
        $headers['Authorization'] = "Bearer {$this->partnerToken}, User {$this->userToken}";
    } else {
        $headers['Authorization'] = "Bearer {$this->partnerToken}";
    }

    return Http::withHeaders($headers)->retry(3, 100);
}

    /**
     * Обработка ответа API
     */
    protected function handleResponse($response, string $context = '')
    {
        try {
            $response->throw();
            $data = $response->json();

            if (!isset($data['success']) || !$data['success']) {
                Log::error("Yclients API Error in {$context}", [
                    'response' => $data,
                    'status' => $response->status()
                ]);
                return null;
            }

            return $data['data'] ?? null;

        } catch (RequestException $e) {
            Log::error("Yclients API Exception in {$context}", [
                'message' => $e->getMessage(),
                'response' => $e->response->json() ?? null,
                'status' => $e->response->status()
            ]);
            return null;
        } catch (\Exception $e) {
            Log::error("Unexpected error in {$context}", [
                'message' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Получение токена из Redis
     */
    protected function getStoredToken(string $key): ?string
    {
        try {
            return Redis::get($key);
        } catch (\Exception $e) {
            Log::error('Redis Error while getting token', [
                'message' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Сохранение токена в Redis
     */
    protected function storeToken(string $key, string $token): void
    {
        try {
            Redis::set($key, $token, 'EX', self::TOKEN_TTL);
        } catch (\Exception $e) {
            Log::error('Redis Error while storing token', [
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * Аутентификация по логину и паролю
     */
    /**
 * Аутентификация по логину и паролю
 */
public function authenticateByCredentials(string $login, string $password): ?array
{
    try {
        $response = $this->http()
            ->post(self::API_BASE_URL . '/auth', [
                'login' => $login,
                'password' => $password
            ]);

        $data = $response->json();
        
        // Проверяем ответ от YClients
        if (!isset($data['success']) || !$data['success']) {
            Log::warning('YClients auth failed', [
                'login' => $login,
                'response' => $data
            ]);
            
            return [
                'success' => false,
                'message' => $data['meta']['message'] ?? 'Ошибка авторизации'
            ];
        }

        if (isset($data['data']['user_token'])) {
            $this->userToken = $data['data']['user_token'];
            return [
                'success' => true,
                'token' => $data['data']['user_token']
            ];
        }

        return [
            'success' => false,
            'message' => 'Токен не получен'
        ];

    } catch (\Exception $e) {
        Log::error('YClients auth error:', [
            'error' => $e->getMessage()
        ]);
        return [
            'success' => false,
            'message' => 'Ошибка сервиса авторизации'
        ];
    }
}

public function updateMasterDescription(string $phone, string $password, string $description): bool
{
    try {
        Log::info('Starting master description update', [
            'phone' => $phone,
            'description_length' => strlen($description)
        ]);

        // 1. Аутентификация
        $authResult = $this->authenticateByCredentials($phone, $password);
        Log::info('Authentication result:', [
            'success' => $authResult['success'] ?? false,
            'has_token' => isset($authResult['token'])
        ]);

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Authentication failed', ['auth_result' => $authResult]);
            return false;
        }

        // 2. Установка токена
        $this->setUserToken($authResult['token']);
        Log::info('Token set');

        // 3. Поиск мастера по всем филиалам
        Log::info('Searching for master in all companies');
        $masterInfo = $this->findMasterInCompanies($phone);

        if (!$masterInfo) {
            Log::error('Master not found in any company');
            return false;
        }

        Log::info('Master found', [
            'company_id' => $masterInfo['company']['id'],
            'company_name' => $masterInfo['company']['title'],
            'master_id' => $masterInfo['master']['id']
        ]);

        // 4. Обновление описания
        $response = $this->http()
            ->put(self::API_BASE_URL . "/staff/{$masterInfo['company']['id']}/{$masterInfo['master']['id']}", [
                'information' => $description
            ]);

        $updateResult = $this->handleResponse($response, 'updateStaffDescription');
        Log::info('Update result:', [
            'success' => !empty($updateResult)
        ]);

        return !empty($updateResult);

    } catch (\Exception $e) {
        Log::error('Error updating master description:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

public function getUsers(int $companyId): array
{
    try {
        Log::info('Fetching users for company', ['company_id' => $companyId]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/users");

        $data = $this->handleResponse($response, 'getUsers');
        
        // Логируем для отладки
        Log::info('Users response', [
            'status' => $response->status(),
            'has_data' => !empty($data),
            'users_count' => count($data ?? [])
        ]);

        return $data ?? [];

    } catch (\Exception $e) {
        Log::error('Failed to get users', [
            'company_id' => $companyId,
            'error' => $e->getMessage()
        ]);
        return [];
    }
}

public function findMasterInCompanies(string $phone): ?array 
{
    try {
        $companies = $this->getCompanies(['my' => 1, 'active' => 1]);
        Log::info('Searching through companies', ['count' => count($companies)]);

        $searchPhone = $this->normalizePhone($phone);
        $masterInfo = null;

        foreach ($companies as $company) {
            Log::info('Checking company', [
                'company_id' => $company['id'],
                'company_name' => $company['title']
            ]);

            // Получаем пользователей компании
            $users = $this->getUsers($company['id']);
            $foundUser = null;
            
            // Ищем пользователя по телефону
            foreach ($users as $user) {
                if ($this->normalizePhone($user['phone'] ?? '') === $searchPhone) {
                    $foundUser = $user;
                    Log::info('Found matching user', [
                        'user_id' => $user['id'],
                        'user_name' => $user['name'],
                        'user_phone' => $user['phone'],
                        'company_id' => $company['id']
                    ]);
                    break;
                }
            }

            // Если нашли пользователя в этой компании
            if ($foundUser) {
                // Получаем список сотрудников
                $staffResponse = $this->http()
                    ->get(self::API_BASE_URL . "/company/{$company['id']}/staff");
                
                $staffList = $this->handleResponse($staffResponse, 'getStaff');

                if ($staffList) {
                    // Ищем сотрудника с соответствующим user_id
                    foreach ($staffList as $staff) {
                        Log::info('Checking staff user_id', [
                            'staff_id' => $staff['id'],
                            'staff_user_id' => $staff['user_id'] ?? null,
                            'looking_for_user_id' => $foundUser['id']
                        ]);

                        if (($staff['user_id'] ?? null) === $foundUser['id']) {
                            Log::info('Found staff by user_id match', [
                                'company_id' => $company['id'],
                                'staff_id' => $staff['id'],
                                'user_id' => $foundUser['id']
                            ]);
                            
                            // Сохраняем информацию, но не возвращаем сразу
                            $masterInfo = [
                                'company' => $company,
                                'master' => [
                                    'id' => $staff['id'],
                                    'user_id' => $foundUser['id'],
                                    'name' => $staff['name'],
                                    'phone' => $foundUser['phone']
                                ]
                            ];
                            break 2; // Выходим из обоих циклов, так как нашли нужного мастера
                        }
                    }
                    
                    Log::warning('No staff found with matching user_id in company', [
                        'user_id' => $foundUser['id'],
                        'company_id' => $company['id']
                    ]);
                }
            }
        }

        // Если после проверки всех компаний мастер не найден
        if (!$masterInfo) {
            Log::error('Master not found in any company', [
                'phone' => $phone,
                'normalized_phone' => $searchPhone
            ]);
            return null;
        }

        return $masterInfo;

    } catch (\Exception $e) {
        Log::error('Error in findMasterInCompanies:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

private function normalizePhone(string $phone): string 
{
    // Удаляем все, кроме цифр
    $cleaned = preg_replace('/[^0-9]/', '', $phone);
    
    // Если начинается с 8, меняем на 7
    if (str_starts_with($cleaned, '8')) {
        $cleaned = '7' . substr($cleaned, 1);
    }
    
    // Если нет 7 в начале, добавляем
    if (!str_starts_with($cleaned, '7')) {
        $cleaned = '7' . $cleaned;
    }

    return $cleaned;
}

private function updateStaffDescription(int $companyId, int $staffId, string $description): bool
{
    try {
        Log::info('Attempting to update staff description', [
            'company_id' => $companyId,
            'staff_id' => $staffId,
            'description_length' => strlen($description)
        ]);

        $response = $this->http()
            ->put(self::API_BASE_URL . "/staff/{$companyId}/{$staffId}", [
                'information' => $description
            ]);

        $data = $this->handleResponse($response, 'updateStaffDescription');
        
        Log::info('Staff description update response:', [
            'success' => !empty($data),
            'response_data' => $data
        ]);

        return !empty($data);
    } catch (\Exception $e) {
        Log::error('Failed to update staff description:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'company_id' => $companyId,
            'staff_id' => $staffId
        ]);
        return false;
    }
}

    /**
     * Аутентификация пользователя системы
     */
    public function authenticateUser(?User $user = null): bool
    {
        $user = $user ?? auth()->user();

        if (!$user) {
            Log::error('Authentication failed: User not found');
            return false;
        }

        // Попытка получить токен из Redis
        $redisKey = "yclients_access_token_{$user->telegram_id}";
        $storedToken = $this->getStoredToken($redisKey);

        if ($storedToken) {
            $this->userToken = $storedToken;
            return true;
        }

        // Попытка получить токен из модели пользователя
        $userToken = $user->getYclientsApiKey();
        if ($userToken) {
            $this->userToken = $userToken;
            $this->storeToken($redisKey, $userToken);
            return true;
        }

        // Если есть логин и пароль в конфиге, пробуем аутентифицироваться
        if (config('services.yclients.login') && config('services.yclients.password')) {
            try {
                $token = $this->authenticateByCredentials(
                    config('services.yclients.login'),
                    config('services.yclients.password')
                );

                if ($token) {
                    $this->userToken = $token;
                    $this->storeToken($redisKey, $token);
                    return true;
                }
            } catch (\Exception $e) {
                Log::error('Authentication failed with default credentials', [
                    'message' => $e->getMessage()
                ]);
            }
        }

        return false;
    }

    /**
     * Аутентификация по telegram_id
     */
    public function authenticateByTelegram(string $telegramId, string $password, string $phone): ?string
    {
        $redisKey = "yclients_access_token_{$telegramId}";
        
        // Проверяем Redis
        $storedToken = $this->getStoredToken($redisKey);
        if ($storedToken) {
            $this->userToken = $storedToken;
            return $storedToken;
        }

        // Пробуем получить новый токен
        try {
            $token = $this->authenticateByCredentials($phone, $password);
            if ($token) {
                $this->storeToken($redisKey, $token);
                return $token;
            }
        } catch (\Exception $e) {
            Log::error('Authentication by telegram failed', [
                'telegram_id' => $telegramId,
                'message' => $e->getMessage()
            ]);
        }

        return null;
    }

    public function getStaff(int $companyId): array
    {
        try {
            $response = $this->http()
                ->get(self::API_BASE_URL . "/company/{$companyId}/staff");

            $data = $this->handleResponse($response, 'getStaff');
            return $data ?? [];

        } catch (\Exception $e) {
            Log::error('Failed to get staff:', [
                'company_id' => $companyId,
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Методы для работы с компаниями и филиалами
     */
    public function getCompanies(array $params = []): ?array
    {
        $defaultParams = [
            'my' => 1,
            'active' => 1,
        ];

        $response = $this->http()
            ->get(self::API_BASE_URL . '/companies', array_merge($defaultParams, $params));

        return $this->handleResponse($response, 'getCompanies');
    }

    public function setUserToken(string $token): void 
{
    $this->userToken = $token;
}

    /**
     * Получить данные конкретной компании
     */
    public function getCompany(int $companyId): ?array
    {
        $response = $this->http()
            ->get(self::API_BASE_URL . '/companies/' . $companyId);

        return $this->handleResponse($response, 'getCompany');
    }

    /**
     * Получить компанию текущего пользователя
     */
    public function getMyCompany(): ?array
    {
        $companies = $this->getCompanies(['my' => 1]);
        
        if (!$companies || empty($companies)) {
            Log::error('No companies found for current user');
            return null;
        }

        return $companies[0];
    }

    /**
     * Синхронизировать филиалы с базой данных
     */
    public function syncBranches(): array
    {
        $startTime = microtime(true);
        
        $result = [
            'success' => false,
            'synced' => 0,
            'errors' => 0,
            'message' => '',
            'debug_info' => []
        ];
    
        try {
            $response = $this->http(true)
                ->get(self::API_BASE_URL . '/companies', [
                    'active' => 1,
                    'group_id' => 287780
                ]);
    
            $companies = $this->handleResponse($response, 'getCompanies');
            
            if (!$companies) {
                $result['message'] = 'Failed to get companies from Yclients';
                $result['debug_info'][] = 'No companies returned from API';
                SyncLog::logBranchSync($result, microtime(true) - $startTime);
                return $result;
            }
    
            $result['debug_info'][] = sprintf('Found %d companies', count($companies));
    
            $processedIds = [];
            foreach ($companies as $company) {
                try {
                    \App\Models\Branch::updateOrCreate(
                        ['yclients_id' => $company['id']],
                        [
                            'name' => $company['title'],
                            'address' => $company['address'],
                            'phone' => $company['phone'],
                            'working_hours' => $company['schedule'] ?? null,
                            'is_active' => true,
                            'coordinate_lat' => $company['coordinate_lat'] ?? null,
                            'coordinate_lon' => $company['coordinate_lon'] ?? null,
                            'description' => strip_tags($company['description'] ?? ''),
                            'email' => $company['email'] ?? null,
                            'city' => $company['city'] ?? null,
                            'timezone_name' => $company['timezone_name'] ?? 'Europe/Moscow',
                            'network_id' => $company['main_group']['id'] ?? null,
                            'network_name' => $company['main_group']['title'] ?? null
                        ]
                    );
    
                    $processedIds[] = $company['id'];
                    $result['synced']++;
                    $result['debug_info'][] = sprintf('Successfully processed company ID: %d', $company['id']);
                } catch (\Exception $e) {
                    $result['errors']++;
                    $errorMessage = sprintf('Error processing company ID %d: %s', $company['id'], $e->getMessage());
                    $result['debug_info'][] = $errorMessage;
                    Log::error('Failed to sync branch', [
                        'company_id' => $company['id'],
                        'error' => $e->getMessage()
                    ]);
                }
            }
    
            // Деактивация филиалов, которых нет в API
            $deactivatedCount = \App\Models\Branch::whereNotIn('yclients_id', $processedIds)
                ->update(['is_active' => false]);
            
            $result['debug_info'][] = sprintf('Deactivated %d branches', $deactivatedCount);
    
            $result['success'] = true;
            $result['message'] = sprintf(
                'Synchronized %d branches with %d errors. Deactivated %d branches.',
                $result['synced'],
                $result['errors'],
                $deactivatedCount
            );
    
        } catch (\Exception $e) {
            $result['message'] = 'Synchronization failed: ' . $e->getMessage();
            $result['debug_info'][] = sprintf('Fatal error: %s', $e->getMessage());
            Log::error('Branch synchronization failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    
        // Записываем результат синхронизации в лог
        SyncLog::logBranchSync($result, microtime(true) - $startTime);
    
        return $result;
    }

    /**
     * Проверить доступность филиала
     */
    public function checkBranchAvailability(int $branchId): bool
    {
        try {
            $company = $this->getCompany($branchId);
            return $company && ($company['active'] ?? false) == '1';
        } catch (\Exception $e) {
            Log::error('Failed to check branch availability', [
                'branch_id' => $branchId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Получить график работы филиала
     */
    public function getBranchSchedule(int $branchId): ?array
    {
        try {
            $company = $this->getCompany($branchId);
            if (!$company) {
                return null;
            }

            return [
                'schedule' => $company['schedule'] ?? null,
                'timezone' => $company['timezone_name'] ?? 'Europe/Moscow',
                'working_hours' => $this->parseWorkingHours($company['schedule'] ?? '')
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get branch schedule', [
                'branch_id' => $branchId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Парсинг строки графика работы в структурированный формат
     */
    protected function parseWorkingHours(string $schedule): array
    {
        // Пример входной строки: "Ежедневно: 10:00 - 22:00"
        $result = [];
        
        try {
            // Базовый парсинг для простого формата
            if (preg_match('/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/', $schedule, $matches)) {
                $defaultHours = [
                    'open' => $matches[1],
                    'close' => $matches[2]
                ];

                // Заполняем для всех дней недели
                $weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                foreach ($weekDays as $day) {
                    $result[$day] = $defaultHours;
                }
            }
        } catch (\Exception $e) {
            Log::warning('Failed to parse working hours', [
                'schedule' => $schedule,
                'error' => $e->getMessage()
            ]);
        }

        return $result;
    }

    
    /**
     * Методы для работы с товарами
     */
    public function getGoods(int $companyId, array $params = []): ?array
    {
        try {
            $response = $this->http()
                ->get(self::API_BASE_URL . "/goods/{$companyId}", $params);

            return $this->handleResponse($response, 'getGoods');
        } catch (\Exception $e) {
            Log::error('Failed to fetch goods', [
                'company_id' => $companyId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Получить конкретный товар
     */
    public function getProduct(int $companyId, int $productId): ?array
    {
        try {
            $response = $this->http()
                ->get(self::API_BASE_URL . "/goods/{$companyId}/{$productId}");

            return $this->handleResponse($response, 'getProduct');
        } catch (\Exception $e) {
            Log::error('Failed to fetch product', [
                'company_id' => $companyId,
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Создать клиента
     */
    public function createClient(int $companyId, array $clientData): ?array
    {
        try {
            $response = $this->http()
                ->post(self::API_BASE_URL . "/clients/{$companyId}", $clientData);

            return $this->handleResponse($response, 'createClient');
        } catch (\Exception $e) {
            Log::error('Failed to create client', [
                'company_id' => $companyId,
                'client_data' => $clientData,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Поиск клиента
     */
    public function findClient(int $companyId, string $phone): ?array
    {
        try {
            $response = $this->http()
                ->get(self::API_BASE_URL . "/clients/{$companyId}", [
                    'phone' => $phone
                ]);

            $data = $this->handleResponse($response, 'findClient');
            return $data[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Failed to find client', [
                'company_id' => $companyId,
                'phone' => $phone,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Обновить данные клиента
     */
    public function updateClient(int $companyId, int $clientId, array $clientData): ?array
    {
        try {
            $response = $this->http()
                ->put(self::API_BASE_URL . "/clients/{$companyId}/{$clientId}", $clientData);

            return $this->handleResponse($response, 'updateClient');
        } catch (\Exception $e) {
            Log::error('Failed to update client', [
                'company_id' => $companyId,
                'client_id' => $clientId,
                'client_data' => $clientData,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Получить историю записей клиента
     */
    public function getClientRecords(int $companyId, int $clientId): ?array
    {
        try {
            $response = $this->http()
                ->get(self::API_BASE_URL . "/records/{$companyId}", [
                    'client_id' => $clientId
                ]);

            return $this->handleResponse($response, 'getClientRecords');
        } catch (\Exception $e) {
            Log::error('Failed to get client records', [
                'company_id' => $companyId,
                'client_id' => $clientId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Создать запись клиента
     */
    public function createRecord(int $companyId, array $recordData): ?array
    {
        try {
            $response = $this->http()
                ->post(self::API_BASE_URL . "/records/{$companyId}", $recordData);

            return $this->handleResponse($response, 'createRecord');
        } catch (\Exception $e) {
            Log::error('Failed to create record', [
                'company_id' => $companyId,
                'record_data' => $recordData,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Отменить запись
     */
    public function cancelRecord(int $companyId, int $recordId, ?string $cancelReason = null): bool
    {
        try {
            $response = $this->http()
                ->delete(self::API_BASE_URL . "/records/{$companyId}/{$recordId}", [
                    'reason' => $cancelReason
                ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Failed to cancel record', [
                'company_id' => $companyId,
                'record_id' => $recordId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Получить сервисы компании
     */
    public function getServices(int $companyId): ?array
    {
        try {
            $response = $this->http()
                ->get(self::API_BASE_URL . "/services/{$companyId}");

            return $this->handleResponse($response, 'getServices');
        } catch (\Exception $e) {
            Log::error('Failed to get services', [
                'company_id' => $companyId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}



