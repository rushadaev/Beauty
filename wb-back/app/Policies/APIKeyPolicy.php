<?php

namespace App\Policies;

use App\Models\User;
use App\Models\APIKey;
use Illuminate\Support\Facades\Log;

class APIKeyPolicy
{
    public function accessService(User $user, $service)
    {
        $exists = $user->apiKeys()->where('service', $service)->exists();
        Log::info('Service Access', [
            'service' => $service,
            'exists' => $exists,
        ]);
        return $exists;
    }
}