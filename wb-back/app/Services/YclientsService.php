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
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;


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
     * Получить информацию о текущем пользователе
     */
    public function getCurrentUser(): ?array
    {
        try {
            Log::info('Fetching current user information');
            
            // Сначала получаем компании пользователя
            $companies = $this->getCompanies(['my' => 1]);
            if (empty($companies)) {
                Log::warning('No companies found for current user');
                return null;
            }

            $firstCompanyId = $companies[0]['id'];
            Log::info('Found first company', ['company_id' => $firstCompanyId]);

            // Получаем пользователей компании
            $response = $this->http()
                ->get(self::API_BASE_URL . "/company/{$firstCompanyId}/users");

            $users = $this->handleResponse($response, 'getCurrentUser');
            if (!$users) {
                Log::warning('Failed to get users for company', ['company_id' => $firstCompanyId]);
                return null;
            }

            // Ищем текущего пользователя по токену
            foreach ($users as $user) {
                if (isset($user['user_token']) && $user['user_token'] === $this->userToken) {
                    Log::info('Found current user', [
                        'user_id' => $user['id'],
                        'role' => $user['user_role_slug'] ?? null
                    ]);
                    return $user;
                }
            }

            Log::warning('Current user not found in users list');
            return null;

        } catch (\Exception $e) {
            Log::error('Error getting current user:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }


    /**
 * Аутентификация по логину и паролю
 */
public function authenticateByCredentials(string $login, string $password): ?array
{
    $this->lastUsedPhone = $login; // Сохраняем телефон
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

   /**
     * Аутентификация администратора с проверкой роли
     */
    public function authenticateAdmin(string $login, string $password): array
    {
        try {
            // Сначала выполняем базовую аутентификацию
            $authResult = $this->authenticateByCredentials($login, $password);
            
            if (!$authResult['success']) {
                return $authResult;
            }

            // После успешной аутентификации получаем информацию о пользователе
            $userData = $this->getUserRole();
            
            

            if (isset($userData['error'])) {
                return [
                    'success' => false,
                    'message' => $userData['message']
                ];
            }

            // Проверяем роль
            if (!in_array($userData['user_role_slug'], ['owner', 'administrator'])) {
                return [
                    'success' => false,
                    'message' => 'Доступ запрещен: недостаточно прав. Этот бот доступен только для владельцев и администраторов.'
                ];
            }

            // Возвращаем успешный результат с информацией о пользователе
            return [
                'success' => true,
                'token' => $authResult['token'],
                'user' => $userData
            ];

        } catch (\Exception $e) {
            Log::error('Admin authentication error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => 'Ошибка сервиса авторизации'
            ];
        }
    }

    /**
     * Получение информации о роли пользователя
     */
    private function getUserRole(): ?array
    {
        try {
            // Получаем компании пользователя
            $response = $this->http()
                ->get(self::API_BASE_URL . '/companies', ['my' => 1]);
                
            $companies = $this->handleResponse($response, 'getCompanies');
            
            if (empty($companies)) {
                Log::warning('No companies found for user');
                return [
                    'error' => true,
                    'message' => 'У пользователя нет доступных компаний'
                ];
            }
    
            // Берем первую компанию для проверки роли
            $firstCompanyId = $companies[0]['id'];
            
            try {
                // Получаем список пользователей компании
                $response = $this->http()
                    ->get(self::API_BASE_URL . "/company/{$firstCompanyId}/users");
    
                $users = $this->handleResponse($response, 'getUserRole');
                
                if (!$users) {
                    return [
                        'error' => true,
                        'message' => 'Не удалось получить список пользователей'
                    ];
                }
    
                // Ищем текущего пользователя
                foreach ($users as $user) {
                    if (isset($user['phone']) && $this->normalizePhone($user['phone']) === $this->normalizePhone($this->lastUsedPhone)) {
                        return array_merge($user, [
                            'company_id' => $firstCompanyId
                        ]);
                    }
                }
    
                return [
                    'error' => true,
                    'message' => 'Пользователь не найден в списке сотрудников'
                ];
    
            } catch (\Illuminate\Http\Client\RequestException $e) {
                $response = $e->response->json();
                
                // Если получили 403, значит нет прав на просмотр пользователей
                if ($e->response->status() === 403) {
                    return [
                        'error' => true,
                        'message' => 'Доступ запрещен: недостаточно прав. Этот бот доступен только для владельцев и администраторов.'
                    ];
                }
                
                Log::error('Error getting users:', [
                    'status' => $e->response->status(),
                    'response' => $response
                ]);
                
                return [
                    'error' => true,
                    'message' => $response['meta']['message'] ?? 'Ошибка при получении данных пользователей'
                ];
            }
    
        } catch (\Exception $e) {
            Log::error('Error getting user role:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'error' => true,
                'message' => 'Ошибка при проверке прав доступа'
            ];
        }
    }
    

    // Добавим свойство для хранения последнего использованного телефона
    private string $lastUsedPhone = '';

    public function updateMasterDescription(string $phone, string $description): bool
    {
        try {
            Log::info('Starting master description update', [
                'phone' => $phone,
                'description_length' => strlen($description)
            ]);
    
            // 1. Аутентификация через админский аккаунт
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');
    
            $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
            Log::info('Admin authentication result:', [
                'success' => $authResult['success'] ?? false,
                'has_token' => isset($authResult['token'])
            ]);
    
            if (!isset($authResult['success']) || !$authResult['success']) {
                Log::error('Admin authentication failed', ['auth_result' => $authResult]);
                return false;
            }
    
            // 2. Установка админского токена
            $this->setUserToken($authResult['token']);
            Log::info('Admin token set');
    
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
    
            // 4. Получаем актуальные данные мастера
            $response = $this->http()
                ->get(self::API_BASE_URL . "/company/{$masterInfo['company']['id']}/staff/{$masterInfo['master']['id']}");
    
            $staffResponse = $response->json();
            Log::info('Raw staff response:', [
                'status' => $response->status(),
                'response' => $staffResponse
            ]);
    
            if (!isset($staffResponse['success']) || !$staffResponse['success'] || !isset($staffResponse['data'])) {
                Log::error('Invalid staff response format', ['response' => $staffResponse]);
                return false;
            }
    
            $currentStaff = $staffResponse['data'];
            
            Log::info('Retrieved current staff data', [
                'staff_id' => $currentStaff['id'],
                'name' => $currentStaff['name'],
                'specialization' => $currentStaff['specialization'] ?? 'not set'
            ]);
    
            // 5. Обновляем данные, сохраняя текущие значения
            $updateData = [
                'name' => $currentStaff['name'],
                'information' => $description,
                'specialization' => $currentStaff['specialization'],
                'hidden' => $currentStaff['hidden'] ?? 0,
                'fired' => $currentStaff['fired'] ?? 0,
                'user_id' => $currentStaff['user_id'] ?? $masterInfo['master']['user_id']
            ];
    
            Log::info('Updating staff with data', [
                'staff_id' => $masterInfo['master']['id'],
                'update_data' => $updateData
            ]);
    
            try {
                $updateResponse = $this->http()
                    ->put(self::API_BASE_URL . "/staff/{$masterInfo['company']['id']}/{$masterInfo['master']['id']}", 
                        $updateData
                    );
    
                // Логируем ответ API
                Log::info('API Response:', [
                    'status' => $updateResponse->status(),
                    'body' => $updateResponse->json()
                ]);
    
                if ($updateResponse->successful()) {
                    Log::info('Successfully updated staff description');
                    return true;
                }
    
                Log::error('Failed to update staff:', [
                    'status' => $updateResponse->status(),
                    'response' => $updateResponse->json()
                ]);
                return false;
    
            } catch (\Exception $e) {
                Log::error('Error making API request:', [
                    'error' => $e->getMessage(),
                    'response' => $e->response->json() ?? null,
                    'status' => $e->response->status() ?? null
                ]);
                return false;
            }
    
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

public function findMasterInCompanies(string $phone, bool $useAdminAuth = false): ?array 
{
    try {
        // Сохраняем текущий токен, чтобы потом его восстановить
        $originalToken = $this->userToken;
        
        try {
            // Если нужна админская авторизация
            if ($useAdminAuth) {
                $adminLogin = config('services.yclients.admin_login');
                $adminPassword = config('services.yclients.admin_password');

                Log::info('Attempting admin authentication in findMasterInCompanies');
                
                $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
                if (!isset($authResult['success']) || !$authResult['success']) {
                    Log::error('Admin authentication failed', ['auth_result' => $authResult]);
                    return null;
                }

                $this->setUserToken($authResult['token']);
                Log::info('Admin authentication successful');
            }

            // Получаем список компаний
            $companies = $this->getCompanies(['my' => 1, 'active' => 1]);
            Log::info('Searching through companies', [
                'count' => count($companies),
                'using_admin_auth' => $useAdminAuth
            ]);

            $searchPhone = $this->normalizePhone($phone);

            foreach ($companies as $company) {
                Log::info('Checking company', [
                    'company_id' => $company['id'],
                    'company_name' => $company['title']
                ]);

                // Получаем пользователей компании
                $users = $this->getUsers($company['id']);
                
                // Для каждого пользователя
                foreach ($users as $user) {
                    if ($this->normalizePhone($user['phone'] ?? '') === $searchPhone) {
                        Log::info('Found matching user', [
                            'user_id' => $user['id'],
                            'user_name' => $user['name'],
                            'company_id' => $company['id']
                        ]);

                        // Получаем список сотрудников компании
                        $staffResponse = $this->http()
                            ->get(self::API_BASE_URL . "/company/{$company['id']}/staff");
                        
                        $staffList = $this->handleResponse($staffResponse, 'getStaff');

                        if ($staffList) {
                            // Для каждого сотрудника проверяем соответствие user_id
                            foreach ($staffList as $staff) {
                                Log::info('Checking staff member', [
                                    'staff_id' => $staff['id'],
                                    'staff_user_id' => $staff['user_id'] ?? null,
                                    'looking_for_user_id' => $user['id']
                                ]);

                                if (($staff['user_id'] ?? null) === $user['id']) {
                                    Log::info('Found matching staff member', [
                                        'staff_id' => $staff['id'],
                                        'user_id' => $user['id']
                                    ]);

                                    return [
                                        'company' => $company,
                                        'master' => [
                                            'id' => $staff['id'],
                                            'user_id' => $user['id'],
                                            'name' => $staff['name'],
                                            'phone' => $user['phone']
                                        ]
                                    ];
                                }
                            }
                        }
                    }
                }
            }

            Log::error('Master not found in any company', [
                'phone' => $phone,
                'normalized_phone' => $searchPhone
            ]);
            return null;

        } finally {
            // Всегда восстанавливаем оригинальный токен в блоке finally
            if ($useAdminAuth && $originalToken !== null) {
                Log::info('Restoring original token');
                $this->setUserToken($originalToken);
            }
        }

    } catch (\Exception $e) {
        Log::error('Error in findMasterInCompanies:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // В случае ошибки тоже восстанавливаем токен
        if ($useAdminAuth && isset($originalToken)) {
            $this->setUserToken($originalToken);
        }
        
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

    public function getFilialStaff(int $companyId, bool $useAdminAuth = false): ?array 
{
    try {
        // Сохраняем текущий токен
        $originalToken = $this->userToken;
        
        try {
            if ($useAdminAuth) {
                $adminLogin = config('services.yclients.admin_login');
                $adminPassword = config('services.yclients.admin_password');
                
                $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
                if (!$authResult['success']) {
                    return null;
                }
                $this->setUserToken($authResult['token']);
            }

            // Получаем всех сотрудников конкретного филиала
            $response = $this->http()
                ->get(self::API_BASE_URL . "/company/{$companyId}/staff");
            
            return $this->handleResponse($response, 'getFilialStaff');

        } finally {
            if ($useAdminAuth && $originalToken !== null) {
                $this->setUserToken($originalToken);
            }
        }

    } catch (\Exception $e) {
        Log::error('Error getting filial staff:', [
            'error' => $e->getMessage(),
            'company_id' => $companyId
        ]);
        return null;
    }
}

public function getStaff(int $companyId): array
{
    try {
        Log::info('Fetching staff for company', ['company_id' => $companyId]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/staff");

        $data = $this->handleResponse($response, 'getStaff');
        
        // Добавляем подробное логирование
        Log::info('Staff response', [
            'status' => $response->status(),
            'has_data' => !empty($data),
            'staff_count' => count($data ?? []),
            'raw_response' => $response->json() // временно для отладки
        ]);

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
 * Получить график работы сотрудников
 */
public function getStaffSchedule(
    int $companyId,
    string $startDate,
    string $endDate,
    bool $useAdminAuth = false
): ?array {
    try {
        // Сохраняем оригинальный токен
        $originalToken = $this->userToken;

        try {
            if ($useAdminAuth) {
                $adminLogin = config('services.yclients.admin_login');
                $adminPassword = config('services.yclients.admin_password');
                
                Log::info('Attempting admin auth for staff schedule');
                $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
                if (!$authResult['success']) {
                    Log::error('Admin auth failed for staff schedule');
                    return null;
                }
                $this->setUserToken($authResult['token']);
            }

            // 1. Получаем ВСЕХ мастеров компании
            Log::info('Getting staff list from Yclients:', [
                'company_id' => $companyId,
                'url' => self::API_BASE_URL . "/company/{$companyId}/staff"
            ]);

            $staffResponse = $this->http()
                ->get(self::API_BASE_URL . "/company/{$companyId}/staff");
            
            $staffData = $this->handleResponse($staffResponse, 'getStaff');
            if (!$staffData) {
                Log::error('Failed to get staff data');
                return null;
            }

            Log::info('Received staff data:', [
                'count' => count($staffData),
                'staff' => array_map(fn($staff) => [
                    'id' => $staff['id'],
                    'name' => $staff['name']
                ], $staffData)
            ]);

            // Получаем ID всех активных мастеров
            $staffIds = array_map(
                fn($staff) => $staff['id'],
                array_filter($staffData, fn($staff) =>
                    !empty($staff['name']) &&
                    ($staff['fired'] ?? 0) == 0
                )
            );

            // 2. Получаем расписание с указанием staff_ids
            $scheduleParams = [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'staff_ids' => $staffIds,
                'include' => ['busy_intervals', 'off_day_type']
            ];

            Log::info('Getting schedule from Yclients:', [
                'url' => self::API_BASE_URL . "/company/{$companyId}/staff/schedule",
                'params' => $scheduleParams
            ]);

            $scheduleResponse = $this->http()
                ->get(self::API_BASE_URL . "/company/{$companyId}/staff/schedule", $scheduleParams);

            $scheduleData = $this->handleResponse($scheduleResponse, 'getStaffSchedule');

            if ($scheduleData) {
                Log::info('Received schedule data:', [
                    'count' => count($scheduleData),
                    'schedule_sample' => array_slice($scheduleData, 0, 2),
                    'raw_response' => $scheduleData
                ]);
            }

            // 3. Создаем базовый массив для всех мастеров
            $result = [];
            foreach ($staffData as $staff) {
                // Находим расписание мастера
                $schedule = null;
                if ($scheduleData) {
                    foreach ($scheduleData as $s) {
                        if ($s['staff_id'] == $staff['id']) {
                            $schedule = $s;
                            Log::info('Found schedule for staff:', [
                                'staff_id' => $staff['id'],
                                'name' => $staff['name'],
                                'slots_count' => count($s['slots'] ?? []),
                                'schedule_data' => $s
                            ]);
                            break;
                        }
                    }
                }

                // Добавляем мастера в результат
                $staffResult = [
                    'staff_id' => $staff['id'],
                    'name' => $staff['name'],
                    'specialization' => $staff['specialization'] ?? '',
                    'date' => $startDate,
                    'slots' => $schedule['slots'] ?? [],
                    'off_day_type' => $schedule['off_day_type'] ?? null,
                    'busy_intervals' => $schedule['busy_intervals'] ?? [],
                ];

                if (empty($staffResult['slots'])) {
                    Log::info('No slots found for staff:', [
                        'staff_id' => $staff['id'],
                        'name' => $staff['name'],
                        'date' => $startDate,
                        'schedule_found' => $schedule !== null
                    ]);
                }

                $result[] = $staffResult;
            }

            Log::info('Final result:', [
                'total_staff' => count($result),
                'staff_with_slots' => count(array_filter($result, fn($r) => !empty($r['slots']))),
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'company_id' => $companyId,
                'use_admin_auth' => $useAdminAuth
            ]);

            return $result;

        } finally {
            if ($useAdminAuth && $originalToken !== null) {
                $this->setUserToken($originalToken);
            }
        }

    } catch (\Exception $e) {
        Log::error('Error getting staff schedule:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'company_id' => $companyId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
        
        if ($useAdminAuth && isset($originalToken)) {
            $this->setUserToken($originalToken);
        }
        
        return null;
    }
}


/**
 * Установить график работы сотрудников
 */
public function setStaffSchedule(
    int $companyId, 
    array $schedulesToSet = [],
    array $schedulesToDelete = []
): ?array {
    try {
        // Логируем входные данные
        Log::info('setStaffSchedule input data:', [
            'companyId' => $companyId,
            'schedulesToSet (raw)' => $schedulesToSet,
            'schedulesToDelete (raw)' => $schedulesToDelete
        ]);

        // Группируем расписания по staff_id для установки
        $groupedSchedulesToSet = [];
        foreach ($schedulesToSet as $schedule) {
            Log::info('Processing schedule to set:', [
                'original' => $schedule,
                'staff_id' => $schedule['staff_id'] ?? 'missing',
                'date' => $schedule['date'] ?? 'missing',
                'slots' => $schedule['slots'] ?? 'missing'
            ]);

            $staffId = $schedule['staff_id'];
            if (!isset($groupedSchedulesToSet[$staffId])) {
                $groupedSchedulesToSet[$staffId] = [
                    'staff_id' => $staffId,
                    'dates' => [],
                    'slots' => $schedule['slots']
                ];
            }
            $groupedSchedulesToSet[$staffId]['dates'][] = $schedule['date'];

            Log::info('Grouped schedule:', $groupedSchedulesToSet[$staffId]);
        }

        // Группируем расписания по staff_id для удаления
        $groupedSchedulesToDelete = [];
        foreach ($schedulesToDelete as $schedule) {
            Log::info('Processing schedule to delete:', [
                'original' => $schedule,
                'staff_id' => $schedule['staff_id'] ?? 'missing',
                'date' => $schedule['date'] ?? 'missing'
            ]);

            $staffId = $schedule['staff_id'];
            if (!isset($groupedSchedulesToDelete[$staffId])) {
                $groupedSchedulesToDelete[$staffId] = [
                    'staff_id' => $staffId,
                    'dates' => []
                ];
            }
            $groupedSchedulesToDelete[$staffId]['dates'][] = $schedule['date'];

            Log::info('Grouped delete schedule:', $groupedSchedulesToDelete[$staffId]);
        }

        $payload = [
            'schedules_to_set' => array_values($groupedSchedulesToSet),
            'schedules_to_delete' => array_values($groupedSchedulesToDelete)
        ];

        // Логируем финальный payload
        Log::info('Final payload for Yclients API:', [
            'url' => self::API_BASE_URL . "/company/{$companyId}/staff/schedule",
            'payload' => json_encode($payload, JSON_PRETTY_PRINT),
            'payload_structure' => print_r($payload, true)
        ]);

        try {
            $response = $this->http()
                ->put(self::API_BASE_URL . "/company/{$companyId}/staff/schedule", $payload);
                
            return $response->json();
            
        } catch (\Illuminate\Http\Client\RequestException $e) {
            // Логируем детальную информацию об ошибке
            Log::error('Detailed API Error Response:', [
                'status' => $e->response->status(),
                'headers' => $e->response->headers(),
                'full_body' => $e->response->body(),
                'decoded_body' => json_decode($e->response->body(), true),
                'url' => self::API_BASE_URL . "/company/{$companyId}/staff/schedule",
                'sent_payload' => $payload
            ]);
            
            return null;
        }

    } catch (\Exception $e) {
        Log::error('Exception in setStaffSchedule:', [
            'error' => $e->getMessage(),
            'error_class' => get_class($e),
            'company_id' => $companyId,
            'trace' => $e->getTraceAsString(),
            'payload' => isset($payload) ? json_encode($payload, JSON_PRETTY_PRINT) : null,
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ]);
        return null;
    }
}



public function updateMasterPhoto($photoFile, string $phone): array
{
    try {
        Log::info('Starting master photo update', [
            'phone' => $phone,
            'file_size' => $photoFile->getSize()
        ]);

        // 1. Аутентификация через админский аккаунт
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
        Log::info('Admin authentication result:', [
            'success' => $authResult['success'] ?? false,
            'has_token' => isset($authResult['token'])
        ]);

        if (!isset($authResult['success']) || !$authResult['success']) {
            throw new \Exception('Admin authentication failed');
        }

        // 2. Установка админского токена
        $this->setUserToken($authResult['token']);
        Log::info('Admin token set');

        // 3. Поиск мастера по всем филиалам
        Log::info('Searching for master in all companies');
        $masterInfo = $this->findMasterInCompanies($phone, true);

        if (!$masterInfo) {
            throw new \Exception('Мастер не найден в системе');
        }

        Log::info('Master found', [
            'company_id' => $masterInfo['company']['id'],
            'company_name' => $masterInfo['company']['title'],
            'master_id' => $masterInfo['master']['id']
        ]);

        // 4. Загружаем фото
        $uploadResult = $this->uploadPhotoToYclients(
            $masterInfo['company']['id'],
            $masterInfo['master']['id'],
            $photoFile
        );

        if (!$uploadResult) {
            throw new \Exception('Ошибка при загрузке фото');
        }

        return [
            'success' => true,
            'message' => 'Фото успешно обновлено'
        ];

    } catch (\Exception $e) {
        Log::error('Error in updateMasterPhoto:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        throw $e;
    }
}

private function uploadPhotoToYclients(int $companyId, int $staffId, $photoFile): bool
{
    $tempPath = null;
    
    try {
        Log::info('Начинаем обновление фото в Yclients', [
            'company_id' => $companyId,
            'staff_id' => $staffId
        ]);

        // Получаем текущие данные сотрудника
        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/staff/{$staffId}");

        $staffData = $response->json();
        Log::info('Получены текущие данные сотрудника:', [
            'success' => $staffData['success'] ?? false,
            'has_data' => isset($staffData['data']),
            'staff_name' => $staffData['data']['name'] ?? null,
        ]);
        
        if (!isset($staffData['success']) || !$staffData['success'] || !isset($staffData['data'])) {
            throw new \Exception('Не удалось получить данные сотрудника');
        }

        $currentStaff = $staffData['data'];

        // Создаем временный файл для обработки изображения
        $tempPath = storage_path('app/temp/' . uniqid('yclients_photo_') . '.jpg');
        if (!is_dir(dirname($tempPath))) {
            mkdir(dirname($tempPath), 0755, true);
        }
        
        Log::info('Создан временный файл:', ['path' => $tempPath]);
        
        // Обрабатываем изображение
        $manager = new ImageManager(new Driver());
        $image = $manager->read($photoFile);
        
        Log::info('Размеры оригинального изображения:', [
            'width' => $image->width(),
            'height' => $image->height()
        ]);
        
        // Делаем изображение квадратным
        $size = min($image->width(), $image->height());
        $image->cover($size, $size);
        
        // Изменяем размер до требуемого
        $image->resize(800, 800, function ($constraint) {
            $constraint->aspectRatio();
            $constraint->upsize();
        });

        // Сохраняем оптимизированное изображение
        $image->toJpeg(80)->save($tempPath);
        
        // Конвертируем изображение в base64
        $imageBase64 = base64_encode(file_get_contents($tempPath));
        
        // Формируем данные для обновления
        $updateData = [
            'name' => $currentStaff['name'],
            'information' => $currentStaff['information'] ?? '',
            'specialization' => $currentStaff['specialization'] ?? '',
            'hidden' => $currentStaff['hidden'] ?? 0,
            'fired' => $currentStaff['fired'] ?? 0,
            'user_id' => $currentStaff['user_id'] ?? null,
            'avatar' => 'data:image/jpeg;base64,' . $imageBase64
        ];

        Log::info('Отправляем запрос на обновление данных сотрудника');

        // Отправляем PUT-запрос для обновления данных сотрудника
        $updateResponse = $this->http()
            ->put(self::API_BASE_URL . "/staff/{$companyId}/{$staffId}", $updateData);

        Log::info('Получен ответ на обновление:', [
            'status' => $updateResponse->status(),
            'body' => $updateResponse->json()
        ]);

        if (!$updateResponse->successful()) {
            throw new \Exception('Не удалось обновить данные сотрудника: ' . $updateResponse->body());
        }

        return true;

    } catch (\Exception $e) {
        Log::error('Ошибка при обновлении фото в Yclients:', [
            'error' => $e->getMessage(),
            'company_id' => $companyId,
            'staff_id' => $staffId,
            'trace' => $e->getTraceAsString()
        ]);

        throw $e;

    } finally {
        // Удаляем временный файл
        if ($tempPath && file_exists($tempPath)) {
            unlink($tempPath);
            Log::info('Временный файл удален', ['path' => $tempPath]);
        }
    }
}

private function getAuthorizationHeader(): string
{
    $partnerToken = config('services.yclients.token');
    $userToken = $this->userToken;
    
    return "Bearer {$partnerToken}" . ($userToken ? ", User {$userToken}" : '');
}

public function getMasterPhoto(int $companyId, int $staffId): ?string 
{
    try {
        Log::info('Getting master photo', [
            'company_id' => $companyId,
            'staff_id' => $staffId
        ]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/staff/{$staffId}");

        $data = $this->handleResponse($response, 'getMasterPhoto');

        if (!$data) {
            Log::warning('No data received from Yclients for master photo');
            return null;
        }

        // В ответе API будет поле avatar_big с полным URL фото
        $photoUrl = $data['avatar_big'] ?? null;

        Log::info('Master photo URL retrieved', [
            'has_photo' => !empty($photoUrl),
            'url' => $photoUrl
        ]);

        return $photoUrl;

    } catch (\Exception $e) {
        Log::error('Error getting master photo from Yclients:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'company_id' => $companyId,
            'staff_id' => $staffId
        ]);
        return null;
    }
}

public function createStaff(int $companyId, array $staffData): ?array
{
    try {
        // Авторизация админа
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        Log::info('Authenticating with Yclients admin');
        $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
        if (!$authResult['success']) {
            throw new \Exception('Failed to authenticate with Yclients: ' . ($authResult['message'] ?? 'Unknown error'));
        }

        Log::info('Authentication successful, token received');
        $this->setUserToken($authResult['token']);

        // Форматируем данные в соответствии с требованиями API
        $formattedData = [
            'name' => $staffData['name'],
            'specialization' => $staffData['specialization'],
            'position_id' => null,  // API требует null
            'phone_number' => $staffData['phone_number'],
            'user_phone' => $staffData['phone_number'],  // добавляем требуемое поле
            'user_email' => $staffData['email'],  // используем email из staffData
            'is_user_invite' => false  // добавляем требуемое поле
        ];

        Log::info('Sending request to Yclients:', [
            'url' => self::API_BASE_URL . "/company/{$companyId}/staff/quick",
            'data' => $formattedData
        ]);

        try {
            $response = $this->http()
                ->post(self::API_BASE_URL . "/company/{$companyId}/staff/quick", $formattedData);

            $responseData = $response->json();
            Log::info('Yclients API response:', [
                'status' => $response->status(),
                'body' => $responseData
            ]);

            if ($response->status() === 422) {
                Log::error('Validation error from Yclients:', [
                    'errors' => $responseData['meta']['errors'] ?? $responseData
                ]);
                throw new \Exception('Validation error: ' . json_encode($responseData));
            }

            if (!isset($responseData['success']) || !$responseData['success']) {
                throw new \Exception('API error: ' . json_encode($responseData));
            }

            return [
                'success' => true,
                'data' => $responseData['data']
            ];

        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Request exception:', [
                'status' => $e->response->status(),
                'body' => $e->response->json() ?? $e->response->body()
            ]);
            throw $e;
        }

    } catch (\Exception $e) {
        Log::error('Exception in createStaff:', [
            'message' => $e->getMessage(),
            'company_id' => $companyId,
            'staff_data' => $formattedData ?? $staffData,
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

public function sendUserInvite(int $companyId, string $phone, string $email): bool
{
    try {
        Log::info('Sending user invite', [
            'company_id' => $companyId,
            'phone' => $phone,
            'email' => $email
        ]);

        // Авторизуемся как админ
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->authenticateByCredentials($adminLogin, $adminPassword);
        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Failed to authenticate as admin for sending invite');
            return false;
        }

        $this->setUserToken($authResult['token']);

        // Форматируем телефон
        $phoneNumber = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phoneNumber) === 11) {
            $phoneNumber = substr($phoneNumber, 1);
        }

        // Формируем данные для приглашения
        $payload = [
            'invites' => [
                [
                    'phone' => $phoneNumber,
                    'email' => $email,
                    'role_id' => 2,
                    'name' => 'Мастер',
                    'rights' => [
                        'is_employee' => true,
                        'master_priority' => 0,
                        'has_access_to_pos' => false,
                        'has_access_to_finances' => false,
                        'position_id' => null
                    ],
                    'is_employee' => true,
                    'search' => $phoneNumber // Добавляем поле search с номером телефона
                ]
            ],
            'company_id' => $companyId // Добавляем ID компании на верхний уровень
        ];

        Log::info('Sending invite with payload:', ['payload' => $payload]);

        $response = $this->http()
            ->post(self::API_BASE_URL . "/user/invite/{$companyId}", $payload);

        $result = $response->json();
        
        Log::info('Invite response:', [
            'status' => $response->status(),
            'response' => $result
        ]);

        return isset($result['success']) && $result['success'];

    } catch (\Exception $e) {
        if ($e instanceof \Illuminate\Http\Client\RequestException) {
            Log::error('Full error response from Yclients:', [
                'error' => $e->getMessage(),
                'response' => $e->response->json(),
                'status' => $e->response->status()
            ]);
        }
        
        Log::error('Error sending user invite:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

/**
 * Получить записи мастера
 */
public function getRecords(int $companyId, array $params = []): ?array
{
    try {
        

        $queryParams = array_merge([
            'page' => 1,
            'count' => 100,
            'with_deleted' => 0
        ], $params);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/records/{$companyId}", [
                'query' => $queryParams
            ]);

        $responseData = $response->json();

        // Проверяем успешность запроса, а не наличие данных
        if (!isset($responseData['success']) || !$responseData['success']) {
            return null;
        }

        // Даже если записей нет, возвращаем пустой массив
        $records = $responseData['data'] ?? [];

        // Фильтруем записи только для указанного мастера
        if (isset($params['staff_id'])) {
            $records = array_filter($records, function($record) use ($params) {
                return $record['staff_id'] == $params['staff_id'];
            });
        }

        // Оставляем только будущие записи
        $records = array_filter($records, function($record) {
            $recordDate = strtotime($record['date']);
            return $recordDate >= strtotime('today');
        });

        // Сортируем по дате
        usort($records, function($a, $b) {
            return strtotime($a['date']) - strtotime($b['date']);
        });

        Log::info('Filtered records for master', [
            'total_count' => count($records),
            'staff_id' => $params['staff_id'] ?? 'all'
        ]);

        // Возвращаем массив в любом случае, даже если он пустой
        return array_values($records);

    } catch (\Exception $e) {
        Log::error('Error getting records from YClients:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Получить конкретную запись
 */
public function getRecord(int $companyId, string $recordId): ?array
{
    try {
       

        $response = $this->http()
            ->get(self::API_BASE_URL . "/record/{$companyId}/{$recordId}");

        $result = $this->handleResponse($response, 'getRecord');

        if (!$result) {
            Log::error('Empty response when getting record details', [
                'company_id' => $companyId,
                'record_id' => $recordId
            ]);
            return null;
        }

        // Трансформируем данные записи в нужный формат
        return [
            'id' => $result['id'],
            'date' => $result['date'],
            'services' => array_map(function($service) {
                return [
                    'id' => $service['id'],
                    'title' => $service['title'],
                    'cost' => $service['cost'],
                    'length' => $service['length'] ?? null
                ];
            }, $result['services'] ?? []),
            'client' => [
                'name' => $result['client']['name'] ?? 'Клиент',
                'phone' => $result['client']['phone'] ?? null,
                'email' => $result['client']['email'] ?? null
            ],
            'status' => $result['visit_attendance'],
            'comment' => $result['comment'],
            'length' => $result['seance_length'],
            'staff_id' => $result['staff_id'],
            'created_date' => $result['create_date'],
            'last_change_date' => $result['last_change_date'],
            'sms_before' => $result['sms_before'],
            'email_before' => $result['email_now'],
            'attendance' => $result['attendance']
        ];

    } catch (\Exception $e) {
        Log::error('Error getting record details from YClients:', [
            'company_id' => $companyId,
            'record_id' => $recordId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

public function cancelRecord(int $companyId, string $recordId): bool
{
    try {
        Log::info('Cancelling record in YClients', [
            'company_id' => $companyId,
            'record_id' => $recordId
        ]);

        $response = $this->http()
            ->delete(self::API_BASE_URL . "/record/{$companyId}/{$recordId}");

        // Успешное удаление возвращает 204 No Content
        $success = $response->status() === 204;

        Log::info('Record cancellation result', [
            'success' => $success,
            'status' => $response->status()
        ]);

        return $success;

    } catch (\Exception $e) {
        Log::error('Error cancelling record in YClients:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

public function updateRecord(int $companyId, string $recordId, array $updateData): ?array
{
    try {
        Log::info('Updating record in YClients', [
            'company_id' => $companyId,
            'record_id' => $recordId,
            'update_data' => $updateData
        ]);

        // Сначала получим текущую запись
        $currentRecord = $this->getRecord($companyId, $recordId);
        if (!$currentRecord) {
            Log::error('Failed to get current record for update');
            return null;
        }

        // Получаем текущие услуги и обрабатываем их удаление, если требуется
        $currentServices = $currentRecord['services'] ?? [];
        if (isset($updateData['services']['remove'])) {
            $serviceIdsToRemove = $updateData['services']['remove'];
            $currentServices = array_filter($currentServices, function($service) use ($serviceIdsToRemove) {
                return !in_array($service['id'], $serviceIdsToRemove);
            });
            // Сбрасываем индексы массива
            $currentServices = array_values($currentServices);
        }

        // Обработка добавления услуг
        if (isset($updateData['services']['add'])) {
            foreach ($updateData['services']['add'] as $newService) {
                if (!isset($newService['cost'])) {
                    // Если цена не передана, получаем ее из сервиса
                    $serviceDetails = $this->getService($companyId, $newService['id']);
                    $cost = $serviceDetails ? floatval($serviceDetails['price_min']) : 0;
                } else {
                    $cost = floatval($newService['cost']);
                }

                $currentServices[] = [
                    'id' => $newService['id'],
                    'cost' => $cost,
                    'first_cost' => $newService['first_cost'] ?? $cost,
                    'discount' => $newService['discount'] ?? 0
                ];
            }
        }

        // Подготовим данные для обновления, учитывая реальные ключи из API
        $requestData = [
            'staff_id' => $currentRecord['staff_id'],
            'services' => array_map(function($service) {
                return [
                    'id' => $service['id'],
                    'cost' => $service['cost'],
                    'first_cost' => $service['first_cost'] ?? $service['cost'],
                    'discount' => $service['discount'] ?? 0
                ];
            }, $currentServices),
            'client' => array_merge(
                [
                    'name' => $currentRecord['client']['name'] ?? '',
                    'surname' => $currentRecord['client']['surname'] ?? '',
                    'patronymic' => $currentRecord['client']['patronymic'] ?? '',
                    'phone' => $currentRecord['client']['phone'] ?? '',
                    'email' => $currentRecord['client']['email'] ?? ''
                ],
                $updateData['client'] ?? []
            ),
            'datetime' => $currentRecord['date'] ?? $currentRecord['datetime'],
            'seance_length' => $currentRecord['length'] ?? 3600,
            'save_if_busy' => true,
            'attendance' => $currentRecord['attendance'] ?? 0,
            'comment' => $currentRecord['comment'] ?? '',
            'send_sms' => false
        ];

        // Логируем подготовленные данные
        Log::info('Prepared update data', [
            'request_data' => $requestData
        ]);

        $response = $this->http()
            ->put(self::API_BASE_URL . "/record/{$companyId}/{$recordId}", $requestData);

        $responseData = $response->json();

        Log::info('Update record response', [
            'response' => $responseData
        ]);

        if (!isset($responseData['success']) || !$responseData['success']) {
            Log::error('Failed to update record', [
                'response' => $responseData
            ]);
            return null;
        }

        return $responseData['data'] ?? null;

    } catch (\Exception $e) {
        Log::error('Error updating record in YClients:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

public function getService(int $companyId, int $serviceId): ?array
{
    try {
        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/services/{$serviceId}");

        $responseData = $response->json();

        if (!isset($responseData['success']) || !$responseData['success']) {
            Log::error('Failed to get service details', [
                'response' => $responseData
            ]);
            return null;
        }

        return $responseData['data'] ?? null;

    } catch (\Exception $e) {
        Log::error('Error getting service details:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Получить категории услуг для изменения времени
 */
public function getServiceCategoriesForTimeChange(int $companyId, array $params = []): ?array
{
    try {
        Log::info('Getting service categories for time change', [
            'company_id' => $companyId,
            'params' => $params
        ]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/service_categories", $params);

        $data = $this->handleResponse($response, 'getServiceCategoriesForTimeChange');
        
        if (!$data) {
            Log::error('Failed to get service categories for time change', [
                'company_id' => $companyId,
                'response' => $response->json()
            ]);
            return null;
        }

        return $data;

    } catch (\Exception $e) {
        Log::error('Error getting service categories for time change:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Get service categories for a company
 *
 * @param int $companyId The ID of the company
 * @param array $params Optional parameters
 * @return array|null Array of service categories or null on failure
 */
public function getServiceCategories(int $companyId, array $params = []): ?array
{
    try {
        Log::info('Getting service categories', [
            'company_id' => $companyId,
            'params' => $params
        ]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/service_categories", $params);

        $data = $this->handleResponse($response, 'getServiceCategories');
        
        if (!$data) {
            Log::error('Failed to get service categories', [
                'company_id' => $companyId,
                'response' => $response->json()
            ]);
            return null;
        }

        return $data;

    } catch (\Exception $e) {
        Log::error('Error getting service categories:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Получить данные услуги для изменения времени
 */
public function getServiceDetailsForTimeChange(int $companyId, int $serviceId): ?array
{
    try {
        Log::info('Getting service details for time change', [
            'company_id' => $companyId,
            'service_id' => $serviceId
        ]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/services/{$serviceId}");

        $data = $this->handleResponse($response, 'getServiceDetailsForTimeChange');
        
        if (!$data) {
            return null;
        }

        return $data;

    } catch (\Exception $e) {
        Log::error('Error getting service details for time change:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Обновить время оказания услуги мастером
 */
public function updateServiceTimeForMaster(int $companyId, int $serviceId, array $staffSettings): ?array
{
    try {
        $response = $this->http()
            ->post(self::API_BASE_URL . "/company/{$companyId}/services/links", [
                'service_id' => $serviceId,
                'master_settings' => array_map(function($setting) {
                    $totalMinutes = $setting['seance_length'] / 60;
                    return [
                        'master_id' => $setting['staff_id'],
                        'technological_card_id' => 0, // Используем 0 как значение по умолчанию
                        'hours' => floor($totalMinutes / 60),
                        'minutes' => $totalMinutes % 60,
                        'price' => null
                    ];
                }, $staffSettings),
                'resource_ids' => [], // Пустой массив для ресурсов
                'translations' => [
                    [
                        'language_id' => 1,
                        'translation' => ''
                    ]
                ]
            ]);

        return $this->handleResponse($response, 'updateServiceTimeForMaster');

    } catch (\Exception $e) {
        Log::error('Error updating service time:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'company_id' => $companyId,
            'service_id' => $serviceId,
            'staff_settings' => $staffSettings
        ]);
        throw new \Exception('Failed to update service duration: ' . $e->getMessage());
    }
}

/**
 * Получить список услуг для изменения времени
 */
public function getServicesForTimeChange(int $companyId, array $params = []): ?array
{
    try {
        Log::info('Getting services for time change', [
            'company_id' => $companyId,
            'params' => $params
        ]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/services", $params);

        $data = $this->handleResponse($response, 'getServicesForTimeChange');
        
        if (!$data) {
            return null;
        }

        // Фильтруем по мастеру и категории
        if (isset($params['staff_id'])) {
            $staffId = $params['staff_id'];
            $data = array_filter($data, function($service) use ($staffId) {
                return !empty($service['staff']) && 
                       in_array($staffId, array_column($service['staff'], 'id'));
            });
        }

        if (isset($params['category_id'])) {
            $categoryId = $params['category_id'];
            $data = array_filter($data, function($service) use ($categoryId) {
                return $service['category_id'] == $categoryId;
            });
        }

        return array_values($data);

    } catch (\Exception $e) {
        Log::error('Error getting services for time change:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

public function getServicesByStaff(int $companyId, int $staffId): ?array
{
    try {
        Log::info('Getting services by staff', [
            'company_id' => $companyId,
            'staff_id' => $staffId
        ]);

        // Формируем query-параметры: только staff_id
        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/services", [
                'query' => ['staff_id' => $staffId]
            ]);

        $responseData = $response->json();

        // Проверяем поле 'success'
        if (empty($responseData['success'])) {
            Log::error('Failed to get services by staff', [
                'responseData' => $responseData
            ]);
            return null;
        }

        // Можно дополнительно проверить, что в data действительно массив
        return $responseData['data'] ?? null;

    } catch (\Exception $e) {
        Log::error('Error getting services by staff:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}


public function getServices(int $companyId, int $categoryId = null): ?array
{
    try {
        Log::info('Getting services for company and category', [
            'company_id' => $companyId,
            'category_id' => $categoryId
        ]);

        // Если есть category_id, передаем его в query, иначе пустой массив
        $response = $this->http()
            ->get(self::API_BASE_URL . "/company/{$companyId}/services", [
                'query' => $categoryId ? ['category_id' => $categoryId] : []
            ]);

        $responseData = $response->json();

        // Если ответ неуспешный
        if (!isset($responseData['success']) || !$responseData['success']) {
            Log::error('Failed to get services');
            return null;
        }

        // Если есть category_id, дополнительно отфильтруем услуги в PHP-коде,
        // (на случай если в ответе почему-то пришли услуги из других категорий)
        if ($categoryId && isset($responseData['data'])) {
            $filteredServices = array_filter($responseData['data'], function($service) use ($categoryId) {
                // Убедимся, что у услуги есть ключ 'category_id'
                return isset($service['category_id']) && $service['category_id'] == $categoryId;
            });
            
            return array_values($filteredServices);
        }

        // Если category_id не задан или никаких фильтраций не нужно
        return $responseData['data'] ?? null;

    } catch (\Exception $e) {
        Log::error('Error getting services by category:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}


public function getProducts(int $companyId): ?array
{
    try {
        Log::info('Getting products for company', [
            'company_id' => $companyId
        ]);

        $response = $this->http()
            ->get(self::API_BASE_URL . "/goods/{$companyId}");

        $data = $this->handleResponse($response, 'getProducts');
        
        // Логируем результат
        Log::info('Products response', [
            'status' => $response->status(),
            'has_data' => !empty($data),
            'products_count' => count($data ?? [])
        ]);

        if (!$data) {
            return null;
        }

        // Форматируем ответ
        return [
            'success' => true,
            'data' => array_map(function($product) {
                return [
                    'good_id' => $product['good_id'],
                    'title' => $product['title'],
                    'actual_amounts' => $product['actual_amounts'] ?? []
                ];
            }, $data)
        ];

    } catch (\Exception $e) {
        Log::error('Failed to get products', [
            'company_id' => $companyId,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}

/**
 * Получить расчет зарплаты мастера
 *
 * @param int $companyId ID компании
 * @param int $staffId ID сотрудника
 * @param string $dateFrom Дата начала в формате Y-m-d
 * @param string $dateTo Дата окончания в формате Y-m-d
 * @return array|null
 */
public function getMasterSalary(int $companyId, int $staffId, string $dateFrom, string $dateTo): ?array
{
    try {
        $url = self::API_BASE_URL . "/company/{$companyId}/salary/period/staff/{$staffId}";
        
        $params = [
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ];

        Log::info('Making salary request to YClients', [
            'url' => $url,
            'params' => $params
        ]);

        $response = $this->http()->get($url, $params);
        $result = $response->json();

        Log::info('Raw YClients salary response', [
            'response' => $result
        ]);

        if (!$response->successful()) {
            Log::error('Failed to get salary data', [
                'status' => $response->status(),
                'response' => $result
            ]);
            return null;
        }

        return [
            'success' => true,
            'data' => [
                'salary' => [
                    'services_total' => (float) $result['data']['services_sum'],
                    'products_total' => (float) $result['data']['goods_sales_sum'],
                    'total' => (float) $result['data']['salary'],
                    'services_count' => $result['data']['services_count'],
                    'products_count' => $result['data']['goods_sales_count'],
                    'working_days' => $result['data']['working_days_count'],
                    'working_hours' => $result['data']['working_hours_count']
                ],
                'period' => [
                    'from' => $dateFrom,
                    'to' => $dateTo
                ]
            ]
        ];

    } catch (\Exception $e) {
        Log::error('Error getting master salary:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Получить цены услуг для админа
 */
public function getServicePrices(string $userToken, int $companyId, ?int $categoryId = null): ?array
{
    try {
        $url = self::API_BASE_URL . "/company/{$companyId}/services";
        $params = [];
        if ($categoryId) {
            $params['category_id'] = $categoryId;
        }

        $this->setUserToken($userToken);
        $response = $this->http()->get($url, $params);

        return $this->handleResponse($response, 'getServicePrices');
    } catch (\Exception $e) {
        Log::error('Error getting service prices:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return null;
    }
}

/**
 * Обновить цену услуги
 */
public function updateServicePrice(
    string $userToken, 
    int $companyId, 
    int $serviceId, 
    float $price
): ?array {
    try {
        $this->setUserToken($userToken);

        // Сначала получаем текущие данные услуги
        $currentService = $this->getService($companyId, $serviceId);
        if (!$currentService) {
            throw new \Exception('Service not found');
        }

        // Подготавливаем данные для обновления, сохраняя все текущие параметры
        $updateData = array_merge($currentService, [
            'price_min' => $price,
            'price_max' => $price
        ]);

        $response = $this->http()
            ->patch(self::API_BASE_URL . "/company/{$companyId}/services/{$serviceId}", 
                $updateData
            );

        $result = $this->handleResponse($response, 'updateServicePrice');
        
        return [
            'success' => !empty($result),
            'message' => empty($result) ? 'Failed to update price' : 'Price updated successfully',
            'data' => $result
        ];

    } catch (\Exception $e) {
        Log::error('Error updating service price:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'message' => 'Error updating price: ' . $e->getMessage()
        ];
    }
}

/**
 * Массовое обновление цен услуг
 */
public function bulkUpdateServicePrices(
    string $userToken,
    array $updates // [[company_id, service_id, new_price], ...]
): array {
    $results = [
        'success' => 0,
        'failed' => 0,
        'errors' => []
    ];

    $this->setUserToken($userToken);

    foreach ($updates as $update) {
        try {
            $result = $this->updateServicePrice(
                $userToken,
                $update['company_id'],
                $update['service_id'],
                $update['new_price']
            );

            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'company_id' => $update['company_id'],
                    'service_id' => $update['service_id'],
                    'error' => $result['message']
                ];
            }
        } catch (\Exception $e) {
            $results['failed']++;
            $results['errors'][] = [
                'company_id' => $update['company_id'],
                'service_id' => $update['service_id'],
                'error' => $e->getMessage()
            ];
        }
    }

    return $results;
}

}



