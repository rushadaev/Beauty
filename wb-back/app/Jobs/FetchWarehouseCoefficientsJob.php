<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Traits\UsesWildberriesSupplies;
use App\Models\WarehouseCoefficient;
use App\Models\Notification;
use Carbon\Carbon;

class FetchWarehouseCoefficientsJob implements ShouldQueue
{
    use Queueable;
    use UsesWildberriesSupplies;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $apiKey = config('wildberries.supplies_api_key');
        $warehouseIds = Notification::where('status', 'started')->get()->pluck('settings')->pluck('warehouseId')->implode(',') ?? null;
        $coefficients = $this->useWildberriesSupplies($apiKey)->getAcceptanceCoefficients($warehouseIds);

        if (!isset($coefficients['data']) || !is_array($coefficients['data'])) {
            // Log an error or handle the situation as needed
            Log::error('Invalid coefficients data received', ['coefficients' => $coefficients]);
            return;
        }
        
        // Delete records that have dates before today
        WarehouseCoefficient::where('date', '<', now()->format('Y-m-d'))->delete();
        
        // Save them to the database
        foreach ($coefficients['data'] as $coefficient) {
            // Convert the API response date to a compatible format
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
}
