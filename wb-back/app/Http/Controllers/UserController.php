<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Employee; // Добавляем импорт модели Employee
use App\Models\Branch;
use App\Models\EmployeeRegistration;
use App\Models\WarehouseNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log; // Добавляем этот импорт
use Illuminate\Http\Request; // Добавьте этот импорт
use App\Services\YclientsService;
use Illuminate\Support\Facades\Redis;
use Vgrish\YclientsOpenApi\Model\AuthUserRequest;
use App\Models\AdminNotification;
use Carbon\Carbon;
use App\Models\AdminTask;
use App\Models\TaskNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;  // вместо App\Http\Controllers\JsonResponse



class UserController extends Controller
{

    protected $yclientsService;

    public function __construct(YclientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
    }

    // app/Http/Controllers/UserController.php
public function getCompanies(Request $request)
{
    try {
        Log::info('Getting companies list');

        // Получаем админские креды
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        // Авторизуемся через админа
        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Admin authentication failed', ['auth_result' => $authResult]);
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        // Устанавливаем токен
        $this->yclientsService->setUserToken($authResult['token']);

        // Получаем компании
        $companies = $this->yclientsService->getCompanies([
            'active' => 1,
            'my' => 1
        ]);

        if (!$companies) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить список компаний'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $companies
        ]);

    } catch (\Exception $e) {
        Log::error('Error getting companies:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении списка компаний'
        ], 500);
    }
}

public function getMasterSalary(Request $request)
{
    try {
        // Для тестирования игнорируем переданные параметры
        // и используем хардкод данных конкретного мастера
        $companyId = 490462;
        $staffId = 1731160;
        $startDate = '2024-11-01';
        $endDate = '2024-12-02';

        // Админские креды для авторизации
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Admin authentication failed', ['auth_result' => $authResult]);
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        // Устанавливаем токен для запросов
        $this->yclientsService->setUserToken($authResult['token']);

        // Получаем данные о зарплате
        $salaryData = $this->yclientsService->getMasterSalary(
            $companyId,
            $staffId,
            $startDate,
            $endDate
        );

        if (!$salaryData) {
            Log::error('Failed to get salary data', [
                'company_id' => $companyId,
                'staff_id' => $staffId,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить данные о зарплате'
            ], 500);
        }

        Log::info('Successfully retrieved salary data', [
            'data' => $salaryData
        ]);

        return response()->json($salaryData);

    } catch (\Exception $e) {
        Log::error('Error getting master salary:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении данных о зарплате'
        ], 500);
    }
}

public function getProducts(int $companyId)
{
    try {
        // Используем админскую авторизацию для доступа к данным
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Admin authentication failed', ['auth_result' => $authResult]);
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Получаем товары
        $products = $this->yclientsService->getProducts($companyId);

        if (!$products) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить список товаров'
            ], 404);
        }

        return response()->json($products);

    } catch (\Exception $e) {
        Log::error('Error getting products:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении списка товаров'
        ], 500);
    }
}

public function getMasterPhoto(Request $request)
{
    try {
        $data = $request->validate([
            'phone' => 'required|string'
        ]);

        Log::info('Getting master photo request', [
            'phone' => $data['phone']
        ]);

        // Используем админский доступ для получения данных мастера
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Admin authentication failed', ['auth_result' => $authResult]);
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Ищем мастера по номеру телефона
        $masterInfo = $this->yclientsService->findMasterInCompanies(
            $data['phone'],
            true
        );

        if (!$masterInfo) {
            Log::warning('Master not found', ['phone' => $data['phone']]);
            return response()->json([
                'success' => false,
                'message' => 'Мастер не найден'
            ], 404);
        }

        Log::info('Master found', [
            'company_id' => $masterInfo['company']['id'],
            'master_id' => $masterInfo['master']['id']
        ]);

        // Получаем URL фото мастера
        $photoUrl = $this->yclientsService->getMasterPhoto(
            $masterInfo['company']['id'],
            $masterInfo['master']['id']
        );

        if (!$photoUrl) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить фото мастера'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'photo_url' => $photoUrl
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('Error in getMasterPhoto:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении фото мастера'
        ], 500);
    }
}

private function sendMessageToClient($chatId, $message, $keyboard = null)
    {
        try {
            $botToken = env('TELEGRAM_BOT_TOKEN_SUPPLIES_NEW');
            $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
            
            $data = [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML'
            ];

            if ($keyboard) {
                $data['reply_markup'] = json_encode([
                    'inline_keyboard' => [$keyboard]
                ]);
            }

            $response = Http::post($url, $data);
            
            Log::info('Telegram API response:', [
                'status' => $response->status(),
                'body' => $response->json()
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Error sending Telegram message:', [
                'chat_id' => $chatId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function sendAdminNotification(Request $request)
{
    try {
        $data = $request->validate([
            'task_id' => 'required|integer',
            'type' => 'required|string'
        ]);

        // Получаем задачу
        $task = AdminTask::find($data['task_id']);
        if (!$task) {
            Log::error('Task not found', ['task_id' => $data['task_id']]);
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Задача не найдена',
                'data' => null
            ], 404);
        }

        Log::info('Found task:', ['task' => $task->toArray()]);

        // Получаем уникальные telegram_id
        $adminTelegramIds = AdminNotification::select('telegram_id')
            ->distinct()
            ->whereNotNull('telegram_id')
            ->pluck('telegram_id')
            ->filter();

        Log::info('Found admin telegram IDs:', ['ids' => $adminTelegramIds->toArray()]);

        if ($adminTelegramIds->isEmpty()) {
            Log::warning('No admin telegram IDs found');
            return response()->json([
                'status' => 'warning',
                'success' => true,
                'data' => $task,
                'message' => 'Не найдены администраторы для отправки уведомлений'
            ]);
        }

        $botToken = config('services.telegram.bot_token_supplies');
        Log::info('Bot token length:', ['length' => strlen($botToken)]);

        $typeInfo = $this->getNotificationTypeInfo($data['type']);
        $notificationsSent = 0;

        foreach ($adminTelegramIds as $telegramId) {
            try {
                $message = "{$typeInfo['emoji']} {$typeInfo['title']}\n\n" .
                          "🔹 {$task->title}\n" .
                          ($task->description ? "📝 {$task->description}\n" : "") .
                          "\n⏰ Создано: " . $task->created_at->format('d.m.Y H:i');

                $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
                
                $postData = [
                    'chat_id' => $telegramId,
                    'text' => $message,
                    'parse_mode' => 'HTML',
                    'reply_markup' => json_encode([
                        'inline_keyboard' => [[
                            ['text' => '👀 Перейти к задаче', 'callback_data' => "view_task_{$task->id}"]
                            
                        ]]
                    ])
                ];

                Log::info('Sending notification to Telegram:', [
                    'url' => $url,
                    'telegram_id' => $telegramId,
                    'message' => $message
                ]);

                $response = Http::post($url, $postData);
                
                Log::info('Telegram API response:', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                    'telegram_id' => $telegramId
                ]);
                
                if ($response->successful()) {
                    $notificationsSent++;
                    Log::info('Successfully sent notification', [
                        'telegram_id' => $telegramId,
                        'task_id' => $task->id
                    ]);
                } else {
                    Log::error('Failed to send notification', [
                        'telegram_id' => $telegramId,
                        'response' => $response->json()
                    ]);
                }

            } catch (\Exception $e) {
                Log::error('Error sending notification to admin:', [
                    'telegram_id' => $telegramId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                continue;
            }
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $task,
            'message' => "Уведомления отправлены {$notificationsSent} админам из {$adminTelegramIds->count()}"
        ]);

    } catch (\Exception $e) {
        Log::error('Error in sendAdminNotification:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'status' => 'error',
            'success' => false,
            'data' => null,
            'message' => 'Ошибка при отправке уведомлений: ' . $e->getMessage()
        ], 500);
    }
}

public function getYclientsId(string $branchId): JsonResponse
{
    try {
        // Ищем сначала по строковому ID (slug)
        $branch = Branch::where('is_active', true)
            ->where(function($query) use ($branchId) {
                // Используем только строковое сравнение для branch_id
                $query->where('branch_id', $branchId);
            })
            ->first();

        if (!$branch || !$branch->yclients_id) {
            return response()->json([
                'success' => false,
                'message' => 'Branch not found or missing yclients_id'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'yclients_id' => $branch->yclients_id
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('Error getting branch yclients_id:', [
            'branch_id' => $branchId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to get branch data'
        ], 500);
    }
}

public function sendEmploymentNotification(Request $request)
    {
        try {
            $data = $request->validate([
                'registration_id' => 'required|integer',
                'type' => 'required|string'
            ]);

            // Загружаем регистрацию вместе с документами
            $registration = EmployeeRegistration::with('signedDocuments')->find($data['registration_id']);
            if (!$registration) {
                return response()->json([
                    'status' => 'error',
                    'success' => false,
                    'message' => 'Регистрация не найдена',
                    'data' => null
                ], 404);
            }

            // Получаем уникальные telegram_id
            $adminTelegramIds = AdminNotification::select('telegram_id')
                ->distinct()
                ->whereNotNull('telegram_id')
                ->pluck('telegram_id')
                ->filter();

            Log::info('Sending employment notifications', [
                'registration_id' => $registration->id,
                'admins_count' => $adminTelegramIds->count(),
                'registration_data' => [
                    'name' => $registration->full_name,
                    'documents_count' => $registration->signedDocuments->count()
                ]
            ]);

            $notificationsSent = 0;

            foreach ($adminTelegramIds as $telegramId) {
                try {
                    $message = "🆕 Новая заявка на трудоустройство!\n\n" .
           "👤 Кандидат: {$registration->full_name}\n" .
           "📱 Телефон: {$registration->phone}\n" .
           ($registration->branch_name ? "📍 Филиал: {$registration->branch_name}\n" : "") .
           "\n⏰ Время подачи: " . $registration->created_at->format('d.m.Y H:i') . "\n\n" .
           "Пожалуйста, проверьте данные кандидата и примите решение по заявке.";

                    $botToken = config('services.telegram.bot_token_supplies');
                    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
                    
                    $postData = [
                        'chat_id' => $telegramId,
                        'text' => $message,
                        'parse_mode' => 'HTML',
                        'reply_markup' => json_encode([
                            'inline_keyboard' => [[
                                ['text' => '👀 Просмотреть заявку', 'callback_data' => "view_application_{$registration->id}"]
                            ]]
                        ])
                    ];

                    $response = Http::post($url, $postData);
                    
                    if ($response->successful()) {
                        $notificationsSent++;
                        Log::info('Employment notification sent to admin', [
                            'telegram_id' => $telegramId,
                            'registration_id' => $registration->id,
                            'response' => $response->json()
                        ]);
                    } else {
                        Log::error('Failed to send employment notification', [
                            'telegram_id' => $telegramId,
                            'response' => $response->json()
                        ]);
                    }

                } catch (\Exception $e) {
                    Log::error('Error sending employment notification to admin:', [
                        'telegram_id' => $telegramId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    continue;
                }
            }

            return response()->json([
                'status' => 'success',
                'success' => true,
                'data' => $registration,
                'message' => "Уведомления отправлены {$notificationsSent} админам из {$adminTelegramIds->count()}"
            ]);

        } catch (\Exception $e) {
            Log::error('Error in sendEmploymentNotification:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'success' => false,
                'data' => null,
                'message' => 'Ошибка при отправке уведомлений: ' . $e->getMessage()
            ], 500);
        }
    }

    private function sendStaffCreationNotification($registration, $success = true, $errorDetails = null)
{
    try {
        // Получаем telegram_id админов
        $adminTelegramIds = AdminNotification::select('telegram_id')
            ->distinct()
            ->whereNotNull('telegram_id')
            ->pluck('telegram_id')
            ->filter();

        foreach ($adminTelegramIds as $telegramId) {
            try {
                if ($success) {
                    $message = "✅ Мастер успешно добавлен в Yclients!\n\n" .
                              "👤 Мастер: {$registration->full_name}\n" .
                              "📱 Телефон: {$registration->phone}\n" .
                              ($registration->branch_name ? "📍 Филиал: {$registration->branch_name}\n" : "") .
                              "🆔 ID в Yclients: {$registration->yclients_staff_id}";
                } else {
                    $message = "❌ Ошибка при добавлении мастера в Yclients!\n\n" .
                              "👤 Мастер: {$registration->full_name}\n" .
                              "📱 Телефон: {$registration->phone}\n" .
                              ($registration->branch_name ? "📍 Филиал: {$registration->branch_name}\n" : "") .
                              "\n⚠️ Ошибка: {$errorDetails}\n\n" .
                              "Пожалуйста, добавьте мастера вручную через панель Yclients.";
                }

                $botToken = config('services.telegram.bot_token_supplies');
                $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
                
                Http::post($url, [
                    'chat_id' => $telegramId,
                    'text' => $message,
                    'parse_mode' => 'HTML'
                ]);

            } catch (\Exception $e) {
                Log::error('Error sending staff creation notification:', [
                    'telegram_id' => $telegramId,
                    'error' => $e->getMessage()
                ]);
                continue;
            }
        }

    } catch (\Exception $e) {
        Log::error('Error in sendStaffCreationNotification:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}

    private function getNotificationTypeInfo(string $type): array
    {
        return match($type) {
            'description_update' => [
                'emoji' => '📝',
                'title' => 'Новая задача: Обновление описания'
            ],
            'photo_update' => [
                'emoji' => '📸',
                'title' => 'Новая задача: Обновление фото'
            ],
            'schedule_update' => [
                'emoji' => '📅',
                'title' => 'Новая задача: Обновление расписания'
            ],
            default => [
                'emoji' => '📋',
                'title' => 'Новая задача'
            ]
        };
    }

public function getMasterByPhone(Request $request)
{
    try {
        $data = $request->validate([
            'phone' => 'required|string'
        ]);

        $masterInfo = $this->yclientsService->findMasterInCompanies(
            $data['phone'],
            true // Всегда используем админскую авторизацию
        );

        if (!$masterInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Мастер не найден'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $masterInfo['master']
        ]);

    } catch (\Exception $e) {
        Log::error('Error getting master info:', [
            'error' => $e->getMessage(),
            'phone' => $request->phone ?? null,
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении информации о мастере'
        ], 500);
    }
}

    public function getUserByTelegramId($telegramId)
    {
        $cacheKey = 'user_telegram_id_' . $telegramId;
        $user = Cache::remember($cacheKey, 300, function () use ($telegramId) {
            // Create or find the user if not cached
            return User::firstOrCreate(
                ['telegram_id' => $telegramId],
                [
                    'name' => $telegramId, // username
                    'email' => $telegramId . '@telegram.com', // Default email
                    'password' => Hash::make('default_password'), // Default password
                ]
            )->toArray();
        });

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        return response()->json($user);
    }

    public function createCabinet($telegramId)
    {
       $data = request()->validate([
            'name' => 'required|string',
            'phone_number' => 'required',
            'user_id' => 'required',
            'state_path' => 'required',
        ]);

        $cabinetName = request('name');
        $phoneNumber = request('phone_number');
        $userId = request('user_id');
        $statePath = request('state_path');


        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user->cabinets()->firstOrCreate(
            ['name' => $cabinetName],
            ['settings' => [
                'cabinet_id' => $userId,
                'state_path' => $statePath,
                'phone_number' => $phoneNumber,

                'is_active' => true,
                'is_default' => false,
            ]]
        );

        // Invalidate the cached user data after the update
        Cache::forget('user_telegram_id_' . $user->telegram_id);

        return response()->json(['message' => 'Cabinet created', 'user' => $user]);
    }


    public function deleteCabinet($telegramId, $cabinetId)
    {
        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $cabinet = $user->cabinets()->find($cabinetId);
        if (!$cabinet) {
            return response()->json(['error' => 'Cabinet not found'], 404);
        }

        $cabinet->delete();

        // Invalidate the cached user data after the update
        Cache::forget('user_telegram_id_' . $user->telegram_id);

        return response()->json(['message' => 'Cabinet deleted', 'user' => $user]);
    }

    public function updateCabinet($telegramId, $cabinetId)
    {
        $data = request()->validate([
            'name' => 'required',
            'settings' => 'required',
        ]);

        $cabinetName = request('name');
        $settings = request('settings');


        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $cabinet = $user->cabinets()->find($cabinetId);
        if (!$cabinet) {
            return response()->json(['error' => 'Cabinet not found'], 404);
        }

        $cabinet->update([
            'name' => $cabinetName,
            'settings' => $settings,
        ]);

        // Invalidate the cached user data after the update
        Cache::forget('user_telegram_id_' . $user->telegram_id);

        return response()->json(['message' => 'Cabinet updated', 'user' => $user]);
    }

    public function getStaff()
    {
        $staff = User::get();
        return response()->json($staff);
    }

    /**
     * @throws \Exception
     */
    public function auth()
{
    try {
        $data = request()->validate([
            'phone' => 'required',
            'password' => 'required',
            'telegram_id' => 'required',
        ]);

        $phone = request('phone');
        $password = request('password');
        $telegramId = request('telegram_id');

        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не найден'
            ], 404);
        }

        $authResult = $this->yclientsService->authenticateByCredentials($phone, $password);
        
        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $authResult['message']
            ], 401);
        }

        auth()->login($user);
        
        $user->update(['phone_number' => $phone]);

        $newApiKey = $user->apiKeys()->create([
            'service' => 'yclients',
            'api_key' => $authResult['token']
        ]);

        $this->yclientsService->setUserToken($authResult['token']);
        
        $company = $this->yclientsService->getMyCompany();
        
        if ($company) {
            $user->update(['company_id' => $company['id']]);
        }

        Cache::forget('user_telegram_id_' . $user->telegram_id);

        return response()->json([
            'success' => true,
            'token' => $authResult['token'],
            'user' => $user->toArray()
        ]);

    } catch (\Exception $e) {
        Log::error('Auth error:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка сервера при авторизации'
        ], 500);
    }
}

/**
 * @throws \Exception
 */
public function authAdmin()
{
    try {
        Log::info('Starting admin auth process');

        $data = request()->validate([
            'phone' => 'required',
            'password' => 'required',
            'telegram_id' => 'required',
        ]);

        $phone = request('phone');
        $password = request('password');
        $telegramId = request('telegram_id');

        Log::info('Admin auth request data:', [
            'phone' => substr_replace($phone, '***', 4, 6),
            'telegram_id' => $telegramId
        ]);

        // Сначала проверяем авторизацию в Yclients
        $authResult = $this->yclientsService->authenticateAdmin($phone, $password);
        
        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $authResult['message']
            ], 401);
        }

        // Ищем или создаем пользователя
        $user = User::firstOrCreate(
            ['telegram_id' => $telegramId],
            [
                'phone_number' => $phone,
                'company_id' => $authResult['user']['company_id'] ?? null,
                'user_role_slug' => $authResult['user']['user_role_slug'] ?? null
            ]
        );

        // Обновляем данные пользователя
        $user->update([
            'phone_number' => $phone,
            'company_id' => $authResult['user']['company_id'] ?? null,
            'user_role_slug' => $authResult['user']['user_role_slug'] ?? null
        ]);

        auth()->login($user);

        // Обновляем API ключ
        $user->apiKeys()->where('service', 'yclients')->delete();
        $user->apiKeys()->create([
            'service' => 'yclients',
            'api_key' => $authResult['token']
        ]);

        Cache::forget('user_telegram_id_' . $user->telegram_id);

        return response()->json([
            'success' => true,
            'token' => $authResult['token'],
            'user' => $authResult['user']
        ]);

    } catch (\Exception $e) {
        Log::error('Admin auth error:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка сервера при авторизации'
        ], 500);
    }
}

public function logout(Request $request)
{
    try {
        $telegramId = $request->input('telegram_id');
        
        // Находим пользователя
        $user = User::where('telegram_id', $telegramId)->first();
        
        if ($user) {
            // Очищаем токен YClients
            $user->apiKeys()->where('service', 'yclients')->delete();
            
            // Очищаем кэш в Redis
            Cache::forget('user_telegram_id_' . $telegramId);
            Redis::del("yclients_access_token_{$telegramId}");
            
            // Обновляем пользователя
            $user->update([
                'last_logout' => now(),
                'yclients_token' => null
            ]);
        }

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        Log::error('Logout error: ' . $e->getMessage());
        return response()->json(['success' => false], 500);
    }
}

// В UserController.php добавляем новый метод:

public function updateDescription(Request $request)
{
    try {
        $data = $request->validate([
            'description' => 'required|string|max:1000',
            'phone' => 'required|string'
            
        ]);

        Log::info('Starting description update request', [
            'phone' => $data['phone'],
            'description_length' => strlen($data['description'])
        ]);

        // Вызываем обновленный метод сервиса
        $result = $this->yclientsService->updateMasterDescription(
            $data['phone'],
            $data['description']
        );

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update description'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Description updated successfully'
        ]);

    } catch (\Exception $e) {
        Log::error('Error in updateDescription endpoint:', [
            'error' => $e->getMessage(),
            'phone' => $request->phone ?? null,
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to update description: ' . $e->getMessage()
        ], 500);
    }
}

public function getSchedule(Request $request)
{
   try {
       Log::info('Schedule request received:', $request->all());

       $data = $request->validate([
           'telegram_id' => 'required',
           'start_date' => 'required|date_format:Y-m-d', 
           'end_date' => 'required|date_format:Y-m-d',
           'use_admin_auth' => 'sometimes|in:0,1,true,false'
       ]);

       $useAdminAuth = filter_var($request->input('use_admin_auth', false), FILTER_VALIDATE_BOOLEAN);

       $user = User::where('telegram_id', $request->telegram_id)->first();
       if (!$user) {
           return response()->json([
               'success' => false,
               'message' => 'Пользователь не найден'
           ], 404);
       }

       if (!$useAdminAuth) {
           $apiKey = $user->apiKeys()
               ->where('service', 'yclients')
               ->latest()
               ->first();

           if (!$apiKey) {
               return response()->json([
                   'success' => false,
                   'message' => 'Необходима авторизация в системе'
               ], 401);
           }

           $this->yclientsService->setUserToken($apiKey->api_key);
       }

       // Получаем данные текущего мастера
       $masterInfo = $this->yclientsService->findMasterInCompanies(
           $user->phone_number,
           $useAdminAuth
       );

       if (!$masterInfo) {
           return response()->json([
               'success' => false,
               'message' => 'Не удалось найти информацию о мастере'
           ], 404);
       }

       Log::info('Found master info:', [
           'master_id' => $masterInfo['master']['id'],
           'company_id' => $masterInfo['company']['id'],
           'company_name' => $masterInfo['company']['title']
       ]);

       // Получаем расписание всех мастеров
       $scheduleData = $this->yclientsService->getStaffSchedule(
           $masterInfo['company']['id'],
           $request->start_date,
           $request->end_date,
           $useAdminAuth
       );

       Log::info('Retrieved staff schedule:', [
           'scheduleData' => $scheduleData
       ]);

       if (!$scheduleData) {
           return response()->json([
               'success' => false,
               'message' => 'Не удалось получить расписание'  
           ], 500);
       }

       // Получаем всех мастеров филиала
       $allStaff = $this->yclientsService->getStaff($masterInfo['company']['id']);

       // Преобразуем данные в нужный формат
       $result = [];

       // Сначала ищем расписание текущего мастера
       $currentMasterSchedule = null;
       foreach ($scheduleData as $schedule) {
           if ($schedule['staff_id'] == $masterInfo['master']['id']) {
               $currentMasterSchedule = $schedule;
               Log::info('Found current master schedule:', [
                   'master_id' => $masterInfo['master']['id'],
                   'schedule' => $schedule
               ]);
               break;
           }
       }

       // Добавляем текущего мастера
       $result[] = [
           'staff_id' => $masterInfo['master']['id'],
           'name' => $masterInfo['master']['name'],
           'specialization' => $masterInfo['master']['specialization'] ?? '',
           'date' => $request->start_date,
           'slots' => $currentMasterSchedule['slots'] ?? [],
           'off_day_type' => $currentMasterSchedule['off_day_type'] ?? null,
           'busy_intervals' => $currentMasterSchedule['busy_intervals'] ?? []
       ];

       // Добавляем остальных мастеров
       foreach ($allStaff as $staff) {
           if ($staff['id'] !== $masterInfo['master']['id']) {
               // Ищем расписание для мастера
               $staffSchedule = null;
               foreach ($scheduleData as $schedule) {
                   if ($schedule['staff_id'] == $staff['id']) {
                       $staffSchedule = $schedule;
                       Log::info('Found staff schedule:', [
                           'staff_id' => $staff['id'],
                           'name' => $staff['name'],
                           'schedule' => $schedule
                       ]);
                       break;
                   }
               }

               $result[] = [
                   'staff_id' => $staff['id'],
                   'name' => $staff['name'],
                   'specialization' => $staff['specialization'] ?? '',
                   'date' => $request->start_date,
                   'slots' => $staffSchedule['slots'] ?? [],
                   'off_day_type' => $staffSchedule['off_day_type'] ?? null,
                   'busy_intervals' => $staffSchedule['busy_intervals'] ?? []
               ];
           }
       }

       Log::info('Generated schedule response:', [
           'master_info' => $masterInfo['master'],
           'result' => $result
       ]);

       return response()->json([
           'success' => true,
           'data' => $result
       ]);

   } catch (\Exception $e) {
       Log::error('Error getting schedule:', [
           'error' => $e->getMessage(),
           'trace' => $e->getTraceAsString()
       ]);

       return response()->json([
           'success' => false,
           'message' => 'Ошибка при получении расписания'
       ], 500);
   }
}

public function getFilialStaff(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required',
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d',
            'use_admin_auth' => 'sometimes|in:0,1,true,false'
        ]);

        $useAdminAuth = $request->boolean('use_admin_auth', false);

        // Находим пользователя
        $user = User::where('telegram_id', $request->telegram_id)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не найден'
            ], 404);
        }

        if (!$useAdminAuth) {
            $apiKey = $user->apiKeys()
                ->where('service', 'yclients')
                ->latest()
                ->first();

            if (!$apiKey) {
                return response()->json([
                    'success' => false,
                    'message' => 'Необходима авторизация в системе'
                ], 401);
            }

            $this->yclientsService->setUserToken($apiKey->api_key);
        }

        // Находим мастера и его филиал
        $masterInfo = $this->yclientsService->findMasterInCompanies(
            $user->phone_number,
            $useAdminAuth
        );

        if (!$masterInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось найти информацию о мастере'
            ], 404);
        }

        // Добавим логирование
        Log::info('Found master info:', [
            'company_id' => $masterInfo['company']['id'],
            'master_id' => $masterInfo['master']['id']
        ]);

        // Получаем список всех сотрудников филиала
        $staff = $this->yclientsService->getStaff($masterInfo['company']['id']);
        
        // Добавим логирование полученных сотрудников
        // В начале метода после получения staff
Log::info('Raw staff data:', array_map(function($member) {
    return [
        'id' => $member['id'],
        'name' => $member['name'],
        'fired' => $member['fired'] ?? null,
        'status' => $member['status'] ?? null,
        'hidden' => $member['hidden'] ?? null
    ];
}, $staff));

        // Фильтруем список: только активные сотрудники из текущего филиала
$filteredStaff = array_values(array_filter($staff, function($member) use ($masterInfo) {
    // Добавим логирование для отладки
    Log::info('Checking staff member in filter:', [
        'id' => $member['id'],
        'name' => $member['name'],
        'is_current_master' => ($member['id'] === $masterInfo['master']['id'])
    ]);
    
    // Основная логика фильтрации
    return 
        $member['id'] !== $masterInfo['master']['id'] && // исключаем текущего мастера
        !empty($member['name']) && // с указанным именем
        ($member['fired'] ?? 0) == 0; // активные
}));

        // Логируем результат фильтрации
        Log::info('Filtered staff list:', [
            'count' => count($filteredStaff)
        ]);

        return response()->json([
            'success' => true,
            'data' => $filteredStaff
        ]);

    } catch (\Exception $e) {
        Log::error('Error getting filial staff:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении списка сотрудников'
        ], 500);
    }
}

public function updateSchedule(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required',
            'schedules_to_set' => 'array|nullable',
            'schedules_to_delete' => 'array|nullable',
            'use_admin_auth' => 'sometimes|boolean'
        ]);

        $useAdminAuth = filter_var($request->input('use_admin_auth', true), FILTER_VALIDATE_BOOLEAN);
        
        Log::info('Schedule update request:', [
            'telegram_id' => $request->telegram_id,
            'use_admin_auth' => $useAdminAuth,
            'has_schedules_to_set' => !empty($request->schedules_to_set),
            'has_schedules_to_delete' => !empty($request->schedules_to_delete)
        ]);

        $user = User::where('telegram_id', $request->telegram_id)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не найден'
            ], 404);
        }

        // Всегда используем админскую авторизацию для этого метода
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');
        
        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin, 
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Admin authentication failed', ['auth_result' => $authResult]);
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Получаем данные мастера
        $masterInfo = $this->yclientsService->findMasterInCompanies(
            $user->phone_number,
            true // Всегда используем админскую авторизацию
        );

        if (!$masterInfo) {
            Log::error('Master not found', [
                'phone' => $user->phone_number,
                'telegram_id' => $user->telegram_id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Не удалось найти информацию о мастере'
            ], 404);
        }

        Log::info('Found master info:', [
            'company_id' => $masterInfo['company']['id'],
            'master_id' => $masterInfo['master']['id']
        ]);

        // Обновляем расписание
        $result = $this->yclientsService->setStaffSchedule(
            $masterInfo['company']['id'],
            $request->schedules_to_set ?? [],
            $request->schedules_to_delete ?? []
        );

        if (!$result) {
            Log::error('Failed to set staff schedule');
            return response()->json([
                'success' => false,
                'message' => 'Не удалось обновить расписание'
            ], 500);
        }

        Log::info('Schedule updated successfully:', [
            'result' => $result
        ]);

        // Очищаем кэш расписания
        Cache::forget('schedule_' . $user->telegram_id);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);

    } catch (\Exception $e) {
        Log::error('Error updating schedule:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении расписания: ' . $e->getMessage()
        ], 500);
    }
}

public function checkScheduleAvailability(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required',
            'date' => 'required|date_format:Y-m-d',
            'time_start' => 'required|date_format:H:i',
            'time_end' => 'required|date_format:H:i'
        ]);

        $user = User::where('telegram_id', $request->telegram_id)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не найден'
            ], 404);
        }

        // Получаем токен и проверяем расписание
        $apiKey = $user->apiKeys()
            ->where('service', 'yclients')
            ->latest()
            ->first();

        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Необходима авторизация в системе'
            ], 401);
        }

        $this->yclientsService->setUserToken($apiKey->api_key);

        $masterInfo = $this->yclientsService->findMasterInCompanies($user->phone_number);
        if (!$masterInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось найти информацию о мастере'
            ], 404);
        }

        // Получаем расписание на указанную дату
        $schedule = $this->yclientsService->getStaffSchedule(
            $masterInfo['company']['id'],
            [$masterInfo['master']['id']],
            $request->date,
            $request->date
        );

        // Анализируем доступность выбранного интервала
        $isAvailable = true; // Здесь должна быть логика проверки интервала

        return response()->json([
            'success' => true,
            'available' => $isAvailable
        ]);

    } catch (\Exception $e) {
        Log::error('Error checking schedule availability:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при проверке доступности'
        ], 500);
    }
}

public function updatePhoto(Request $request)
    {
        try {
            $data = $request->validate([
                'photo' => 'required|image|mimes:jpeg,png,jpg|max:5120', // макс 5MB
                'phone' => 'required|string'
            ]);

            Log::info('Starting photo update request', [
                'phone' => $data['phone'],
                'file_size' => $request->file('photo')->getSize()
            ]);

            // Вызываем обновленный метод сервиса
            $result = $this->yclientsService->updateMasterPhoto(
                $request->file('photo'),
                $data['phone']
            );

            if (!isset($result['success']) || !$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to update photo'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Photo updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in updatePhoto endpoint:', [
                'error' => $e->getMessage(),
                'phone' => $request->phone ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            // Определяем HTTP код ответа на основе типа ошибки
            $statusCode = match(true) {
                str_contains($e->getMessage(), 'Мастер не найден') => 404,
                str_contains($e->getMessage(), 'Failed to authenticate') => 401,
                default => 500
            };

            return response()->json([
                'success' => false,
                'message' => 'Failed to update photo: ' . $e->getMessage()
            ], $statusCode);
        }
    }

public function getMasterRecords(Request $request)
    {
        try {
            $data = $request->validate([
                'phone' => 'required|string',
                'password' => 'required|string',
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d'
            ]);

            Log::info('Getting master records', [
                'phone' => $data['phone'],
                'date_range' => [
                    'start' => $data['start_date'],
                    'end' => $data['end_date']
                ]
            ]);

            // 1. Аутентификация через админский аккаунт
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $this->yclientsService->authenticateByCredentials(
                $adminLogin, 
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                Log::error('Admin authentication failed', ['auth_result' => $authResult]);
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации администратора'
                ], 401);
            }

            // 2. Установка админского токена
            $this->yclientsService->setUserToken($authResult['token']);

            // 3. Поиск мастера и его филиала
            $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

            if (!$masterInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Мастер не найден'
                ], 404);
            }

            Log::info('Master found', [
                'company_id' => $masterInfo['company']['id'],
                'master_id' => $masterInfo['master']['id']
            ]);

            // 4. Получение записей мастера
            $records = $this->yclientsService->getRecords(
                $masterInfo['company']['id'],
                [
                    'staff_id' => $masterInfo['master']['id'],
                    'start_date' => $data['start_date'],
                    'end_date' => $data['end_date']
                ]
            );
            
            // Проверяем на null (ошибка), а не на пустоту
            if ($records === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Не удалось получить записи'
                ], 500);
            }
            
            return response()->json([
                'success' => true,
                'data' => $records // Теперь это может быть пустой массив
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting master records:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Ошибка при получении записей: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getMasterRecordDetails(Request $request)
    {
        try {
            $data = $request->validate([
                'phone' => 'required|string',
                'password' => 'required|string',
                'record_id' => 'required|string'
            ]);

            Log::info('Getting record details', [
                'phone' => $data['phone'],
                'record_id' => $data['record_id']
            ]);

            // 1. Аутентификация через админский аккаунт
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $this->yclientsService->authenticateByCredentials(
                $adminLogin, 
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                Log::error('Admin authentication failed', ['auth_result' => $authResult]);
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации администратора'
                ], 401);
            }

            // 2. Установка админского токена
            $this->yclientsService->setUserToken($authResult['token']);

            // 3. Поиск мастера и его филиала
            $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

            if (!$masterInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Мастер не найден'
                ], 404);
            }

            // 4. Получение деталей записи
            $record = $this->yclientsService->getRecord(
                $masterInfo['company']['id'],
                $data['record_id']
            );

            if (!$record) {
                return response()->json([
                    'success' => false,
                    'message' => 'Запись не найдена'
                ], 404);
            }

            // 5. Проверяем, что запись принадлежит этому мастеру
            if ($record['staff_id'] != $masterInfo['master']['id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Запись не принадлежит данному мастеру'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $record
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting record details:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Ошибка при получении данных записи: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancelMasterRecord(Request $request)
{
    try {
        $data = $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
            'record_id' => 'required|string'
        ]);

        // Аутентификация через админский аккаунт
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin, 
            $adminPassword
        );

        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Поиск мастера и его филиала
        $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

        if (!$masterInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Мастер не найден'
            ], 404);
        }

        // Получаем запись для проверки принадлежности мастеру
        $record = $this->yclientsService->getRecord(
            $masterInfo['company']['id'],
            $data['record_id']
        );

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Запись не найдена'
            ], 404);
        }

        // Проверяем, что запись принадлежит этому мастеру
        if ($record['staff_id'] != $masterInfo['master']['id']) {
            return response()->json([
                'success' => false,
                'message' => 'Запись не принадлежит данному мастеру'
            ], 403);
        }

        // Отменяем запись
        $success = $this->yclientsService->cancelRecord(
            $masterInfo['company']['id'],
            $data['record_id']
        );

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось отменить запись'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Запись успешно отменена'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Ошибка при отмене записи: ' . $e->getMessage()
        ], 500);
    }
}

public function updateMasterRecord(Request $request)
{
    try {
        $data = $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
            'record_id' => 'required|string',
            'update_data' => 'required|array'
        ]);

        // Аутентификация через админский аккаунт
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin, 
            $adminPassword
        );

        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Поиск мастера и его филиала
        $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

        if (!$masterInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Мастер не найден'
            ], 404);
        }

        // Получаем текущую запись для проверки
        $record = $this->yclientsService->getRecord(
            $masterInfo['company']['id'],
            $data['record_id']
        );

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Запись не найдена'
            ], 404);
        }

        if ($record['staff_id'] != $masterInfo['master']['id']) {
            return response()->json([
                'success' => false,
                'message' => 'Запись не принадлежит данному мастеру'
            ], 403);
        }

        // Обновляем запись
        $updatedRecord = $this->yclientsService->updateRecord(
            $masterInfo['company']['id'],
            $data['record_id'],
            $data['update_data']
        );

        if (!$updatedRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось обновить запись'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $updatedRecord
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении записи: ' . $e->getMessage()
        ], 500);
    }
}

public function getMasterServices(Request $request)
{
    try {
        $data = $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string'
        ]);

        // Аутентификация через админский аккаунт
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin, 
            $adminPassword
        );

        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Находим мастера по номеру телефона
        $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

        if (!$masterInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Мастер не найден'
            ], 404);
        }

        // Получаем только услуги этого мастера
        $services = $this->yclientsService->getServices(
            $masterInfo['company']['id'],
            $masterInfo['master']['id']
        );

        if (!$services) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить список услуг'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => $services
        ]);

    } catch (\Exception $e) {
        Log::error('Error getting master services:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении списка услуг: ' . $e->getMessage()
        ], 500);
    }
}

public function rescheduleNotification(Request $request, AdminNotification $notification)
{
    try {
        $data = $request->validate([
            'notification_datetime' => 'required|date_format:Y-m-d H:i:s',
        ]);

        $notification->update([
            'notification_datetime' => $data['notification_datetime'],
            'is_active' => true,
            'last_notification_sent_at' => null
        ]);

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error rescheduling notification:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при изменении времени уведомления'
        ], 500);
    }
}

public function createAdminNotification(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required|integer',
            'name' => 'required|string',
            'sum' => 'nullable|numeric|min:0',
            'notification_datetime' => 'required|date_format:Y-m-d H:i:s',
            'type' => 'required|in:single,recurring',
            'frequency' => 'required_if:type,recurring|nullable|in:daily,weekly,monthly,custom',
            'frequency_value' => 'required_if:frequency,custom|nullable|integer|min:1|max:365',
        ]);

        // Конвертируем время из MSK в UTC
        $notificationDate = Carbon::createFromFormat(
            'Y-m-d H:i:s', 
            $data['notification_datetime'], 
            'Europe/Moscow'
        )->setTimezone('UTC');

        // Создаем уведомление с UTC временем
        $notification = AdminNotification::create([
            'telegram_id' => $data['telegram_id'],
            'name' => $data['name'],
            'sum' => $data['sum'],
            'notification_datetime' => $notificationDate,
            'type' => $data['type'],
            'frequency' => $data['frequency'],
            'frequency_value' => $data['frequency_value'],
            'is_active' => true
        ]);

        // Создаем запись в логах
        $notification->logs()->create([
            'status' => 'created',
            'sent_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error creating admin notification:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при создании уведомления'
        ], 500);
    }
}

public function getAdminNotifications(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required|integer',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        $query = AdminNotification::where('telegram_id', $data['telegram_id'])
            ->where('is_active', true)
            ->orderBy('notification_datetime', 'asc');

        $notifications = $query->paginate($request->per_page ?? 10);

        // Добавляем дополнительную информацию к каждому уведомлению
        $notifications->getCollection()->transform(function ($notification) {
            $notification->next_notification = $notification->type === 'recurring' 
                ? $notification->getNextNotificationDate() 
                : null;
            return $notification;
        });

        return response()->json([
            'success' => true,
            'data' => $notifications
        ]);

    } catch (\Exception $e) {
        Log::error('Error fetching admin notifications:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении уведомлений'
        ], 500);
    }
}

public function getAdminNotification($id)
{
    try {
        $notification = AdminNotification::with('logs')
            ->where('id', $id)
            ->where('is_active', true)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Уведомление не найдено'
            ], 404);
        }

        // Добавляем информацию о следующем уведомлении для периодических
        if ($notification->type === 'recurring') {
            $notification->next_notification = $notification->getNextNotificationDate();
        }

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error fetching admin notification:', [
            'error' => $e->getMessage(),
            'notification_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении уведомления'
        ], 500);
    }
}

public function updateAdminNotification(Request $request, $id)
{
    try {
        $notification = AdminNotification::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'sum' => 'sometimes|nullable|numeric|min:0',
            'notification_datetime' => 'sometimes|date_format:Y-m-d H:i:s',
            'type' => 'sometimes|in:single,recurring',
            'frequency' => 'required_if:type,recurring|nullable|in:daily,weekly,monthly,custom',
            'frequency_value' => 'required_if:frequency,custom|nullable|integer|min:1|max:365',
            'is_active' => 'sometimes|boolean',
            'last_notification_sent_at' => 'sometimes|nullable|date_format:Y-m-d H:i:s'
        ]);

        // Если меняется дата для повторяющегося уведомления
        if (isset($data['notification_datetime']) && $notification->type === 'recurring') {
            // Обновляем время уведомления и сбрасываем last_notification_sent_at
            $notification->notification_datetime = $data['notification_datetime'];
            $notification->last_notification_sent_at = null;
            $notification->save();
        } else {
            $notification->update($data);
        }

        // Логируем изменение
        $notification->logs()->create([
            'status' => 'updated',
            'sent_at' => now(),
        ]);

        // Обновляем next_notification для повторяющихся уведомлений
        if ($notification->type === 'recurring') {
            $notification->next_notification = $notification->getNextNotificationDate();
        }

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error updating admin notification:', [
            'error' => $e->getMessage(),
            'notification_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении уведомления'
        ], 500);
    }
}

public function deleteAdminNotification(Request $request, $id)
{
    try {
        $notification = AdminNotification::findOrFail($id);
        
        // Мягкое удаление - просто деактивируем
        $notification->update(['is_active' => false]);

        // Логируем удаление
        $notification->logs()->create([
            'status' => 'deleted',
            'sent_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Уведомление удалено'
        ]);

    } catch (\Exception $e) {
        Log::error('Error deleting admin notification:', [
            'error' => $e->getMessage(),
            'notification_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при удалении уведомления'
        ], 500);
    }
}

public function createAdminTask(Request $request)
{
    try {
        $data = $request->validate([
            'type' => 'required|in:schedule_update,photo_update,description_update,other',
            'master_phone' => 'required|string',
            'master_name' => 'required|string',
            'description' => 'nullable|string',
            'title' => 'required|string',
            'priority' => 'integer|min:0|max:5',
            'deadline' => 'nullable|date_format:Y-m-d H:i:s'
        ]);

        $task = AdminTask::create([
            'title' => $data['title'],
            'description' => $data['description'],
            'type' => $data['type'],
            'master_phone' => $data['master_phone'],
            'master_name' => $data['master_name'],
            'status' => 'pending',
            'priority' => $data['priority'] ?? 0,
            'deadline' => $data['deadline'] ?? null
        ]);

        Log::info('Admin task created:', ['task_id' => $task->id]);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);

    } catch (\Exception $e) {
        Log::error('Error creating admin task:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при создании задачи'
        ], 500);
    }
}

public function getAdminTasks(Request $request)
{
    try {
        $data = $request->validate([
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'filter' => 'sometimes|in:active,completed,all'
        ]);

        $query = AdminTask::query();

        // Применяем фильтры
        if ($request->filter === 'active') {
            $query->whereIn('status', ['pending', 'in_progress']);
        } elseif ($request->filter === 'completed') {
            $query->where('status', 'completed');
        }

        // Сортировка по приоритету и дате создания
        $query->orderBy('priority', 'desc')
              ->orderBy('created_at', 'desc');

        $tasks = $query->paginate($request->per_page ?? 10);

        return response()->json([
            'success' => true,
            'data' => $tasks
        ]);

    } catch (\Exception $e) {
        Log::error('Error fetching admin tasks:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении списка задач'
        ], 500);
    }
}

public function getAdminTask($id)
{
    try {
        $task = AdminTask::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);

    } catch (\Exception $e) {
        Log::error('Error fetching admin task:', [
            'error' => $e->getMessage(),
            'task_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Задача не найдена'
        ], 404);
    }
}

public function updateAdminTask(Request $request, $id)
{
    try {
        $task = AdminTask::findOrFail($id);

        $data = $request->validate([
            'title' => 'sometimes|string',
            'description' => 'nullable|string',
            'priority' => 'sometimes|integer|min:0|max:5',
            'deadline' => 'nullable|date_format:Y-m-d H:i:s'
        ]);

        $task->update($data);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);

    } catch (\Exception $e) {
        Log::error('Error updating admin task:', [
            'error' => $e->getMessage(),
            'task_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении задачи'
        ], 500);
    }
}

public function deleteAdminTask($id)
{
    try {
        $task = AdminTask::findOrFail($id);
        $task->delete();

        return response()->json([
            'success' => true,
            'message' => 'Задача удалена'
        ]);

    } catch (\Exception $e) {
        Log::error('Error deleting admin task:', [
            'error' => $e->getMessage(),
            'task_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при удалении задачи'
        ], 500);
    }
}

public function completeAdminTask($id)
{
    try {
        $task = AdminTask::findOrFail($id);
        
        $task->update([
            'status' => 'completed',
            'completed_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);

    } catch (\Exception $e) {
        Log::error('Error completing admin task:', [
            'error' => $e->getMessage(),
            'task_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при выполнении задачи'
        ], 500);
    }
}

public function updateAdminTaskStatus(Request $request, $id)
{
    try {
        $data = $request->validate([
            'status' => 'required|in:pending,in_progress,completed'
        ]);

        $task = AdminTask::findOrFail($id);
        
        $task->update([
            'status' => $data['status'],
            'completed_at' => $data['status'] === 'completed' ? now() : null
        ]);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);

    } catch (\Exception $e) {
        Log::error('Error updating admin task status:', [
            'error' => $e->getMessage(),
            'task_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении статуса задачи'
        ], 500);
    }
}

// UserController.php

public function createWarehouseNotification(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required|integer',
            'product_id' => 'required|integer',
            'min_amount' => 'required|integer|min:0',
            'branch_id' => 'required|integer'
        ]);

        // Используем админскую авторизацию для доступа к данным
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            Log::error('Admin authentication failed', ['auth_result' => $authResult]);
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Создаем уведомление
        $notification = WarehouseNotification::create([
            'telegram_id' => $data['telegram_id'],
            'company_id' => $data['branch_id'], // используем branch_id как company_id
            'product_id' => $data['product_id'],
            'min_amount' => $data['min_amount'],
            'is_active' => true
        ]);

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error creating warehouse notification:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при создании уведомления'
        ], 500);
    }
}


public function getWarehouseNotification($id)
{
    try {
        $notification = WarehouseNotification::where('id', $id)
            ->where('is_active', true)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Уведомление не найдено'
            ], 404);
        }

        // Получаем информацию о товаре
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin, 
            $adminPassword
        );

        if ($authResult['success']) {
            $this->yclientsService->setUserToken($authResult['token']);
            
            $productInfo = $this->yclientsService->getProduct(
                $notification->company_id,
                $notification->product_id
            );
            
            if ($productInfo) {
                $notification->product = $productInfo;
                // Добавляем текущее количество
                $notification->current_amount = $productInfo['actual_amounts'][0]['amount'] ?? 0;
            }
        }

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error fetching single warehouse notification:', [
            'error' => $e->getMessage(),
            'notification_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении уведомления'
        ], 500);
    }
}

public function getWarehouseNotifications(Request $request)
{
    try {
        $data = $request->validate([
            'telegram_id' => 'required|integer',
            'branch_id' => 'nullable|integer'
        ]);

        // Получаем админский токен для YClients
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin, $adminPassword
        );

        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации администратора'
            ], 401);
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Получаем список филиалов
        $companies = $this->yclientsService->getCompanies([
            'active' => 1,
            'my' => 1
        ]);

        // Создаем мапу филиалов для быстрого доступа
        $companiesMap = collect($companies)->keyBy('id')->all();

        $query = WarehouseNotification::where('telegram_id', $data['telegram_id'])
            ->where('is_active', true);
            
        if ($request->has('branch_id')) {
            $query->where('company_id', $request->branch_id);
        }

        $notifications = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 10);

        // Добавляем информацию о филиале и продукте к каждому уведомлению        
        $notifications->getCollection()->transform(function ($notification) use ($companiesMap) {
            $productInfo = $this->yclientsService->getProduct(
                $notification->company_id,
                $notification->product_id
            );
            
            if ($productInfo) {
                $notification->product = $productInfo;
            }

            // Добавляем информацию о филиале
            $notification->company = $companiesMap[$notification->company_id] ?? null;
            
            return $notification;
        });

        return response()->json([
            'success' => true,
            'data' => $notifications
        ]);

    } catch (\Exception $e) {
        Log::error('Error fetching warehouse notifications:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при получении уведомлений: ' . $e->getMessage()
        ], 500);
    }
}

public function updateWarehouseNotification(Request $request, $id)
{
    try {
        $notification = WarehouseNotification::findOrFail($id);

        $data = $request->validate([
            'min_amount' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean'
        ]);

        $notification->update($data);

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);

    } catch (\Exception $e) {
        Log::error('Error updating warehouse notification:', [
            'error' => $e->getMessage(),
            'notification_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении уведомления'
        ], 500);
    }
}

public function deleteWarehouseNotification(Request $request, $id)
{
    try {
        $notification = WarehouseNotification::findOrFail($id);
        
        // Мягкое удаление - просто деактивируем
        $notification->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Уведомление отключено'
        ]);

    } catch (\Exception $e) {
        Log::error('Error deleting warehouse notification:', [
            'error' => $e->getMessage(),
            'notification_id' => $id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при удалении уведомления'
        ], 500);
    }
}

}
