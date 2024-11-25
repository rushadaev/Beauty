<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    /**
     * Retrieves paginated notifications for a user by Telegram ID.
     *
     * @param  int  $telegramId
     * @param  Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getNotifications($telegramId, Request $request)
    {
        // Validate the page parameter
        $request->validate([
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',
            'type' => 'string',
            'id' => 'nullable',
        ]);

        // Retrieve query parameters for pagination
        $page = $request->input('page', 1); // Default to page 1
        $perPage = $request->input('per_page', 10); // Default to 10 notifications per page

        // Fetch paginated notifications
        $query = Notification::whereHas('user', function ($query) use ($telegramId) {
            $query->where('telegram_id', $telegramId);
        })->orderBy('created_at', 'desc');

        // Filter by type if provided
        if ($request->has('type')) {
            $query->where('settings->type', $request->input('type'));
        }

        // Filter by id if provided
        if ($request->has('id')) {
            $query->where('id', $request->input('id'));
        }

        $notifications = $query->paginate($perPage, ['*'], 'page', $page);
        // Check if user exists by verifying if any notifications are found
        if ($notifications->isEmpty() && $page == 1) {
            return response()->json(['error' => 'User not found or no notifications available'], 404);
        }

        return response()->json($notifications);
    }

    public function createNotification($telegramId)
    {
        $data = request()->validate([
            'settings' => 'required',
        ]);

        $settings = request('settings');

        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        //Уведомление если тип многоразовое - создаем уведмоелния на каждый месяц в течение года


        $notificationCount = 1;

        for ($i = 0; $i < $notificationCount; $i++) {
            $notification = new Notification();
            $notification->user_id = $user->id;

            $notification->settings = $settings;
            $notification->status = 'started';
            $notification->save();
        }


        return response()->json(['message' => 'Notification created', 'notification' => $notification]);
    }

    public function deleteNotification($notificationId)
    {
        Cache::delete('notification_' . $notificationId);
        $notification = Notification::find($notificationId);
        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    //updateNotification
    public function updateNotification($notificationId, Request $request)
    {
        $notification = Notification::find($notificationId);
        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        $data = request()->validate([
            'settings' => 'required',
        ]);

        $settings = request('settings');

        $notification->settings = $settings;
        $notification->save();

        return response()->json(['message' => 'Notification updated', 'notification' => $notification]);
    }
}
