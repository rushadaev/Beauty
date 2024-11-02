<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\Cabinet;
use App\Http\Controllers\WelcomeBotController;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use App\Jobs\DeleteTelegramMessage;
use TelegramBot\Api\Client;

class FeedbackAutoSendController extends Controller
{
    protected $bot;

    public function __construct(Client $bot)
    {
        $this->bot = $bot;
    }

    public function toggleAutoSend($chatId, $cabinetId, $messageId){
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;
    
        // Initialize the autosend array if it doesn't exist
        if (!isset($settings['autosend']) || !is_array($settings['autosend'])) {
            $settings['autosend'] = [
                'enabled' => false,
                'star_range' => '1-3',
                'send_if_no_text' => false,
                'send_if_with_text' => false,
            ];
        }
        
        // Toggle the enabled status within the autosend settings
        $settings['autosend']['enabled'] = !$settings['autosend']['enabled'];
        $cabinet->settings = $settings;
        $cabinet->save();
        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleAutosendSetup($chatId, $cabinetId, 'toggle', $messageId);
    }

    public function setupAutoSend($chatId, $cabinetId, $messageId)
    {
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;
    
        // Initialize the autosend array if it doesn't exist
        if (!isset($settings['autosend']) || !is_array($settings['autosend'])) {
            $settings['autosend'] = [
                'enabled' => false,
                'star_range' => null,
                'send_if_no_text' => false,
                'send_if_with_text' => false,
            ];
        }
    
        $cabinet->settings = $settings;
        $cabinet->save();
    
        if($settings['autosend']['star_range']){
            $starRange = $settings['autosend']['star_range'];

            // Inform the user of the current star range setting
            $setupText = ($settings['autosend']['send_if_no_text'] ? '<code>БЕЗ ТЕКСТА</code> ' : '').($settings['autosend']['send_if_with_text'] ? '<code>С ТЕКСТОМ</code> ' : '');
            $autosendEnabledText = ($settings['autosend']['enabled'] ?? false) ? 'Автоотправка <code>включена</code>' : 'Автоотправка <code>отключена</code>';
            $message = "🤖{$autosendEnabledText}\n⭐️ Сейчас установлено <code>{$starRange}</code> звезд {$setupText}-> ответы на эти отзывы сразу отправляются в Wildberries.\n📝 Чтобы изменить звезды, введите новый промежуток";
            $keyboard = new InlineKeyboardMarkup([
                [['text' => '🔙 Назад', 'callback_data' => "welcome_manage_reviews_{$cabinetId}"]],
                [['text' => ($settings['autosend']['enabled'] ?? false) ? '✅ Автоотправка включена' : '❌ Автоотправка отключена', 'callback_data' => "welcome_feedback_settings_autosend_toggle_$cabinet->id"]],
                [['text' => ($settings['autosend']['send_if_no_text'] ?? false) ? '✅ Отправлять только если отзыв без текста' : '❌ Отправлять только если отзыв без текста', 'callback_data' => "welcome_feedback_settings_autosend_send_if_no_text_$cabinet->id"]],
                [['text' => ($settings['autosend']['send_if_with_text'] ?? false) ? '✅ Отправлять только если отзыв c текстом' : '❌ Отправлять только если отзыв с текстом', 'callback_data' => "welcome_feedback_settings_autosend_send_if_with_text_$cabinet->id"]],
            ]);
        } else {
            // Ask for star range input
            $message = "📝 Введите промежуток звёзд (например, 4-5) у отзывов, которые должны сразу отправляться в Wildberries.\n⭐️ Если не введено, установится 1-3 звезды.";
            $keyboard = new InlineKeyboardMarkup([
                [['text' => ($settings['autosend']['enabled'] ?? false) ? '✅ Автоотправка включена' : '❌ Автоотправка отключена', 'callback_data' => "welcome_feedback_settings_autosend_toggle_$cabinet->id"]],
                [['text' => '🔙 Назад', 'callback_data' => "welcome_manage_reviews_{$cabinetId}"]]
            ]);
        }

        // Cache the action to expect user input for star range
        Cache::put("session_{$chatId}", ['action' => 'collect_star_range_autosend', 'cabinetId' => $cabinetId, 'messageId' => $messageId], 300);

        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard, 'HTML');
    }

    public function setStarRangeAutosend($chatId, $cabinetId, $starRange, $messageIdOriginal, $messageId)
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
        $settings['autosend']['star_range'] = $starRange;
        $cabinet->settings = $settings;
        $cabinet->save();
        Cache::forget("session_{$chatId}");
        $this->bot->deleteMessage($chatId, $messageId);
        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleAutosendSetup($chatId, $cabinetId, 'star_range', $messageIdOriginal);
    }

    public function toggleSendIfNoText($chatId, $cabinetId, $messageId)
    {
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;

        // Toggle the send_if_no_text setting and turn off send_if_with_text if it is on
        $settings['autosend']['send_if_no_text'] = !($settings['autosend']['send_if_no_text'] ?? false);
        if ($settings['autosend']['send_if_no_text']) {
            $settings['autosend']['send_if_with_text'] = false;
        }
        $cabinet->settings = $settings;
        $cabinet->save();

        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleAutosendSetup($chatId, $cabinetId, 'toggle', $messageId);
    }

    public function toggleSendIfWithText($chatId, $cabinetId, $messageId)
    {
        $cabinet = Cabinet::findOrFail($cabinetId);
        $settings = $cabinet->settings;

        // Toggle the send_if_with_text setting and turn off send_if_no_text if it is on
        $settings['autosend']['send_if_with_text'] = !($settings['autosend']['send_if_with_text'] ?? false);
        if ($settings['autosend']['send_if_with_text']) {
            $settings['autosend']['send_if_no_text'] = false;
        }
        $cabinet->settings = $settings;
        $cabinet->save();

        $welcomeBotController = new WelcomeBotController($this->bot);
        $welcomeBotController->handleAutosendSetup($chatId, $cabinetId, 'toggle', $messageId);
    }

    private function getAutoSendKeyboard($cabinet)
    {
        $settings = $cabinet->settings;

        return new InlineKeyboardMarkup([
            [['text' => '🔙 Назад', 'callback_data' => "welcome_manage_reviews_{$cabinetId}"]],
            [['text' => ($settings['autosend']['send_if_no_text'] ?? false) ? '✅ Отправлять если отзыв без текста' : '❌ Отправлять если отзыв без текста', 'callback_data' => "toggle_send_if_no_text_$cabinet->id"]],
            [['text' => ($settings['autosend']['send_if_with_text'] ?? false) ? '✅ Отправлять если отзыв с текстом' : '❌ Отправлять если отзыв с текстом', 'callback_data' => "toggle_send_if_with_text_$cabinet->id"]],
        ]);
    }

    private function validateStarRange($starRange)
    {
        return preg_match('/^[1-5]-[1-5]$/', $starRange) || preg_match('/^[1-5]$/', $starRange);
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