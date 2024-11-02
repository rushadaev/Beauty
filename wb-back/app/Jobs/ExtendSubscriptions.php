<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Jobs\SendTelegramMessage;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use Carbon\Carbon;

class ExtendSubscriptions implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $botToken = config('telegram.bot_token_supplies');
        $message = "Дорогие пользователи, мы отлаживаем работу бота.\nМы продлили всем пользователям 7 дней подписки 🫶";
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '🏠 На главную', 'callback_data' => 'wh_main_menu']]
        ]);
    
        // Fetch all users with a telegram_id
        $users = User::whereNotNull('telegram_id')->get();
        // $users = User::where('id', 1)->get();
    
        $totalUsers = $users->count();
        $processedUsers = 0;
    
        Log::info('Starting to process users for subscription extension and Telegram messaging. Total users: ' . $totalUsers);
    
        // Split users into chunks of 30 to respect Telegram's rate limit of 30 messages per second
        $userChunks = $users->chunk(30);
    
        foreach ($userChunks as $chunk) {
            foreach ($chunk as $user) {
                // Extend the subscription for 7 days
                $user->subscription_until = $user->subscription_until->addDays(7);
                $user->save();
    
                $processedUsers++;
    
                // Log progress in "1/x subscription extended" format
                Log::info("{$processedUsers}/{$totalUsers} subscription extended for user ID " . $user->id . ' until ' . $user->subscription_until);
    
                // Dispatch the job to send a message to each user in the chunk
                SendTelegramMessage::dispatch($user->telegram_id, $message, 'HTML', $keyboard, $botToken);
    
                Log::info('Dispatched message to Telegram ID ' . $user->telegram_id);
            }
    
            // Wait for 1 second before processing the next chunk
            sleep(1);
    
            Log::info('Processed a chunk of 30 users. Sleeping for 1 second to respect rate limits.');
        }
    
        Log::info('Completed processing all users for subscription extension and Telegram messaging.');
    }
    
}
