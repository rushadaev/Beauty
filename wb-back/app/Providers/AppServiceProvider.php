<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use App\Models\APIKey;
use App\Policies\APIKeyPolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        
        // Register the policy manually
        Gate::policy(APIKey::class, APIKeyPolicy::class);

        // Define the custom gate
        Gate::define('accessService', [APIKeyPolicy::class, 'accessService']);
    }
}
