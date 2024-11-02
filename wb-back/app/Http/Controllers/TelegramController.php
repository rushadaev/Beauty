<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use TelegramBot\Api\Client;
use TelegramBot\Api\Exception;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use App\Traits\UsesWildberries;
use App\Jobs\DeleteTelegramMessage;
use App\Models\User;

class TelegramController extends Controller
{
    use UsesWildberries;

    public function handleWebhook(Request $request)
    {
        $user = Auth::user();

        $bot = new Client(config('telegram.bot_token'));
        $warehouseBot = new WarehouseBotController($bot);
        $welcomeBot = new WelcomeBotController($bot);

        Log::info('Service Access', [
            'user' => $user,
        ]);

        $this->handleCommands($bot, $warehouseBot, $welcomeBot, $user);

        $this->handleMessages($bot, $warehouseBot, $welcomeBot, $user);

        try {
            $bot->run();
        } catch (Exception $e) {
            Log::error($e->getMessage());
        }


        // Return a response to acknowledge the webhook
        return response()->json(['status' => 'success'], 200);
    }

    protected function isAllowSuppliesFunctions($user){
        if (!Gate::forUser($user)->allows('accessService', 'supplies')) {
            Cache::put("session_{$user->telegram_id}", ['action' => 'collect_wb_suppliers_api_key'], 300); // Cache for 5 minutes
            $this->notify($user->telegram_id, '🗝️ Пожалуйста, предоставьте ваш API-ключ WB "Поставки"');
            return false;
        }
        return true;
    }

    protected function isAllowFeedbackFunctions($user){
        if (!Gate::forUser($user)->allows('accessService', 'feedback')) {
            Cache::put("session_{$user->telegram_id}", ['action' => 'collect_wb_feedback_api_key'], 300); // Cache for 5 minutes
            $this->notify($user->telegram_id, '🗝️ Пожалуйста, предоставьте ваш API-ключ WB "Отзывы"');
            return false;
        }
        return true;
    }

    protected function handleCommands(Client $bot, WarehouseBotController $warehouseBot, WelcomeBotController $welcomeBot, User $user)
    {
        $bot->command('ping', function ($message) use ($bot, $user) {
            $chatId = $message->getChat()->getId();
            Log::info("ChatMember", ['member' => 'GO!']);
            $bot->sendMessage($chatId, 'pong!');
        });
        $bot->command('start', function ($message) use ($welcomeBot, $user, $bot) {

            $chatId = $message->getChat()->getId();
            $text = $message->getText();

            $isCabinetGroupChat = $this->getUserCabinetGroupChatId($user);
            if (preg_match('/\/start\s+AddReviews_(\d+)/', $text, $matches) && $chatId != $user->telegram_id) {
                $cabinetId = $matches[1];
                $welcomeBot->setupCabinet($cabinetId, $chatId, $bot, $user->telegram_id);
            } elseif($chatId == $user->telegram_id){
                $welcomeBot->handleStart($chatId);
            } else{
                $messageId = $message->getMessageId();
                DeleteTelegramMessage::dispatch($chatId, $messageId, config('telegram.bot_token'));

                $keyboard = new InlineKeyboardMarkup([
                    [['text' => '🍓 Перейти в бота', 'url' => 'https://t.me/wbhelpyfb_bot']]
                ]);
                if($text !== '/start@wbhelpyfb_bot true'){
                    $message = "Попробуйте ввести команду в боте 🚀";
                    $bot->sendMessage($chatId, $message, null, false, null, $keyboard);
                }
                if($text == '/start@wbhelpyfb_bot true' && !$isCabinetGroupChat){
                    $message = "⚠️Не удалось автоматически подключить чат, пришлите код";
                    $bot->sendMessage($chatId, $message, null, false, null, null);
                }
            }
        });

        $bot->command('notification', function ($message) use ($warehouseBot, $user) {
            $chatId = $message->getChat()->getId();
            $warehouseBot->handleStart($chatId);
        });

        $bot->command('wb_get', function ($message) use ($warehouseBot, $user) {
            $chatId = $message->getChat()->getId();

            if(!$this->isAllowFeedbackFunctions($user))
                return;

            $this->processGetFeedback($chatId);
        });
    }

    protected function handleMessages(Client $bot, WarehouseBotController $warehouseBot, WelcomeBotController $welcomeBot, User $user)
    {
        $bot->on(function ($update) use ($bot, $warehouseBot, $user, $welcomeBot) {
            $message = $update->getMessage();
            $callbackQuery = $update->getCallbackQuery();
            $preCheckoutQuery = $update->getPreCheckoutQuery();
            $myChatMember = $update->getMyChatMember();
            $chatId = null;
            $text = null;
            $messageId = null;

            Log::info("ChatMember", ['member' => $myChatMember]);
            if ($message) {
                $chatId = $message->getChat()->getId();
                $text = $message->getText();
                $messageId = $message->getMessageId();

                if ($message->getNewChatMembers() || $message->getLeftChatMember()) {
                    Log::info("Ignoring user join/leave event in chat: {$message->getChat()->getTitle()} ({$message->getChat()->getId()})");
                    if($message->getNewChatMembers())
                        DeleteTelegramMessage::dispatch($chatId, $messageId, config('telegram.bot_token'));
                    return true;
                }

                // Process session if there is any action pending
                $this->processSession($chatId, $text, $bot, $update, $warehouseBot, $messageId, $welcomeBot);

                // Handle successful payment
                $successfulPayment = $message->getSuccessfulPayment();
                if ($successfulPayment) {
                    $bot->sendMessage($chatId, "Спасибо за покупку! Ваш платёж успешно обработан.");
                }

            } elseif ($callbackQuery) {
                $chatId = $callbackQuery->getMessage()->getChat()->getId();
                $data = $callbackQuery->getData();
                $messageId = $callbackQuery->getMessage()->getMessageId();
                $this->handleCallbackQuery($chatId, $data, $messageId, $warehouseBot, $welcomeBot, $user, $callbackQuery, $bot);
                return;
            } elseif ($preCheckoutQuery){
                $bot->answerPreCheckoutQuery([
                    'pre_checkout_query_id' => $preCheckoutQuery->getId(),
                    'ok' => true
                ]);
                Log::info('Pre checkout query', ['preCheckoutQuery' => $preCheckoutQuery]);
            } elseif ($myChatMember) {  // Handle bot being added to a chat
                Log::info("ChatMember", ['member' => $myChatMember]);
                $this->handleMyChatMember($myChatMember, $bot, $user, $welcomeBot);
            } else {
                Log::error('Update does not contain a valid message or callback query', ['update' => $update]);
                return;
            }
            return true;
        }, function () {
            return true;
        });
    }


    protected function handleMyChatMember($myChatMember, $bot, $user, $welcomeBot){
        $chat = $myChatMember->getChat();
        $newChatMember = $myChatMember->getNewChatMember();
        $status = $newChatMember->getStatus();

        // Check if the bot is added as an admin
        if ($status === 'administrator') {
            $chatId = $chat->getId();
            $chatTitle = $chat->getTitle() ?? 'Unknown';

            // Log the event
            Log::info("Bot added as admin in group: {$chatTitle} ({$chatId})");

            // You might want to store this chat's ID and title in the user's cabinet or another related table
            $cabinet = $user->cabinets()->firstOrFail();

            // Since the settings are automatically cast to an array, you don't need to decode them manually
            $settings = $cabinet->settings;

            if (!is_array($settings)) {
                $settings = [];
            }

            // Merge the existing settings with the new ones
            $cabinet->settings = array_merge($settings, [
                'group_chat_id' => $chatId,
                'enabled' => true,
            ]);

            // No need to manually encode settings; Laravel will handle it
            $cabinet->save();

            // Send a welcome message to the chat
            $keyboard = new InlineKeyboardMarkup([
                [['text' => '🍓 Перейти в бота', 'url' => 'https://t.me/wbhelpyfb_bot']]
            ]);

            $message = "✅ Успешно подключено";
            $bot->sendMessage($chatId, $message, null, false, null, $keyboard);
            $cachedData = Cache::get("add_key_message_id_{$user->telegram_id}");

            if ($cachedData) {
                $messageId = $cachedData['messageId'] ?? null;
                if($messageId){
                    $welcomeBot->handleManageReviews($user->telegram_id, $cabinet->id, $messageId);
                    Cache::forget("add_key_message_id_{$user->telegram_id}");
                }
            }
        } elseif ($status === 'member') {
            // Handle if the bot is added as a regular member (not an admin)
            $chatId = $chat->getId();
            Log::info("Bot added as a regular member in group: {$chat->getTitle()} ({$chatId})");
            // Send a welcome message to the chat
            $keyboard = new InlineKeyboardMarkup([
                [['text' => '🍓 Перейти в бота', 'url' => 'https://t.me/wbhelpyfb_bot']]
            ]);

            $message = "❌ Назначьте боту права администратора";
            $bot->sendMessage($chatId, $message, null, false, null, $keyboard);
        } else {
            $cabinet = $user->cabinets()->firstOrFail();

            // The settings attribute is already an array due to casting, so no need to manually decode it
            $settings = $cabinet->settings;

            // Check if 'group_chat_id' exists and remove it
            if (isset($settings['group_chat_id'])) {
                unset($settings['group_chat_id']);
            }

            // Assign the updated settings array back to the model
            $cabinet->settings = $settings;

            // No need to manually encode settings; Laravel will handle it
            $cabinet->save();
        }
        // Handle other status changes as needed
    }

    protected function getUserCabinetGroupChatId($user)
    {
        $cabinet = $user->cabinets()->first();

        if (!$cabinet) {
            return false; // Return false if no cabinet exists
        }

        // The settings attribute is automatically cast to an array, so no need to decode it manually
        $settings = $cabinet->settings;

        return isset($settings['group_chat_id']);
    }

    protected function handleCallbackQuery($chatId, $data, $messageId, WarehouseBotController $warehouseBot, WelcomeBotController $welcomeBot, $user, $callbackQuery, $bot)
    {
        if (strpos($data, 'wh_') === 0) {
            $warehouseBot->handleInlineQuery($chatId, $data, $messageId);
        } elseif (strpos($data, 'welcome_') === 0) {
            $welcomeBot->handleInlineQuery($chatId, $data, $messageId);
        } elseif (strpos($data, 'pay_') === 0) {
            $this->handlePayment($chatId, $data);
        } else {
            // Add handling for other types of callback queries here
            $this->handleOtherCallbackQueries($chatId, $data, $messageId);
        }

        $bot->answerCallbackQuery($callbackQuery->getId(), '', null);
        return response()->json(['status' => 'success'], 200);
    }

    protected function processSession($chatId, $text, Client $bot, $update, $warehouseBot, $messageId, $welcomeBot)
    {
        $session = Cache::get("session_{$chatId}");

        if ($session) {
            if (isset($session['action'])) {
                switch ($session['action']) {
                    case 'collect_wb_feedback_api_key':
                        //Delete add key prompt message
                        $messageIdOriginal = $session['messageId'] ?? null;
                        if($messageIdOriginal)
                            DeleteTelegramMessage::dispatch($chatId, $messageId, config('telegram.bot_token'));

                        $this->setApiKey($chatId, $text, 'feedback', $bot, $messageId);
                        break;
                    case 'collect_notification_expiration_date':
                        $warehouseBot->handleCustomDateInput($chatId, $text);
                        break;
                    case 'collect_star_range_autosend':
                        $cabinetId = $session['cabinetId'] ?? null;
                        $messageIdOriginal = $session['messageId'] ?? null;
                        if($cabinetId && $messageId)
                            $welcomeBot->handleCollectStarRangeAutosend($chatId, $text, $cabinetId, $messageIdOriginal, $messageId);
                        break;
                    case 'collect_star_range_confirm':
                        $cabinetId = $session['cabinetId'] ?? null;
                        $messageIdOriginal = $session['messageId'] ?? null;
                        if($cabinetId && $messageId)
                            $welcomeBot->handleCollectStarRangeConfirm($chatId, $text, $cabinetId, $messageIdOriginal, $messageId);
                        break;
                    default:
                        Log::warning('Unknown action in session', ['action' => $session['action']]);
                        $bot->sendMessage($chatId, 'Неизвестное действие. Пожалуйста, начните заново.');
                        break;
                }
            } else {
                Log::warning('No action found in session', ['session' => $session]);
            }
        } else {
            Log::info('No active session found for chatId', [
                'chatId' => $chatId,
                'text' => $text
            ]);

            $bot->sendMessage($chatId, '😕 <i>Команда не найдена, введите /start</i>', 'HTML');
        }
    }

    protected function handlePayment($chatId, $data)
    {
        switch ($data) {
            case 'pay_100_tokens':
                $this->sendInvoice($chatId, '100 токенов', 'Покупка 100 токенов', '100_tokens', 39000);
                break;
            case 'pay_500_tokens':
                $this->sendInvoice($chatId, '500 токенов', 'Покупка 500 токенов', '500_tokens', 149000);
                break;
            case 'pay_1000_tokens':
                $this->sendInvoice($chatId, '1000 токенов', 'Покупка 1000 токенов', '1000_tokens', 229000);
                break;
            case 'pay_5000_tokens':
                $this->sendInvoice($chatId, '5000 токенов', 'Покупка 5000 токенов', '5000_tokens', 849000);
                break;
            case 'pay_10000_tokens':
                $this->sendInvoice($chatId, '10000 токенов', 'Покупка 10000 токенов', '10000_tokens', 1299000);
                break;
        }
    }

    protected function sendInvoice($chatId, $title, $description, $payload, $price)
    {
        $bot = new Client(config('telegram.bot_token'));
        $bot->sendInvoice(
            $chatId,
            $title,
            $description,
            $payload,
            config('telegram.payment_provider_token'),
            'start_parameter',  // This should be a unique start parameter for the invoice
            'RUB',
            [['label' => $title, 'amount' => $price]],
            [
                'photo_url' => 'https://your-image-url.com/image.jpg', // Optional
                'photo_size' => 600, // Optional
                'photo_width' => 600, // Optional
                'photo_height' => 400, // Optional
                'need_name' => true, // Optional
                'need_phone_number' => true, // Optional
                'need_email' => true, // Optional
                'need_shipping_address' => false, // Optional
                'is_flexible' => false // Optional
            ]
        );
    }

    protected function setApiKey($chatId, $apiKey, $service, Client $bot, $messageId)
    {
        $user = Auth::user();

        $cabinetName = $this->checkApiKey($apiKey, $chatId, $bot) ?? $user->id;
        // Step 1: Create or find a cabinet
        // $cabinetName = 'Кабинет '.$user->name; // You can set this dynamically based on user input or other criteria
        $cabinet = $user->cabinets()->firstOrCreate(
            ['name' => $cabinetName], // Find or create a cabinet with the given name
            ['settings' => json_encode([])] // Default settings can be an empty array or any other default settings
        );

        // Step 2: Update or create the API key bound to both user and cabinet
        $cabinet->apiKeys()->updateOrCreate(
            ['service' => $service, 'user_id' => $user->id],
            ['api_key' => $apiKey]
        );

        // Step 3: Send a confirmation message to the user
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
        ]);
        $message = "Ваш API-ключ для службы {$service} сохранен в кабинете '{$cabinet->name}'. Теперь вы можете использовать команды Wildberries Bot. 🚀";
        $bot->sendMessage($chatId, $message, null, false, null, $keyboard);
        //Удалить ключ из сообщения для безопасности
        DeleteTelegramMessage::dispatch($chatId, $messageId, config('telegram.bot_token'));
        // Step 4: Clear the session cache after setting the key
        $this->clearSession($chatId);
    }

    protected function checkApiKey($apiKey, $chatId, Client $bot)
    {
        try {
            // Assuming $user is the currently authenticated user
            $user = Auth::user();
            $cabinetName = $this->useWildberries($apiKey, $user)->checkFeedbackKey();
            return $cabinetName;
        } catch (\Exception $e) {
            // Send an error message to the user via the bot
            $message = "Ошибка при проверке API-ключа: " . $e->getMessage();
            $keyboard = new InlineKeyboardMarkup([
                [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
            ]);
            $bot->sendMessage($chatId, $message, null, false, null, $keyboard);

            // Optionally, clear the session cache if needed
            $this->clearSession($chatId);

            return; // Stop further execution if there's an error
        }
    }

    protected function clearSession($chatId){
        Cache::forget("session_{$chatId}");
    }

    protected function handleOtherCallbackQueries($chatId, $data, $messageId)
    {

        return response()->json(['status' => 'success'], 200);
    }


    //legacy delete later
    protected function processCallbackData($chatId, $text, Client $bot, $callbackQuery)
    {

    }


    protected function getUpdateDetails($update)
    {
        return [
            'update_id' => $update->getUpdateId(),
            'message' => $update->getMessage() ? $this->getMessageDetails($update->getMessage()) : null,
            'callback_query' => $update->getCallbackQuery() ? $this->getCallbackQueryDetails($update->getCallbackQuery()) : null,
            'edited_message' => $update->getEditedMessage() ? $this->getMessageDetails($update->getEditedMessage()) : null,
        ];
    }

    protected function getMessageDetails($message)
    {
        return [
            'message_id' => $message->getMessageId(),
            'from' => $message->getFrom() ? $this->getUserDetails($message->getFrom()) : null,
            'chat' => $message->getChat() ? $this->getChatDetails($message->getChat()) : null,
            'date' => $message->getDate(),
            'text' => $message->getText(),
            'photo' => $message->getPhoto(),
            'entities' => $message->getEntities(),
            // Add other relevant fields as needed
        ];
    }

    protected function getUserDetails($user)
    {
        return [
            'id' => $user->getId(),
            'is_bot' => $user->isBot(),
            'first_name' => $user->getFirstName(),
            'last_name' => $user->getLastName(),
            'username' => $user->getUsername(),
            'language_code' => $user->getLanguageCode(),
        ];
    }

    protected function getChatDetails($chat)
    {
        return [
            'id' => $chat->getId(),
            'type' => $chat->getType(),
            'title' => $chat->getTitle(),
            'username' => $chat->getUsername(),
            'first_name' => $chat->getFirstName(),
            'last_name' => $chat->getLastName(),
        ];
    }

    protected function getCallbackQueryDetails($callbackQuery)
    {
        return [
            'id' => $callbackQuery->getId(),
            'from' => $callbackQuery->getFrom() ? $this->getUserDetails($callbackQuery->getFrom()) : null,
            'message' => $callbackQuery->getMessage() ? $this->getMessageDetails($callbackQuery->getMessage()) : null,
            'inline_message_id' => $callbackQuery->getInlineMessageId(),
            'chat_instance' => $callbackQuery->getChatInstance(),
            'data' => $callbackQuery->getData(),
            'game_short_name' => $callbackQuery->getGameShortName(),
        ];
    }

    protected function logObjectProperties($title, $object)
    {
        if (is_object($object)) {
            $reflection = new \ReflectionClass($object);
            $properties = $reflection->getProperties();
            $propertyValues = [];

            foreach ($properties as $property) {
                $property->setAccessible(true);
                $propertyValues[$property->getName()] = $property->getValue($object);
            }

            Log::info($title, $propertyValues);
        } else {
            Log::info($title, ['object' => $object]);
        }
    }

    protected function processGetFeedback($chatId)
    {
        $this->notify($chatId, 'Получаем данные с Wildberries 🍓');
        $this->fetchAndSendQuestions('single', $chatId);
    }

    protected function notify($telegramId, $message)
    {
        $bot = new Client(config('telegram.bot_token'));
        $bot->sendMessage($telegramId, $message);
    }

    public function fetchAndSendQuestions($mode, $telegramId)
    {

        Artisan::call('fetch:send-questions', [
            'mode' => $mode,
            'telegram_id' => $telegramId
        ]);

        Log::info(['message' => 'Command executed successfully']);
    }
}
