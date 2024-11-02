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
use App\Models\User;

class TelegramControllerSupplies extends Controller
{
    public function handleWebhookSupplies(Request $request)
    {
        $user = Auth::user();

        $bot = new Client(config('telegram.bot_token_supplies'));
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

    public function handleWebhookSuppliesNew(Request $request)
    {
        $user = Auth::user();

        $bot = new Client(config('telegram.bot_token_supplies_new'));
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

    public function handleWebhookNodeAuthCompleted(Request $request)
    {
        $user = User::find($request->userId);
        $status = $request->status;
        $payload = $request->payload;
        $bot = new Client(config('telegram.bot_token_supplies_new'));
        $warehouseBot = new WarehouseBotController($bot);
        \Log::info('Auth completed', ['user' => $user, 'status' => $status, 'payload' => $payload]);

        $bot->sendMessage($user->telegram_id, "🔐 Аутентификация завершена. \nСтатус: {$status}");
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
            $bot->sendMessage($chatId, 'pong!');
        });

        $bot->command('auth', function ($message) use ($warehouseBot, $bot, $user){
            $chatId = $message->getChat()->getId();
            $text = $message->getText();
            $warehouseBot->startAuth($chatId);
        });

        $bot->command('drafts', function ($message) use ($warehouseBot, $user) {
            $chatId = $message->getChat()->getId();
            $warehouseBot->handleDrafts($chatId);
        });

        $bot->command('searches', function ($message) use ($warehouseBot, $user) {
            $chatId = $message->getChat()->getId();
            $warehouseBot->handleSearches($chatId);
        });

        $bot->command('start', function ($message) use ($warehouseBot, $user) {
            $chatId = $message->getChat()->getId();
            $warehouseBot->handleStart($chatId);
        });

        $bot->command('notification', function ($message) use ($warehouseBot, $user) {
            $chatId = $message->getChat()->getId();
            $warehouseBot->handleStart($chatId);
        });
    }

    protected function handleMessages(Client $bot, WarehouseBotController $warehouseBot, WelcomeBotController $welcomeBot, User $user)
    {
        $bot->on(function ($update) use ($bot, $warehouseBot, $user, $welcomeBot) {
            $message = $update->getMessage();
            $callbackQuery = $update->getCallbackQuery();
            $preCheckoutQuery = $update->getPreCheckoutQuery();
            $chatId = null;
            $text = null;
            $messageId = null;

            if ($message) {
                $chatId = $message->getChat()->getId();
                $text = $message->getText();
                // Process session if there is any action pending
                $this->processSession($chatId, $text, $bot, $update, $warehouseBot);

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
            } else {
                Log::error('Update does not contain a valid message or callback query', ['update' => $update]);
                return;
            }
            return true;
        }, function () {
            return true;
        });
    }

    protected function handleCallbackQuery($chatId, $data, $messageId, WarehouseBotController $warehouseBot, WelcomeBotController $welcomeBot, $user, $callbackQuery, $bot)
    {
        if (strpos($data, 'wh_') === 0) {
            $warehouseBot->handleInlineQuery($chatId, $data, $messageId);
            if (strpos($data, 'wh_start_notification_') === 0){
                $bot->answerCallbackQuery($callbackQuery->getId(), '👍🏻 Мы уже ищем тайм-слот для вашей поставки!', true);
            }
        } elseif (strpos($data, 'welcome_') === 0) {
            $welcomeBot->handleInlineQuery($chatId, $data, $messageId);
        } elseif (strpos($data, 'pay_') === 0) {
            $this->handlePayment($chatId, $data);
        } else {
            // Add handling for other types of callback queries here
            $this->handleOtherCallbackQueries($chatId, $data, $messageId);
        }

        //hideloader
        $bot->answerCallbackQuery($callbackQuery->getId(), '', null);

        return response()->json(['status' => 'success'], 200);
    }

    protected function processSession($chatId, $text, Client $bot, $update, WarehouseBotController $warehouseBot)
    {
        $session = Cache::get("session_{$chatId}");

        if ($session) {
            if (isset($session['action'])) {
                switch ($session['action']) {
                    case 'collect_wb_suppliers_api_key':
                        $this->setApiKey($chatId, $text, 'supplies', $bot);
                        break;
                    case 'collect_wb_feedback_api_key':
                        $this->setApiKey($chatId, $text, 'feedback', $bot);
                        break;
                    case 'collect_notification_expiration_date':
                        $warehouseBot->handleCustomDateInput($chatId, $text);
                        break;
                    case 'collect_phone_number':
                        $warehouseBot->handlePhoneNumber($chatId, $text);
                        break;
                    case 'collect_verification_code':
                        $warehouseBot->handleVerificationCode($chatId, $text);
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
            case 'pay_1_week':
                $this->sendInvoice($chatId, '1 неделя', 'Покупка 1 неделя', 'pay_1_week', 300);
                break;
            case 'pay_1_month':
                $this->sendInvoice($chatId, '1 месяц', 'Покупка 1 месяц', 'pay_1_month', 500);
                break;
            case 'pay_3_months':
                $this->sendInvoice($chatId, '3 месяца', 'Покупка 3 месяца', 'pay_3_months', 1000);
                break;
            case 'pay_6_months':
                $this->sendInvoice($chatId, '6 месяцев', 'Покупка 6 месяцев', 'pay_6_months', 4000);
                break;
            case 'pay_forever':
                $this->sendInvoice($chatId, 'навсегда', 'Покупка навсегда', 'pay_forever', 5000);
                break;
        }
    }

    protected function sendInvoice($chatId, $title, $description, $payload, $price)
    {
        $payment = new PaymentController();
        $bot = new Client(config('telegram.bot_token_supplies'));
        $orderId = $chatId.'_'.$payload;
        $url = $payment->createPaymentLink($price, $orderId, $chatId, $description, $payload);
        $message = '💸 '.$description;
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '💳 Оплатить', 'url' => $url]],
            [['text' => '🏠 На главную', 'callback_data' => 'wh_main_menu']]
        ]);
        $bot->sendMessage($chatId, $message, null, false, null, $keyboard);
        // $bot->sendInvoice(
        //     $chatId,
        //     $title,
        //     $description,
        //     $payload,
        //     config('telegram.payment_provider_token_supplies'),
        //     'start_parameter',  // This should be a unique start parameter for the invoice
        //     'RUB',
        //     [['label' => $title, 'amount' => $price]],
        //     [
        //         'photo_url' => 'https://your-image-url.com/image.jpg', // Optional
        //         'photo_size' => 600, // Optional
        //         'photo_width' => 600, // Optional
        //         'photo_height' => 400, // Optional
        //         'need_name' => true, // Optional
        //         'need_phone_number' => true, // Optional
        //         'need_email' => true, // Optional
        //         'need_shipping_address' => false, // Optional
        //         'is_flexible' => false // Optional
        //     ]
        // );
    }

    protected function setApiKey($chatId, $apiKey, $service, Client $bot)
    {
        $user = Auth::user();
        $user->apiKeys()->updateOrCreate(
            ['service' => $service],
            ['api_key' => $apiKey]
        );

        $keyboard = new InlineKeyboardMarkup([
            [['text' => '🏠 На главную', 'callback_data' => 'welcome_start']]
        ]);
        $message = "Ваш API-ключ для службы {$service} сохранен. Теперь вы можете использовать команды Wildberries Bot. 🚀";
        $bot->sendMessage($chatId, $message, null, false, null, $keyboard);
        $this->clearSession($chatId); // Clear the session cache after setting the key
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
        $bot = new Client(config('telegram.bot_token_supplies'));
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
