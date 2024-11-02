<?php

namespace App\Services;

use TelegramBot\Api\BotApi;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class TelegramService
{
    protected $telegram;

    public function __construct($botToken = null)
    {
        $this->setBotToken($botToken ?? config('telegram.bot_token'));
    }

    public function setBotToken($botToken)
    {
        $this->telegram = new BotApi($botToken);
    }

    public function sendMessage($chatId, $message, $parseMode = 'HTML', $disableWebPagePreview = false, $replyToMessageId = null, InlineKeyboardMarkup $replyMarkup = null)
    {
        return $this->telegram->sendMessage($chatId, $message, $parseMode, $disableWebPagePreview, $replyToMessageId, $replyMarkup);
    }

    public function deleteMessage($chatId, $messageId)
    {
        return $this->telegram->deleteMessage($chatId, $messageId);
    }

    // Add more methods as needed
}