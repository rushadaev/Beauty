<?php

namespace App\Traits;

use App\Services\TelegramService;

trait UsesTelegram
{
    protected function useTelegram(): TelegramService
    {
        return app(TelegramService::class);
    }
}