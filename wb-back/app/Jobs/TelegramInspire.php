<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Traits\UsesTelegram;

class TelegramInspire implements ShouldQueue
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
        public string $botToken,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $token = $this->botToken;
        $telegram = $this->useTelegram();
        $telegram->setBotToken($token);
        $telegram->sendMessage($this->telegramId, $this->message, $this->parse_mode, false, null, null);
    }
}