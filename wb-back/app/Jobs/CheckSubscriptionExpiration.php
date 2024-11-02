<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use App\Jobs\SendTelegramMessage;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class CheckSubscriptionExpiration implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $users = User::whereNotNull('subscription_until')
                     ->where('is_paid', true)
                     ->get();

        $keyboard = new InlineKeyboardMarkup([
            [['text' => '💵 Подписка', 'callback_data' => 'wh_payment']],
            [['text' => '🏠 На главную', 'callback_data' => 'wh_main_menu']]
        ]);

        $botToken = config('telegram.bot_token_supplies');
        

        foreach ($users as $user) {
            $subscriptionEnd = Carbon::parse($user->subscription_until);
            $telegramId = $user->telegram_id;
            $username = $user->name;
            
            // Check for 12 hours before expiration
            if ($subscriptionEnd->subHours(12)->isPast() && !$user->notified_12_hours) {
                // Send 12-hour notification
                // $user->notify(new \App\Notifications\SubscriptionEndingNotification(12));

                $message = "Ваша подписка заканчивается через 12 часов";
                SendTelegramMessage::dispatch($telegramId, $message, 'HTML', $keyboard, $botToken);

                $user->notified_12_hours = true;
                $user->save();
            }

            // Check for 3 hours before expiration
            if ($subscriptionEnd->subHours(3)->isPast() && !$user->notified_3_hours) {
                // Send 3-hour notification
                // $user->notify(new \App\Notifications\SubscriptionEndingNotification(3));

                $message = "Ваша подписка заканчивается через 3 часа";
                SendTelegramMessage::dispatch($telegramId, $message, 'HTML', $keyboard, $botToken);

                $user->notified_3_hours = true;
                $user->save();
            }
        }
    }
}
