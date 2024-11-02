<?php
namespace App\Traits;

use App\Services\YooKassaService;

trait UsesYooKassa
{
    protected $yooKassaService;

    public function initializeYooKassa()
    {
        $this->yooKassaService = app(YooKassaService::class);
    }
}