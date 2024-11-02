<?php

namespace App\Http\Controllers;

use TelegramBot\Api\Client;
use App\Models\User;
use App\Http\Controllers\FeedbackAutoSendController;
use App\Http\Controllers\FeedbackConfirmController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use TelegramBot\Api\Types\ReplyKeyboardMarkup;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use App\Traits\UsesWildberriesSupplies;
use App\Jobs\DeleteTelegramMessage;
use App\Models\Cabinet;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class WelcomeBotController extends Controller
{
    use UsesWildberriesSupplies;
    
    public function __construct(
        protected Client $bot,
    ) {}
    
    protected function sendOrUpdateMessage($chatId, $messageId = null, $message, $keyboard = null, $parse_mode = null){
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

    public function handleStart($chatId, $messageId = null)
    {
        $message = "🎉 Добро пожаловать!\n

🍓 ✧ WB - Автоответ ✧ - умный помощник для вашего бизнеса.\n

🤖 В бота внедрён искусственный интеллект, который обучен максимально эффективно обрабатывать отзывы покупателей.\n

👤 Создает индивидуальный ответ, учитывая конкретные пожелания или проблемы клиента.\n

✨ Ответы совершенно не отличается от ответов человека!\n

👉 Бот поддерживает Wildberries\n

✅ Нам доверяют более 100 крупных поставщиков!";
        $keyboard = new InlineKeyboardMarkup([
            [['text' => 'Продолжить ➡️', 'callback_data' => 'welcome_advertisement']],
            [['text' => '👤 Перейти в кабинет ', 'callback_data' => 'welcome_cabinet']],
        ]);
    
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function handleAdvertisement($chatId, $messageId = null)
    {
        $message = "🤔 Почему Вам стоит подключить бота?

Отзывы серьезно влияют на решение клиента при выборе товара. Клиенты намного положительнее относятся к продавцу и его продукту, если продавец активно работает с отзывами.

Но как успевать отвечать, делать каждый ответ уникальным и при этом избежать путаницы в указываемых рекомендациях?

И хотя шаблонные ответы справляются с частью  задач, их основной недостаток - отсутствие индивидуальности.

🍓 WB - Автоответ все это умеет!

🔄 Анализирует не только количество звезд в отзыве, но и текст комментария.

🛍 Уместно рекомендует товары, создавая связанные и интересные предложения.

⚙️ Может сразу отправлять ответы или только после Вашего подтверждения.

🖋 Умеет обращаться по имени, добавлять подпись к каждому ответу, благодарить за фото и многое другое!";
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '👤 Перейти в кабинет', 'callback_data' => 'welcome_cabinet']],
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']] 
        ]);
    
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function handleCabinet($chatId, $messageId = null)
    {
        $user = Auth::user();
        $keysCount = $user->apiKeysCount();
        $message = "🍓 Личный кабинет

· ID: {$user->telegram_id}
· Кабинетов: {$keysCount}";

        // Default keyboard buttons
        $keyboardButtons = [
            [['text' => '🔑 Ключи', 'callback_data' => 'welcome_cabinet_list'], ['text' => '💳 Оплата', 'callback_data' => 'welcome_pay']],
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
        ];

        // Conditionally add the "Setup cabinet" button if the user has API keys
        if ($keysCount > 0) {
            array_unshift($keyboardButtons, [['text' => '🔧 Настроить кабинет', 'callback_data' => 'welcome_setup_cabinet']]);
        }

        $keyboard = new InlineKeyboardMarkup($keyboardButtons);
        
    
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function handlePay($chatId, $messageId = null)
    {
        $user = Auth::user();
        $keysCount = $user->apiKeysCount();
        $message = "💳 Баланс: 0 токенов

· 1 токен = 1 генерация ответа
· Токены будут расходоваться на все подключенные кабинеты, не сгорают.

✅ Можно оплатить по счету через поддержку. Отправьте ИНН компании и необходимое кол-во токенов.

ℹ️ Оплачивая любой пакет, вы подверждаете согласие с офертой.";
    $keyboard = new InlineKeyboardMarkup([
        [['text' => '100 токенов -> 390р', 'callback_data' => 'pay_100_tokens']],
        [['text' => '500 токенов -> 1490р', 'callback_data' => 'pay_500_tokens']],
        [['text' => '1000 токенов -> 2290р', 'callback_data' => 'pay_1000_tokens']],
        [['text' => '5000 токенов -> 8490р', 'callback_data' => 'pay_5000_tokens']],
        [['text' => '10000 токенов -> 12990р', 'callback_data' => 'pay_10000_tokens']],
        [['text' => '💳 Оплата по счету', 'url' => 'https://your-payment-url.com']],
        [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
    ]);
        
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function handleCabinetList($chatId, $messageId = null)
    {
        $user = Auth::user();
        $apiKeys = $user->apiKeys;
    
        $message = "📝 Список подключенных ключей:\n\n";
    
        if ($apiKeys->isEmpty()) {
            $message .= "Нет подключенных ключей.\n";
        } else {
            foreach ($apiKeys as $apiKey) {
                $shortApiKey = '...' . substr($apiKey->api_key, -4); // Display only the last 4 characters
                $message .= "🛠️ Сервис: {$apiKey->service}\n🔑 Ключ: {$shortApiKey}\n\n";
            }
        }
    
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '+ Добавить ключ', 'callback_data' => 'welcome_add_key']],
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']] 
        ]);
    
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function handleAddKey($chatId, $messageId = null)
    {
        $user = Auth::user();
        $apiKeys = $user->apiKeys;
    
        $message = "🍓 Подключите кабинет по токену (его может получить только владелец магазина).

1️⃣ Зайдите в Личный кабинет WB -> Настройки -> Доступ к API (ссылка https://seller.wildberries.ru/supplier-settings/access-to-api).

2️⃣ Нажмите кнопку [+ Создать новый токен] и введите любое имя токена (например WbAutoReplyBot).

3️⃣ Выберите тип \"Вопросы и отзывы\".

4️⃣ Нажмите [Создать токен] и отправте его в этот чат.";
        if (!Gate::forUser($user)->allows('accessService', 'feedback')) {
            $updatedMessage = $this->sendOrUpdateMessage($chatId, $messageId, $message, null);
            Cache::put("session_{$user->telegram_id}", ['action' => 'collect_wb_feedback_api_key', 'messageId' => $updatedMessage->getMessageId()], 300); // Cache for 5 minutes
            return false;
        }
        $message = '✅ У вас уже имеется ключ отзывы WB';
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '👤 Обратно в кабинет', 'callback_data' => 'welcome_cabinet']] 
        ]);
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function handleManageCabinet($chatId, $messageId = null)
    {
        $user = Auth::user();

        // Step 1: Retrieve the first (and only) cabinet for the user
        $cabinet = $user->cabinets()->firstOrFail();
        $cabinetId = $cabinet->id;
        // Step 2: Prepare the message content with cabinet details
        $message = "🆔 {$cabinet->id}\n📋: {$cabinet->name}";

        // Step 3: Create an inline keyboard for managing the cabinet
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '⚙️ Настроить отзывы', 'callback_data' => "welcome_manage_reviews_{$cabinetId}"]],
            [['text' => '⚙️ Настроить вопросы', 'callback_data' => "welcome_manage_questions_{$cabinetId}"]],
            [['text' => '❌ Удалить кабинет', 'callback_data' => "welcome_delete_cabinet_{$cabinetId}"]],
            [['text' => '🔙 Назад', 'callback_data' => 'welcome_cabinet']]
        ]);

        // Step 4: Send or update the message with the cabinet management options
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }
    
    public function handleInlineQuery($chatId, $data, $messageId = null)
    {
        $mapping = [
            'welcome_start' => 'handleStart',
            'welcome_advertisement' => 'handleAdvertisement',
            'welcome_cabinet' => 'handleCabinet',
            'welcome_pay' => 'handlePay',
            'welcome_cabinet_list' => 'handleCabinetList',
            'welcome_add_key' => 'handleAddKey',
            'welcome_setup_cabinet' => 'handleManageCabinet',
        ];
        switch (true) {
            case isset($mapping[$data]):
                $this->{$mapping[$data]}($chatId, $messageId);
                break;
        
            case strpos($data, 'welcome_manage_reviews_') === 0:
                $cabinetId = str_replace('welcome_manage_reviews_', '', $data);
                $this->handleManageReviews($chatId, $cabinetId, $messageId);
                break;
        
            case strpos($data, 'welcome_manage_questions_') === 0:
                $cabinetId = str_replace('welcome_manage_questions_', '', $data);
                $this->handleManageQuestions($chatId, $cabinetId, $messageId);
                break;
        
            case strpos($data, 'welcome_delete_cabinet_') === 0:
                $cabinetId = str_replace('welcome_delete_cabinet_', '', $data);
                $this->handleDeleteCabinet($chatId, $cabinetId, $messageId);
                break;

            case strpos($data, 'welcome_feedback_settings_autosend_') === 0:
                $cabinetId = preg_replace('/^welcome_feedback_settings_autosend_/', '', $data);
                $cabinetId = (int) filter_var($cabinetId, FILTER_SANITIZE_NUMBER_INT);
                if (strpos($data, 'setup_') !== false) {
                    $this->handleAutosendSetup($chatId, $cabinetId, 'setup', $messageId);
                } elseif (strpos($data, 'toggle_') !== false) {
                    $this->handleAutosendToggle($chatId, $cabinetId, 'toggle', $messageId);
                } elseif (strpos($data, 'send_if_no_text_') !== false) {
                    $this->handleAutosendToggleNoText($chatId, $cabinetId, 'toggle_no_text', $messageId);
                } elseif (strpos($data, 'send_if_with_text_') !== false) {
                    $this->handleAutosendToggleWithText($chatId, $cabinetId, 'toggle_with_text', $messageId);
                }
                break;

            case strpos($data, 'welcome_feedback_settings_confirm_') === 0:
                $cabinetId = preg_replace('/^welcome_feedback_settings_confirm_/', '', $data);
                $cabinetId = (int) filter_var($cabinetId, FILTER_SANITIZE_NUMBER_INT);
                if (strpos($data, 'setup_') !== false) {
                    $this->handleConfirmSetup($chatId, $cabinetId, 'setup', $messageId);
                } elseif (strpos($data, 'toggle_') !== false) {
                    $this->handleConfirmToggle($chatId, $cabinetId, 'toggle', $messageId);
                } elseif (strpos($data, 'send_if_no_text_') !== false) {
                    $this->handleConfirmToggleNoText($chatId, $cabinetId, 'toggle_no_text', $messageId);
                } elseif (strpos($data, 'send_if_with_text_') !== false) {
                    $this->handleConfirmToggleWithText($chatId, $cabinetId, 'toggle_with_text', $messageId);
                }
                break;
        
            case strpos($data, 'welcome_feedback_settings_confirm_') === 0:
            case strpos($data, 'welcome_feedback_settings_recommend_') === 0:
            case strpos($data, 'welcome_feedback_settings_enabled_') === 0:
                $cabinetId = str_replace(['welcome_feedback_settings_confirm_', 'welcome_feedback_settings_recommend_', 'welcome_feedback_settings_enabled_'], '', $data);
                $setting = str_contains($data, 'confirm') ? 'confirm_before_sending' : (str_contains($data, 'recommend') ? 'recommend_products' : 'enabled');
                $this->handleToggleSetup($chatId, $cabinetId, $setting, $messageId);
                break;
        
            default:
                return response()->json(['status' => 'success'], 200);
        }
    
        return response()->json(['status' => 'success'], 200);
    }

    //Настройки отзывов
    public function handleManageReviews($chatId, $cabinetId, $messageId = null)
    {
        // Retrieve the cabinet
        $user = Auth::user();
        $cabinet = $user->cabinets()->findOrFail($cabinetId);

        // Generate a unique command for adding the bot to the chat
        $uniqueCommand = 'AddReviews_' . $cabinetId;

        // Decode the settings JSON into an associative array
        $settings = $cabinet->settings;

        // Check if 'group_chat_id' exists and show relevant options
        if (isset($settings['group_chat_id'])) {
            $message = "⚙️ Настройка отзывов для {$cabinet->name}\n\n";
            $message .= "- Подтверждение перед отправкой: " . (($settings['confirm_before_sending'] ?? false) ? '<code>Включено</code>' : '<code>Отключено</code>') . "\n";
            $message .= "- Автоматическая отправка: " . (($settings['autosend']['enabled'] ?? false) ? '<code>Включено</code>' : '<code>Отключено</code>') . "\n";
            $message .= "- Рекомендация товаров: " . (($settings['recommend_products'] ?? false) ? '<code>Включено</code>' : '<code>Отключено</code>') . "\n\n";

            $message .= "- Работа бота: " . (($settings['enabled'] ?? false) ? '<code>Включена</code>' : '<code>Отключена</code>') . "\n";

            $keyboard = [];

            if ($settings['enabled'] ?? false) {
                // If the bot is enabled, show all options
                $keyboard = new InlineKeyboardMarkup([
                    [['text' => ($settings['confirm_before_sending'] ?? false) ? '✅ Подтверждение включено' : '❌ Подтверждение отключено', 'callback_data' => "welcome_feedback_settings_confirm_setup_$cabinet->id"]],
                    [['text' => ($settings['autosend']['enabled'] ?? false) ? '✅ Настройка автоотправки' : '❌ Настройка автоотправки', 'callback_data' => "welcome_feedback_settings_autosend_setup_$cabinet->id"]],
                    [['text' => ($settings['recommend_products'] ?? false) ? '✅ Рекомендации включены' : '❌ Рекомендации отключены', 'callback_data' => "welcome_feedback_settings_recommend_$cabinet->id"]],
                    [['text' => ($settings['enabled'] ?? false) ? '✅ Бот включен' : '❌ Бот выключен', 'callback_data' => "welcome_feedback_settings_enabled_$cabinet->id"]],
                    [['text' => '🔙 Назад', 'callback_data' => 'welcome_setup_cabinet']]
                ]);
            } else {
                // If the bot is disabled, only show the "Enable Bot" and "Back" options
                $keyboard = new InlineKeyboardMarkup([
                    [['text' => '❌ Включить бота', 'callback_data' => "welcome_feedback_settings_enabled_$cabinet->id"]],
                    [['text' => '🔙 Назад', 'callback_data' => 'welcome_setup_cabinet']]
                ]);
            }
        } else {
            $message = "Чтобы включить автоматические ответы, нужно подключить чат.
    1️⃣ Создайте чат
    2️⃣ Нажмите на кнопку снизу и выберите нужный чат
    3️⃣ Если бот просит ввести команду, отправьте в чат <code>/start $uniqueCommand</code> (нажмите для копирования)";

            $botUsername = 'wbhelpyfb_bot';
            $link = "https://t.me/{$botUsername}?startgroup=true";
            $keyboard = new InlineKeyboardMarkup([
                [[
                    'text' => '+ Добавить чат',
                    'url' => $link 
                ]],
                [['text' => '🔙 Назад', 'callback_data' => 'welcome_setup_cabinet']]
            ]);
        }

        // Send or update the message with the instructions and options
        $updatedMessage = $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard, 'HTML');
        Cache::put("add_key_message_id_{$user->telegram_id}", ['action' => 'add_key', 'messageId' => $updatedMessage->getMessageId()], 300); // Cache for 5 minutes
    }

    protected function handleManageQuestions($chatId, $cabinetId, $messageId = null)
    {
        // Retrieve the cabinet
        $user = Auth::user();
        $cabinet = $user->cabinets()->findOrFail($cabinetId);

        // Placeholder message for managing questions
        $message = "Вы находитесь в разделе управления вопросами для кабинета: {$cabinet->name}.

    Эта функция еще не реализована.";

        // Inline keyboard to return to cabinet management or main menu
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '🔙 Назад к кабинету', 'callback_data' => 'welcome_cabinet']],
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
        ]);

        // Send or update the message
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    //Setup autosend
    public function handleAutosendSetup($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackAutoSendController = new FeedbackAutoSendController($this->bot);
        $feedbackAutoSendController->setupAutoSend($chatId, $cabinetId, $messageId);
    }

    protected function handleAutosendToggle($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackAutoSendController = new FeedbackAutoSendController($this->bot);
        $feedbackAutoSendController->toggleAutoSend($chatId, $cabinetId, $messageId);
    }

    protected function handleAutosendToggleNoText($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackAutoSendController = new FeedbackAutoSendController($this->bot);
        $feedbackAutoSendController->toggleSendIfNoText($chatId, $cabinetId, $messageId);
    }

    protected function handleAutosendToggleWithText($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackAutoSendController = new FeedbackAutoSendController($this->bot);
        $feedbackAutoSendController->toggleSendIfWithText($chatId, $cabinetId, $messageId);
    }

    public function handleCollectStarRangeAutosend($chatId, $text, $cabinetId, $messageIdOriginal, $messageId){
        $feedbackAutoSendController = new FeedbackAutoSendController($this->bot);
        $feedbackAutoSendController->setStarRangeAutosend($chatId, $cabinetId, $text, $messageIdOriginal, $messageId); 
    }

    //Setup Confirm
    public function handleConfirmSetup($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackConfirmController = new FeedbackConfirmController($this->bot);
        $feedbackConfirmController->setupConfirm($chatId, $cabinetId, $messageId);
    }

    protected function handleConfirmToggle($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackConfirmController = new FeedbackConfirmController($this->bot);
        $feedbackConfirmController->toggleConfirm($chatId, $cabinetId, $messageId);
    }

    protected function handleConfirmToggleNoText($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackConfirmController = new FeedbackConfirmController($this->bot);
        $feedbackConfirmController->toggleSendIfNoText($chatId, $cabinetId, $messageId);
    }

    protected function handleConfirmToggleWithText($chatId, $cabinetId, $settingName, $messageId)
    {
        $feedbackConfirmController = new FeedbackConfirmController($this->bot);
        $feedbackConfirmController->toggleSendIfWithText($chatId, $cabinetId, $messageId);
    }

    public function handleCollectStarRangeConfirm($chatId, $text, $cabinetId, $messageIdOriginal, $messageId){
        $feedbackConfirmController = new FeedbackConfirmController($this->bot);
        $feedbackConfirmController->setStarRangeConfirm($chatId, $cabinetId, $text, $messageIdOriginal, $messageId); 
    }

    protected function handleToggleSetup($chatId, $cabinetId, $settingName, $messageId)
    {
        $user = Auth::user();
        $cabinet = $user->cabinets()->findOrFail($cabinetId);

        Log::info("Cabinet setup in progress: {$chatId}, cabinet ID: {$cabinetId}, settingName: {$settingName}");

        // Since the settings attribute is automatically cast to an array, no need to decode it manually
        $settings = $cabinet->settings;

        // Toggle the specified setting
        $settings[$settingName] = !($settings[$settingName] ?? false);

        // Assign the updated settings array back to the model
        $cabinet->settings = $settings;

        // No need to manually encode settings; Laravel will handle it
        $cabinet->save();

        // Optionally, refresh the manage reviews menu
        $this->handleManageReviews($chatId, $cabinetId, $messageId);
    }

    protected function handleDeleteCabinet($chatId, $cabinetId, $messageId = null)
    {
        $user = Auth::user();

        // Retrieve and delete the cabinet
        $cabinet = $user->cabinets()->findOrFail($cabinetId);
        $cabinet->delete();

        // Notify the user that the cabinet was deleted
        $message = "Кабинет '{$cabinet->name}' успешно удален.";

        // Inline keyboard to return to the main menu
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
        ]);

        // Send or update the message
        $this->sendOrUpdateMessage($chatId, $messageId, $message, $keyboard);
    }

    public function setupCabinet($cabinetId, $chatId, $bot, $userTelegramId)
    {
        // Fetch the cabinet by ID
        $cabinet = Cabinet::findOrFail($cabinetId);

        // The settings attribute is automatically cast to an array, so no need to decode it manually
        $settings = $cabinet->settings;

        if (!is_array($settings) || empty($settings)) {
            $settings = []; // Initialize as an empty array only if not already an array or if it's empty
        }

        // Merge the existing settings with the new group_chat_id
        $cabinet->settings = array_merge($settings, [
            'group_chat_id' => $chatId,
            'enabled' => true,
        ]);

        $cabinet->save();

        // Log the event
        Log::info("Cabinet setup completed for chat: {$chatId}, cabinet ID: {$cabinetId}");

        // Send a welcome message to the chat
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '🍓 Перейти в бота', 'url' => 'https://t.me/wbhelpyfb_bot']]
        ]);

        $message = "✅ Успешно подключено";
        $bot->sendMessage($chatId, $message, null, false, null, $keyboard);


        $cachedData = Cache::get("add_key_message_id_{$userTelegramId}");

        if ($cachedData) {
            $messageId = $cachedData['messageId'] ?? null;
            if($messageId){
                $this->handleManageReviews($userTelegramId, $cabinetId, $messageId);
                Cache::forget("add_key_message_id_{$userTelegramId}");
            }
        }
    }
}
