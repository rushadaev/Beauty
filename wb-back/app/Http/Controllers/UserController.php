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
            'phone' => 'required|string',
            'password' => 'required|string'
        ]);

        Log::info('Starting description update request', [
            'phone' => $data['phone'],
            'description_length' => strlen($data['description'])
        ]);

        // Вызываем обновленный метод сервиса
        $result = $this->yclientsService->updateMasterDescription(
            $data['phone'],
            $data['password'],
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


}
