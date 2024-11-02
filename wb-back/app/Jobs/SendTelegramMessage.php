<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Traits\UsesTelegram;
use App\Models\User;
use App\Models\Notification;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class SendTelegramMessage implements ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use UsesTelegram;
    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $telegramId,
        public string $message,
        public string $parse_mode,
        public $keyboard = null,
        public $botToken = null,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $botToken = $this->botToken ?? config('telegram.bot_token');
        $telegram = $this->useTelegram();
        $telegram->setBotToken($botToken);
    
        try {
            $telegram->sendMessage($this->telegramId, $this->message, $this->parse_mode, false, null, $this->keyboard);
        } catch (\TelegramBot\Api\HttpException $e) {
            if ($e->getCode() === 403 && strpos($e->getMessage(), 'bot was blocked by the user') !== false) {
                // Handle the case when the bot is blocked by the user
                \Log::error("Bot blocked by user with telegram ID: {$this->telegramId}");
    
                // Update the status of notifications to 'blocked' for this user
                $this->blockUserNotifications($this->telegramId);
    
            } else {
                // Handle other Http exceptions
                throw $e; // Re-throw the exception if it's not the specific one we're handling
            }
        } catch (\Exception $e) {
            // Handle any other exceptions
            \Log::error("An error occurred: " . $e->getMessage());
            throw $e; // Optionally re-throw the exception after logging it
        }
    }


    /**
     * Update user notifications status to 'blocked' when bot is blocked by the user.
     */
    protected function blockUserNotifications($telegramId)
    {
        // Retrieve the user by telegram ID
        $user = User::where('telegram_id', $telegramId)->first();

        if ($user) {
            // Update the notifications for the user to 'blocked'
            $user->notifications()->where('status', 'started')->update(['status' => 'blocked']);
        }
    }
}