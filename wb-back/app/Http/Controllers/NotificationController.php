<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

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
            'type' => 'string|in:search,booking',
        ]);

        // Retrieve query parameters for pagination
        $page = $request->input('page', 1); // Default to page 1
        $perPage = $request->input('per_page', 10); // Default to 10 notifications per page


        // Fetch paginated notifications
        $query = Notification::whereHas('user', function ($query) use ($telegramId) {
            $query->where('telegram_id', $telegramId);
        })->orderBy('created_at', 'desc') // Order by most recent
            ->when($request->input('type'), function ($query, $type) {
                if($type === 'search') {
                    return $query->whereNull('settings->isBooking')
                                     ->orWhere('settings->isBooking', false);
                } elseif ($type === 'booking') {
                    return $query->where('settings->isBooking', true);
                } else {
                    return $query;
                }
            });

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

        $notificationCount = 1;
        $manyDates = [];
        if($settings['dates']){
            $notificationCount = count($settings['dates']);
        }

        for ($i = 0; $i < $notificationCount; $i++) {
            $notification = new Notification();
            $notification->user_id = $user->id;
            if(count($settings['dates']) > 0){
                $settings['checkUntilDate'] = $settings['dates'][$i];
            }
            $notification->settings = $settings;
            $notification->status = 'started';
            $notification->save();
        }


        return response()->json(['message' => 'Notification created', 'notification' => $notification]);
    }

    public function deleteNotification($notificationId)
    {
        $notification = Notification::find($notificationId);
        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }
}
