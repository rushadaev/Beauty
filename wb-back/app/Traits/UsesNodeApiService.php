<?php

namespace App\Traits;

use App\Services\NodeApiService;

trait UsesNodeApiService
{
    protected function useNodeApi(): NodeApiService
    {
        return new NodeApiService();
    }
}
