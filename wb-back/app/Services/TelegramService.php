<?php

namespace App\Services;

use TelegramBot\Api\BotApi;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected $telegram;

    public function __construct($botToken = null)
    {
        $this->setBotToken($botToken ?? config('telegram.bot_token_supplies'));
    }

    public function setBotToken($botToken)
    {
        $this->telegram = new BotApi($botToken);
    }

    public function sendMessage($chatId, $message, $parseMode = 'HTML', $disableWebPagePreview = false, $replyToMessageId = null, InlineKeyboardMarkup $replyMarkup = null)
    {
        try {
            return $this->telegram->sendMessage(
                $chatId, 
                $message, 
                $parseMode, 
                $disableWebPagePreview, 
                $replyToMessageId, 
                $replyMarkup
            );
        } catch (\Exception $e) {
            Log::error('Error sending Telegram message:', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    public function sendDocument($chatId, $content, $filename = null)
{
    try {
        // Создаем временный файл с контентом
        $tmpPath = tempnam(sys_get_temp_dir(), 'tg_doc_');
        file_put_contents($tmpPath, $content);
        
        // Создаем CURLFile для отправки
        $document = new \CURLFile($tmpPath, 'application/zip', $filename);
        
        $result = $this->telegram->sendDocument(
            $chatId,
            $document,
            null, // caption
            null, // parse_mode
            null, // disable_notification
            null, // reply_to_message_id
            null  // reply_markup
        );
        
        // Удаляем временный файл
        unlink($tmpPath);
        
        return $result;
    } catch (\Exception $e) {
        Log::error('Error sending Telegram document:', [
            'chat_id' => $chatId,
            'filename' => $filename,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

public function sendMessageToAllAdmins($message, $parseMode = 'Markdown')
{
    try {
        // Получаем все уникальные telegram_id администраторов
        $adminTelegramIds = \App\Models\AdminNotification::select('telegram_id')
            ->whereNotNull('telegram_id')
            ->distinct()
            ->pluck('telegram_id')
            ->toArray();

        Log::info('Sending message to admins', [
            'admin_count' => count($adminTelegramIds)
        ]);

        $successCount = 0;
        foreach ($adminTelegramIds as $telegramId) {
            try {
                $this->sendMessage(
                    $telegramId,
                    $message,
                    $parseMode
                );
                $successCount++;
            } catch (\Exception $e) {
                Log::error('Failed to send message to admin', [
                    'telegram_id' => $telegramId,
                    'error' => $e->getMessage()
                ]);
            }
            // Небольшая задержка между отправками
            usleep(100000);
        }

        Log::info('Message sent to admins', [
            'success_count' => $successCount,
            'total_admins' => count($adminTelegramIds)
        ]);

        return $successCount > 0;

    } catch (\Exception $e) {
        Log::error('Error sending message to admins:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

    public function deleteMessage($chatId, $messageId)
    {
        try {
            return $this->telegram->deleteMessage($chatId, $messageId);
        } catch (\Exception $e) {
            Log::error('Error deleting Telegram message:', [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // Добавляем метод для отправки уведомлений об остатках
    public function sendWarehouseNotification($chatId, array $notifications): bool
{
    $this->setBotToken(config('telegram.bot_token_supplies'));

    $message = "⚠️ Внимание! Низкий остаток товаров:\n\n";
    
    // Получаем информацию о филиалах с авторизацией
    $companiesData = [];
    try {
        $yclientsService = app(YclientsService::class);
        
        // Авторизуемся через админа
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if ($authResult['success']) {
            $yclientsService->setUserToken($authResult['token']);
            
            $companies = $yclientsService->getCompanies([
                'active' => 1,
                'my' => 1
            ]);
            $companiesData = collect($companies)->keyBy('id')->all();
        }
    } catch (\Exception $e) {
        Log::error('Failed to get companies data:', [
            'error' => $e->getMessage()
        ]);
    }
    
    foreach ($notifications as $data) {
        // Получаем название филиала
        $companyTitle = $companiesData[$data['notification']->company_id]['title'] ?? 'Неизвестный филиал';
        
        $message .= sprintf(
            "🏢 Филиал: %s\n📦 Товар: %s\n📊 Текущий остаток: %s (мин: %s)\n⚠️ Необходимо заказать товар у поставщика\n\n",
            $companyTitle,
            $data['product']['title'],
            $data['current_amount'],
            $data['notification']->min_amount
        );
    }

    try {
        $result = $this->sendMessage(
            $chatId,
            $message,
            'HTML',
            true
        );

        return $result !== false;

    } catch (\Exception $e) {
        Log::error('Error sending warehouse notification:', [
            'chat_id' => $chatId,
            'error' => $e->getMessage()
        ]);
        return false;
    }
}
}