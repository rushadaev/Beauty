<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{

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
}
