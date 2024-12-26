<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Employee; // Добавляем импорт модели Employee
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log; // Добавляем этот импорт
use Illuminate\Http\Request; // Добавьте этот импорт
use App\Services\YclientsService;
use Illuminate\Support\Facades\Redis;
use Vgrish\YclientsOpenApi\Model\AuthUserRequest;


class UserController extends Controller
{

    protected $yclientsService;

    public function __construct(YclientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
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

        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не найден'
            ], 404);
        }

        // Используем новый метод аутентификации для администраторов
        $authResult = $this->yclientsService->authenticateAdmin($phone, $password);
        
        if (!$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $authResult['message']
            ], 401);
        }

        // Обновляем данные пользователя
        auth()->login($user);
        
        $user->update([
            'phone_number' => $phone,
            'company_id' => $authResult['user']['company_id'] ?? null,
            'user_role_slug' => $authResult['user']['user_role_slug'] ?? null
        ]);

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
            'telegram_id' => 'required'
        ]);

        $user = User::where('telegram_id', $request->telegram_id)->first();
        if (!$user) {  // Исправлено с !user на !$user
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не найден'
            ], 404);
        }

        // Получаем API ключ пользователя
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

        // Обновляем фото через YclientsService
        $result = $this->yclientsService->updateMasterPhoto(
            $request->file('photo'),
            $user->phone_number
        );

        return response()->json($result);

    } catch (\Exception $e) {
        Log::error('Error updating master photo:', [
            'error' => $e->getMessage(),
            'telegram_id' => $request->telegram_id ?? null,
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Ошибка при обновлении фотографии: ' . $e->getMessage()
        ], 500);
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

}
