<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Traits\UsesTelegram;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class SendUserNotificationMessage implements ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use UsesTelegram;
    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $message,
        public string $parse_mode,
        public $keyboard = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $token = config('telegram.bot_token_notification');
        $group = config('telegram.notification_group');
        $telegram = $this->useTelegram();
        $telegram->setBotToken($token);
        $telegram->sendMessage($group, $this->message, $this->parse_mode, false, null, $this->keyboard);
    }
}