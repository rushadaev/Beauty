<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use App\Models\Cabinet;
use Carbon\Carbon;
use App\Models\Feedback;
use App\Services\TelegramService;
use App\Jobs\SendTelegramMessage;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class SendFeedbacksToTelegramJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $cabinetId;

    /**
     * Create a new job instance.
     */
    public function __construct($cabinetId)
    {
        $this->cabinetId = $cabinetId;
    }

    /**
     * Execute the job.
     */
    public function handle(TelegramService $telegramService): void
    {
        $cabinet = Cabinet::find($this->cabinetId);
        if (!$cabinet) {
            Log::error('Cabinet not found: ' . $this->cabinetId);
            return;
        }
    
        $settings = $cabinet->settings ?? [];  // Default to an empty array if settings are null
        $groupId = $settings['group_chat_id'] ?? null;  // Default to null if not set
    
        if (!$groupId) {
            Log::error('Group chat ID not set for cabinet: ' . $this->cabinetId);
            return;
        }
    
        $feedbacks = Feedback::where('cabinet_id', $cabinet->id)
                     ->where('status', 'not_sent')
                     ->inRandomOrder()
                     ->take(1)
                     ->get();

        $botEnabled = $settings['enabled'] ?? false;
        if(!$botEnabled){
            Log::info('Bot is disabled: ' . $this->cabinetId);
            return; 
        } 

        foreach ($feedbacks as $feedback) {
            // Safely extract and handle autosend settings
            $autosendEnabled = $settings['autosend']['enabled'] ?? false;
            $autosendStarRange = explode('-', $settings['autosend']['star_range'] ?? '0-0');
            $confirmEnabled = $settings['confirm_before_sending']['enabled'] ?? false;
            $confirmStarRange = explode('-', $settings['confirm_before_sending']['star_range'] ?? '0-0');
    
            $productValuation = $feedback->productValuation;
    
            // Check confirm_before_sending settings
            if ($confirmEnabled) {
                $sendIfNoTextConfirm = $settings['confirm_before_sending']['send_if_no_text'] ?? false;
                $sendIfWithTextConfirm = $settings['confirm_before_sending']['send_if_with_text'] ?? false;
                
                if ($productValuation >= (int)$confirmStarRange[0] && $productValuation <= (int)$confirmStarRange[1]) {
                    if ($sendIfNoTextConfirm && empty($feedback->text)) {
                        $this->sendToGroup($feedback, $groupId);
                        continue;
                    } elseif ($sendIfWithTextConfirm && !empty($feedback->text)) {
                        $this->sendToGroup($feedback, $groupId);
                        continue;
                    } else{
                        $this->sendToGroup($feedback, $groupId);
                        continue; 
                    }
                }
            }
    
            // Check autosend settings
            if ($autosendEnabled) {
                if ($productValuation >= (int)$autosendStarRange[0] && $productValuation <= (int)$autosendStarRange[1]) {
                    $sendIfNoText = $settings['autosend']['send_if_no_text'] ?? false;
                    $sendIfWithText = $settings['autosend']['send_if_with_text'] ?? false;
    
                    if ($sendIfNoText && empty($feedback->text)) {
                        $this->sendToWildberries($feedback, $groupId);
                    } elseif ($sendIfWithText && !empty($feedback->text)) {
                        $this->sendToWildberries($feedback, $groupId);
                    } else{
                       $this->sendToWildberries($feedback, $groupId); 
                    }
                    continue;
                }
            }
    
            // Default action: send to group for manual confirmation if no other rule matches
            $this->sendToGroup($feedback, $groupId);
        }
    }

    protected function sendToWildberries($feedback, $groupId)
    {
        // Mock logic for sending feedback to Wildberries
        Log::info("Sending feedback to Wildberries: " . $feedback->id);

        // Update feedback status to 'sent'
        // $feedback->status = 'sent';
        SendTelegramMessage::dispatch($groupId, "Ответ на вопрос {$feedback->id} был отправлен в WB автоматически", 'HTML', null);
        $feedback->save();
    }

    protected function sendToGroup($question, $groupId)
    {
        //$generatedResponse = $this->generateGptResponse($question['text'].'Товар:'.$question['productDetails']['productName']);
        $questionKeyboard = new InlineKeyboardMarkup([
            [['text' => '🔄 Другой', 'callback_data' => "change_answer"], ['text' => '✅Отправить', 'callback_data' => "accept_answer"]],
            [['text' => '💩Удалить вопрос', 'callback_data' => "delete_question"]],
        ]);
        $message = $this->formatMessage($question, 'Not Available Using Russian Server');
        SendTelegramMessage::dispatch($groupId, $message, 'HTML', $questionKeyboard); 
    }

    protected function formatMessage($question, $generatedResponse)
    {
        $createdDate = Carbon::parse($question['createdDate'])->locale('ru')->isoFormat('LLL');
        $supplierName = str_replace('Индивидуальный предприниматель', 'ИП', $question['productDetails']['supplierName']);
        $supplierName = htmlspecialchars($supplierName);
        $userName = $question['userName']; 
        $productName = htmlspecialchars($question['productDetails']['productName']);
        $article = htmlspecialchars($question['productDetails']['imtId']);
        $questionText = htmlspecialchars($question['text']);
        $generatedResponseText = $generatedResponse;

        return "rid_$question->id\n\n<b>Дата:</b> $createdDate\n$supplierName\n<b>Артикул:</b> $article\n<b>📦 Товар:</b> $productName\n\n<b>💬 {$userName}:\n</b>$questionText\n<b>⭐ Оценка:</b> $question->productValuation\n\n<b>🤖 #Предлагаемый_ответ:</b> <code>$generatedResponseText</code>";
    }
}
