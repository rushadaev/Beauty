<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Traits\UsesTelegram;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class DeleteTelegramMessage implements ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use UsesTelegram;
    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $telegramId,
        public string $messageId,
        public string $botToken,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        sleep(3);
        $telegram = $this->useTelegram();
        $telegram->setBotToken($this->botToken);
        $telegram->deleteMessage($this->telegramId, $this->messageId);
    }
}