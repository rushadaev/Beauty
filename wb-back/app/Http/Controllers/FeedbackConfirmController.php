<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\Cabinet;
use App\Http\Controllers\WelcomeBotController;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use App\Jobs\DeleteTelegramMessage;
use TelegramBot\Api\Client;

class FeedbackConfirmController extends Controller
{
    protected $bot;

    public function __construct(Client $bot)
    {
        $this->bot = $bot;
    }

    public function toggleConfirm($chatId, $cabinetId, $messageId){
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;
    
        // Initialize the confirm array if it doesn't exist
        if (!isset($settings['confirm_before_sending']) || !is_array($settings['confirm_before_sending'])) {
            $settings['confirm_before_sending'] = [
                'enabled' => false,
                'star_range' => '1-2',
                'send_if_no_text' => false,
                'send_if_with_text' => false,
            ];
        }
        
        // Toggle the enabled status within the confirm settings
        $settings['confirm_before_sending']['enabled'] = !$settings['confirm_before_sending']['enabled'];
        $cabinet->settings = $settings;
        $cabinet->save();
        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleConfirmSetup($chatId, $cabinetId, 'toggle', $messageId);
    }

    public function setupConfirm($chatId, $cabinetId, $messageId)
    {
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;
    
        // Initialize the confirm array if it doesn't exist
        if (!isset($settings['confirm_before_sending']) || !is_array($settings['confirm_before_sending'])) {
            $settings['confirm_before_sending'] = [
                'enabled' => false,
                'star_range' => null,
                'send_if_no_text' => false,
                'send_if_with_text' => false,
            ];
        }
    
        $cabinet->settings = $settings;
        $cabinet->save();
    
        if($settings['confirm_before_sending']['star_range']){
            $starRange = $settings['confirm_before_sending']['star_range'];

            // Inform the user of the current star range setting
            $setupText = ($settings['confirm_before_sending']['send_if_no_text'] ? '<code>БЕЗ ТЕКСТА</code> ' : '').($settings['confirm_before_sending']['send_if_with_text'] ? '<code>С ТЕКСТОМ</code> ' : '');
            $confirmEnabledText = ($settings['confirm_before_sending']['enabled'] ?? false) ? 'Подтверждение <code>включено</code>' : 'Подтверждение <code>отключено</code>';
            $message = "🤖{$confirmEnabledText}\n⭐️ Сейчас установлено <code>{$starRange}</code> звезд {$setupText}-> ответы на эти отзывы сразу отправляются <code>в чат для ручного подтверждения</code>.\n📝 Чтобы изменить звезды, введите новый промежуток";
            $keyboard = new InlineKeyboardMarkup([
                [['text' => '🔙 Назад', 'callback_data' => "welcome_manage_reviews_{$cabinetId}"]],
                [['text' => ($settings['confirm_before_sending']['enabled'] ?? false) ? '✅ Подтверждение включена' : '❌ Подтверждение отключена', 'callback_data' => "welcome_feedback_settings_confirm_toggle_$cabinet->id"]],
                [['text' => ($settings['confirm_before_sending']['send_if_no_text'] ?? false) ? '✅ Генерировать ответ, если отзыв без текста' : '❌ Генерировать ответ, если отзыв без текста', 'callback_data' => "welcome_feedback_settings_confirm_send_if_no_text_$cabinet->id"]],
                [['text' => ($settings['confirm_before_sending']['send_if_with_text'] ?? false) ? '✅ Генерировать ответ, если отзыв c текстом' : '❌ Генерировать ответ, если отзыв с текстом', 'callback_data' => "welcome_feedback_settings_confirm_send_if_with_text_$cabinet->id"]],
            ]);
        } else {
            // Ask for star range input
            $message = "📝 Введите промежуток звёзд (например, 1-3) у отзывов, которые должны быть с ручным подтверждением.\n⭐️ Если не введено, установится 1-2 звезды.";
            $keyboard = new InlineKeyboardMarkup([
                [['text' => ($settings['confirm_before_sending']['enabled'] ?? false) ? '✅ Подтверждение включено' : '❌ Подтверждение отключено', 'callback_data' => "welcome_feedback_settings_confirm_toggle_$cabinet->id"]],
                [['text' => '🔙 Назад', 'callback_data' => "welcome_manage_reviews_{$cabinetId}"]]
            ]);
        }

        // Cache the action to expect user input for star range
        Cache::put("session_{$chatId}", ['action' => 'collect_star_range_confirm', 'cabinetId' => $cabinetId, 'messageId' => $messageId], 300);

        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard, 'HTML');
    }

    public function setStarRangeConfirm($chatId, $cabinetId, $starRange, $messageIdOriginal, $messageId)
    {
        if (!$this->validateStarRange($starRange)) {
            $message = "Неверный промежуток. Пример: 1-5 или 4-4";
            $messageToDelete = $this->sendOrUpdateMessage($chatId, null, $message, null, 'HTML');
            $this->bot->deleteMessage($chatId, $messageId);
            DeleteTelegramMessage::dispatch($chatId, $messageToDelete->getMessageId(), config('telegram.bot_token'));
            return;
        }

        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;

        // Save the star range and initialize text-related settings
        $settings['confirm_before_sending']['star_range'] = $starRange;
        $cabinet->settings = $settings;
        $cabinet->save();
        Cache::forget("session_{$chatId}");
        $this->bot->deleteMessage($chatId, $messageId);
        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleConfirmSetup($chatId, $cabinetId, 'star_range', $messageIdOriginal);
    }

    public function toggleSendIfNoText($chatId, $cabinetId, $messageId)
    {
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;

        // Toggle the send_if_no_text setting and turn off send_if_with_text if it is on
        $settings['confirm_before_sending']['send_if_no_text'] = !($settings['confirm_before_sending']['send_if_no_text'] ?? false);
        if ($settings['confirm_before_sending']['send_if_no_text']) {
            $settings['confirm_before_sending']['send_if_with_text'] = false;
        }
        $cabinet->settings = $settings;
        $cabinet->save();

        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleConfirmSetup($chatId, $cabinetId, 'toggle', $messageId);
    }

    public function toggleSendIfWithText($chatId, $cabinetId, $messageId)
    {
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;

        // Toggle the send_if_with_text setting and turn off send_if_no_text if it is on
        $settings['confirm_before_sending']['send_if_with_text'] = !($settings['confirm_before_sending']['send_if_with_text'] ?? false);
        if ($settings['confirm_before_sending']['send_if_with_text']) {
            $settings['confirm_before_sending']['send_if_no_text'] = false;
        }
        $cabinet->settings = $settings;
        $cabinet->save();

        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleConfirmSetup($chatId, $cabinetId, 'toggle', $messageId);
    }

    private function validateStarRange($starRange)
    {
        return preg_match('/^[1-5]-[1-5]$/', $starRange);
    }

    protected function sendOrUpdateMessage($chatId, $messageId = null, $message, $keyboard = null, $parse_mode = null)
    {
        if ($messageId) {
            try {
                return $this->bot->editMessageText($chatId, $messageId, $message, $parse_mode, false, $keyboard);
            } catch (\Exception $e) {
                // If editing fails, send a new message
                return $this->bot->sendMessage($chatId, $message, $parse_mode, false, null, $keyboard);
            }
        } else {
            return $this->bot->sendMessage($chatId, $message, $parse_mode, false, null, $keyboard);
        }
    }
}