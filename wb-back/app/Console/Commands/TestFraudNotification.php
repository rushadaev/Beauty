<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\TelegramService;
use Carbon\Carbon;

class TestFraudNotification extends Command
{
    protected $signature = 'app:test-fraud-notification';
    protected $description = 'Test fraud notification sending';

    public function handle(TelegramService $telegramService)
    {
        $this->info('Testing fraud notification sending...');

        $testMessage = "🚨 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ О ФРОДЕ*\n\n";
        $testMessage .= "📱 Телефон клиента: `+79059924787`\n";
        $testMessage .= "🏢 Филиал: Cherry Town Спортивная\n\n";
        
        $testMessage .= "\n📅 *2025-01-01*\n";
        $testMessage .= "Количество записей: 7\n\n";
        
        $testMessage .= "Записи:\n";
        $testMessage .= "🕒 09:00 - Услуга для теста\n";
        $testMessage .= "🕒 10:00 - Услуга для теста\n";
        $testMessage .= "🕒 11:00 - Услуга для теста\n";
        $testMessage .= "(и ещё 4 записи)\n\n";
        
        $testMessage .= "⚠️ Причины подозрения:\n";
        $testMessage .= "- 7 записей за один день\n";
        $testMessage .= "- Последовательные записи с 9:00 до 15:00\n";
        $testMessage .= "- Одинаковые услуги\n\n";
        
        $testMessage .= "⚠️ Необходимо проверить записи и связаться с клиентом!";

        try {
            $result = $telegramService->sendMessageToAllAdmins($testMessage);
            
            if ($result) {
                $this->info('Test notification sent successfully!');
            } else {
                $this->error('Failed to send test notification');
            }
            
            return $result ? 0 : 1;
        } catch (\Exception $e) {
            $this->error('Error sending test notification: ' . $e->getMessage());
            return 1;
        }
    }
}