<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\WarehouseCoefficient;

class WildberriesSuppliesService
{
    protected $apiUrl = 'https://supplies-api.wildberries.ru/api/v1';
    protected $apiKey;

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
    }

    public function getWarehouses()
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => $this->apiKey,
            ])->get("{$this->apiUrl}/warehouses");

            if ($response->successful()) {
                return [
                    'data' => $response->json(),
                    'error' => false,
                    'errorText' => '',
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

    public function getAcceptanceCoefficients($warehouseIDs = null)
    {
        $query = [];

        if ($warehouseIDs) {
            $query['warehouseIDs'] = $warehouseIDs;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->apiKey,
            ])->get("{$this->apiUrl}/acceptance/coefficients", $query);

            if ($response->successful()) {
                return [
                    'data' => $response->json(),
                    'error' => false,
                    'errorText' => '',
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

    public function getStoredAcceptanceCoefficients($warehouseId = null)
    {
        try {
            // Fetch coefficients from the database
            $query = WarehouseCoefficient::query();

            if ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            }

            $coefficients = $query->orderBy('date', 'desc')->get();

            if ($coefficients->isEmpty()) {
                return [
                    'data' => null,
                    'error' => true,
                    'errorText' => 'No coefficients found for the specified warehouse '.$warehouseId,
                ];
            }

            // Log::info('Success fetching stored coefficients', [
            //     'message' => 'Got it!',
            // ]);
            // Ensure the keys match the expected structure
            $coefficientsArray = $coefficients->map(function($item) {
                return [
                    'date' => $item->date,
                    'coefficient' => $item->coefficient,
                    'warehouseID' => $item->warehouse_id,
                    'warehouseName' => $item->warehouse_name ?? 'Unknown',
                    'boxTypeName' => $item->box_type_name ?? 'Unknown',
                    'boxTypeID' => $item->box_type_id ?? null,
                ];
            })->toArray();

            return [
                'data' => $coefficientsArray,
                'error' => false,
                'errorText' => '',
            ];
        } catch (\Exception $e) {
            Log::error('Error fetching stored coefficients', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'data' => null,
                'error' => true,
                'errorText' => 'An error occurred while fetching coefficients',
            ];
        }
    }
}