<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Cabinet;
use App\Models\Feedback;
use App\Traits\UsesWildberries;


class FetchFeedbacksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, UsesWildberries;

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
    public function handle(): void
    {
        $cabinet = Cabinet::find($this->cabinetId);
        $apiKey = $cabinet->getFeedbackApiKey();
        $user = $cabinet->user; 

        

        if (!$cabinet) {
            Log::error('Cabinet not found: ' . $this->cabinetId);
            return;
        }

        $feedbacks = $this->useWildberries($apiKey, $user)->getFeedbacks();
        if ($feedbacks['error']) {
            Log::error('Error fetching feedbacks: ' . $feedbacks['errorText']);
            return;
        }

        Log::info('info', ['test' => $feedbacks]);
        foreach ($feedbacks['data']['feedbacks'] as $feedback) {
            Feedback::updateOrCreate(
                ['feedback_id' => $feedback['id']],
                [
                    'cabinet_id' => $cabinet->id,
                    'text' => $feedback['text'],
                    'productValuation' => $feedback['productValuation'],
                    'createdDate' => $feedback['createdDate'],
                    'answer' => 'Автоответ от Chat GPT', // Assume this is coming from your GPT service
                    'status' => 'not_sent', // Default status
                    'productDetails' => $feedback['productDetails'],
                    'photoLinks' => $feedback['photoLinks'],
                    'wasViewed' => $feedback['wasViewed'],
                    'userName' => $feedback['userName'],
                    'color' => $feedback['color'],
                    'subjectId' => $feedback['subjectId'],
                    'subjectName' => $feedback['subjectName'],
                ]
            );
        }
    }
}