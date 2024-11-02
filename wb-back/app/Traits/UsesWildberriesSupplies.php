<?php

namespace App\Traits;

use App\Services\WildberriesSuppliesService;

trait UsesWildberriesSupplies
{
    protected function useWildberriesSupplies(string $apiKey): WildberriesSuppliesService
    {
        return new WildberriesSuppliesService($apiKey);
    }
}