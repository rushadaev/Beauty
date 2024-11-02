<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\User;

class WildberriesService
{
    protected $apiUrl = 'https://feedbacks-api.wildberries.ru/api/v1';
    protected $apiKey;

    public function __construct(string $apiKey, User $user)
    {
        $this->apiKey = $apiKey;
        $this->user = $user;
    }

    public function getQuestions($isAnswered = false, $take = 10000, $skip = 0, $order = 'dateDesc', $nmId = null, $dateFrom = null, $dateTo = null)
    {
        $query = [
            'isAnswered' => $isAnswered,
            'take' => $take,
            'skip' => $skip,
            'order' => $order,
        ];

        if ($nmId) {
            $query['nmId'] = $nmId;
        }

        if ($dateFrom) {
            $query['dateFrom'] = $dateFrom;
        }

        if ($dateTo) {
            $query['dateTo'] = $dateTo;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->apiKey,
            ])->get($this->apiUrl . '/questions', $query);

            if ($response->successful()) {
                return [
                    'data' => $response->json()['data'],
                    'error' => false,
                    'errorText' => '',
                ];
            } elseif ($response->status() == 401) {
                $this->handleInvalidApiKey();
                return [
                    'data' => null,
                    'error' => true,
                    'errorText' => 'Invalid API key provided. Please enter a new one.',
                ];
            } else {
                Log::error('Wildberries API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'data' => null,
                    'error' => true,
                    'errorText' => 'API request failed',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Wildberries API exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'data' => null,
                'error' => true,
                'errorText' => 'An error occurred while making the API request',
            ];
        }
    }

    public function getFeedbacks($isAnswered = false, $take = 10, $skip = 0, $order = 'dateDesc', $nmId = null, $dateFrom = null, $dateTo = null)
    {
        $query = [
            'isAnswered' => $isAnswered,
            'take' => $take,
            'skip' => $skip,
            'order' => $order,
        ];

        if ($nmId) {
            $query['nmId'] = $nmId;
        }

        if ($dateFrom) {
            $query['dateFrom'] = $dateFrom;
        }

        if ($dateTo) {
            $query['dateTo'] = $dateTo;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->apiKey,
            ])->get($this->apiUrl . '/feedbacks', $query); // Assuming the API endpoint for feedbacks is different

            if ($response->successful()) {
                return [
                    'data' => $response->json()['data'],
                    'error' => false,
                    'errorText' => '',
                ];
            } elseif ($response->status() == 401) {
                $this->handleInvalidApiKey();
                return [
                    'data' => null,
                    'error' => true,
                    'errorText' => 'Invalid API key provided. Please enter a new one.',
                ];
            } else {
                Log::error('Wildberries API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'data' => null,
                    'error' => true,
                    'errorText' => 'API request failed',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Wildberries API exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'data' => null,
                'error' => true,
                'errorText' => 'An error occurred while making the API request',
            ];
        }
    }

    public function checkFeedbackKey()
    {
        // Call the getFeedbacks method to retrieve feedbacks
        $response = $this->getFeedbacks(true, 1);

        // Check if the API request was successful and no errors occurred
        if (!$response['error']) {
            $feedbacks = $response['data']['feedbacks'] ?? [];

            // If feedbacks exist, find and return the supplierName
            if (!empty($feedbacks)) {
                $firstFeedback = $feedbacks[0];
                $supplierName = str_replace('Индивидуальный предприниматель', 'ИП', $firstFeedback['productDetails']['supplierName']);
                return $supplierName;
            }

            // If no feedbacks are found, return true
            return true;
        }

        // If there was an error with the API request, throw an exception
        throw new \Exception($response['errorText']);
    }

    protected function handleInvalidApiKey()
    {
        // Remove the invalid API key from the user
        $this->user->apiKeys()->where('service', 'supplies')->delete();

        // Notify the user to provide a new API key
        Cache::put("session_{$this->user->telegram_id}", ['action' => 'collect_wb_feedback_api_key'], 300); // Cache for 5 minutes
        TelegramNotificationService::notify($this->user->telegram_id, '🗝️ Ошибка авторизации. Пожалуйста, предоставьте <b>корректный</b> API-ключ WB "Отзывы:"');
    }
}