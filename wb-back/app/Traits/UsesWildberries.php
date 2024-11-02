<?php

namespace App\Traits;

use App\Services\WildberriesService;

trait UsesWildberries
{
    protected function useWildberries(string $apiKey, $user): WildberriesService
    {
        return new WildberriesService($apiKey, $user);
    }
}