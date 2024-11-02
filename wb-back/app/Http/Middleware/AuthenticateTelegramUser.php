<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use App\Jobs\SendUserNotificationMessage;

class AuthenticateTelegramUser
{
    public function handle(Request $request, Closure $next)
    {
        $webhookData = $request->all();

        Log::info('Authorizing processing', ['INSIDE middleware' => $webhookData]);

        // Extract chat ID from message or callback_query
        if (isset($webhookData['message']['from']['id'])) {
            $chatId = $webhookData['message']['from']['id'];
            $username = $webhookData['message']['from']['username'] ?? null;
        } elseif (isset($webhookData['callback_query']['from']['id'])) {
            $chatId = $webhookData['callback_query']['from']['id'];
            $username = $webhookData['callback_query']['from']['username'] ?? $chatId;
        } elseif (isset($webhookData['pre_checkout_query']['from']['id'])) {
            $chatId = $webhookData['pre_checkout_query']['from']['id'];
            $username = $webhookData['pre_checkout_query']['from']['username'] ?? null;
        } elseif (isset($webhookData['my_chat_member']['from']['id'])) {
            $chatId = $webhookData['my_chat_member']['from']['id'];
            $username = $webhookData['my_chat_member']['from']['username'] ?? null;
        } else {
            return response()->json(['error' => 'Unauthorized. Chat ID not provided.'], 401);
        }

        // Check if user is already cached
        $cacheKey = "telegram_user_{$chatId}";
        $user = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($chatId, $username) {
            // Create or find the user if not cached
            return User::firstOrCreate(
                ['telegram_id' => $chatId],
                [
                    'name' => $username, // username
                    'email' => $chatId . '@telegram.com', // Default email
                    'password' => Hash::make('default_password'), // Default password
                ]
            );
        });

        // First login, assign a subscription
        if (is_null($user->subscription_until)) {
            $user->subscription_until = now()->addDays(3);
            $user->save();

            // Send a notification message when a user subscribes
            $message = "#подписка\n@{$username} подписался на бота";
            SendUserNotificationMessage::dispatch($message, 'HTML');
        }

        // Authenticate the user
        Auth::login($user);

        return $next($request);
    }
}
