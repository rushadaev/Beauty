<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Traits\UsesWildberriesSupplies;
use Illuminate\Support\Facades\Log;
use App\Traits\UsesTelegram;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;
use App\Models\WarehouseCoefficient;
use App\Jobs\SendTelegramMessage;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\Notification;
use Carbon\Carbon;

class CheckCoefficientChanges implements ShouldQueue
{
    use Queueable, Dispatchable, UsesTelegram, UsesWildberriesSupplies;
    public $timeout = 300;

    protected $botToken;

    /**
     * Create a new job instance.
     */
    public function __construct(string $botToken)
    {
        $this->botToken = $botToken;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Define the number of iterations within the minute (15 for every 4 seconds)
        $iterations = 15;
        $intervalSeconds = 4;

        // Define the API keys
        $apiKeys = [
            config('wildberries.supplies_api_key'),
            config('wildberries.supplies_api_key_2'),
            config('wildberries.supplies_api_key_3')
        ];

        // Start a loop to handle tasks every four seconds
        for ($i = 0; $i < $iterations; $i++) {
            // Step 1: Fetch all active notifications
            $notifications = Notification::where('status', 'started')->get();

            // Step 2: Collect all warehouse IDs from active notifications
            $warehouseIds = $notifications->pluck('settings')
                ->pluck('warehouseId')
                ->filter()
                ->unique()
                ->implode(',');

            // Step 3: Fetch and store coefficients in bulk for all active notifications
            if ($warehouseIds) {
                // Rotate through API keys using the iteration index
                $apiKeyIndex = $i % count($apiKeys);
                $apiKey = $apiKeys[$apiKeyIndex];

                $this->fetchAndStoreCoefficients($apiKey, $warehouseIds);
            }

            // Step 4: Iterate over each notification to check for changes
            foreach ($notifications as $notification) {
                $this->checkCoefficientChanges($notification);
            }

            // Log the execution for debugging
            Log::info('Warehouse coefficient check completed at ' . now());

            // Sleep for 4 seconds before the next iteration
            sleep($intervalSeconds);
        }
    }


    /**
     * Fetches the acceptance coefficients and stores them in the database.
     *
     * @param string $apiKey
     * @param string|null $warehouseIds
     * @return void
     */
    protected function fetchAndStoreCoefficients(string $apiKey, ?string $warehouseIds): void
    {
        $coefficients = $this->useWildberriesSupplies($apiKey)->getAcceptanceCoefficients($warehouseIds);

        if (!isset($coefficients['data']) || !is_array($coefficients['data'])) {
            Log::error('Invalid coefficients data received', ['coefficients' => $coefficients]);
            return;
        }

        WarehouseCoefficient::where('date', '<', now()->format('Y-m-d'))->delete();

        foreach ($coefficients['data'] as $coefficient) {
            $convertedDate = Carbon::parse($coefficient['date'])->format('Y-m-d H:i:s');

            WarehouseCoefficient::updateOrCreate(
                [
                    'warehouse_id' => $coefficient['warehouseID'],
                    'box_type_id' => $coefficient['boxTypeID'] ?? null,
                    'date' => $convertedDate,
                ],
                [
                    'warehouse_name' => $coefficient['warehouseName'],
                    'box_type_name' => $coefficient['boxTypeName'],
                    'coefficient' => $coefficient['coefficient'],
                ]
            );
        }
    }

    /**
     * Checks for coefficient changes for a specific notification.
     *
     * @param \App\Models\Notification $notification
     * @return void
     */
    protected function checkCoefficientChanges(Notification $notification): void
    {
        $settings = $notification->settings;
        $user = User::where('telegram_id', $settings['chatId'])->first();

        if (!$user) {
            Log::error('User not found for chat ID: ' . $settings['chatId']);
            return;
        }

        $trackedCoefficient = $settings['coefficient'];
        $coefficients = WarehouseCoefficient::where('warehouse_id', $settings['warehouseId'])
            ->where('box_type_id', $settings['boxTypeId'])
            ->where('date', '<=', Carbon::parse($settings['checkUntilDate']))
            ->get();

        // Check if the search time has expired
        $checkUntilDate = Carbon::parse($settings['checkUntilDate']);
        $status = $notification->status;
        if (Carbon::now()->greaterThan($checkUntilDate) && $status == 'started') {
            // Send notification for expired search
            $warehouseId = $settings['warehouseId'];
            $warehouses = config('warehouses.list');
            $warehouseName = $warehouses[$warehouseId] ?? "Склад {$warehouseId}";

            $message = "🕒 В выбранном промежутке тайм-слотов по вашему запросу не найдено 😔 но вы можете поставить новый поиск 👌\n\n";
            $message .= "🏭 Склад: {$warehouseName}\n";
            $message .= "⏰ Время: " . ($settings['checkUntilDate'] ?? 'Не указано') . "\n";
            $message .= "💰 Коэффициент: " . ($settings['coefficient'] == '0' ? 'Бесплатная' : $settings['coefficient']) . "\n";
            $message .= "📋 Статус: тайм-слот не найден\n";

            $keyboard = new InlineKeyboardMarkup([
                [['text' => '🔎 Найти тайм-слот', 'callback_data' => 'wh_notification']],
                [['text' => '🏠 На главную', 'callback_data' => 'wh_main_menu']]
            ]);

            // $telegram = $this->useTelegram();
            // $telegram->setBotToken($this->botToken);


            // $telegram->sendMessage($user->telegram_id, $message, 'HTML', false, null, $keyboard);

            SendTelegramMessage::dispatch($user->telegram_id, $message, 'HTML', $keyboard, $this->botToken);

            // Update the notification status to expired
            $notification->status = 'expired';
            $notification->save();

            return;
        }

        foreach ($coefficients as $coefficient) {
            $coefficientDate = Carbon::parse($coefficient->date);
            $checkUntilDate = Carbon::parse($settings['checkUntilDate']);

            if ($coefficientDate->lessThan($checkUntilDate)) {
                $cacheKey = 'notification_' . $notification->id . '_coefficient_' . $coefficientDate->toDateString();
                $lastCoefficientValue = Cache::get($cacheKey);

                if ($trackedCoefficient !== null && $coefficient->coefficient > -1 && $coefficient->coefficient <= $trackedCoefficient) {
                    if ($lastCoefficientValue === null || $lastCoefficientValue != $coefficient->coefficient) {
                        $date = Carbon::parse($coefficient->date)->locale('ru')->isoFormat('D MMMM');
                        $warehouseName = $coefficient->warehouse_name;
                        $boxTypeName = $coefficient->box_type_name;
                        $coeff = $coefficient->coefficient;

                        $message = "🔔 Найден тайм-слот\n
📅 Дата: {$date}\n🏭 Склад: {$warehouseName}\n📦 Короб: {$boxTypeName}\n💰 Стоимость приемки: x{$coeff}";
                        if ($settings['date'] == 'untilfound' || Carbon::now()->greaterThan($checkUntilDate)) {
                            $notification->status = 'finished';
                            $notification->save();
                        }
                        $this->notifyUser($user->telegram_id, $message);
                        Cache::put($cacheKey, $coefficient->coefficient, $checkUntilDate);
                    }

                    if ($settings['date'] == 'untilfound' || Carbon::now()->greaterThan($checkUntilDate)) {
                        $notification->status = 'finished';
                        $notification->save();
                    }
                }
            } else {
                break;
            }
        }
    }

    protected function notifyUser($chatId, $message)
    {
        $keyboard = new InlineKeyboardMarkup([
            [['text' => '📦 Создать поставку', 'callback_data' => 'wh_add_supply']],
            [['text' => '← В главное меню', 'callback_data' => 'mainmenu']]
        ]);
        // $telegram = $this->useTelegram();
        // $telegram->setBotToken($this->botToken);
        // $telegram->sendMessage($chatId, $message, 'HTML', false, null, $keyboard);
        SendTelegramMessage::dispatch($chatId, $message, 'HTML', $keyboard, $this->botToken);
    }
}
