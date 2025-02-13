<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use App\Models\APIKey;
use App\Policies\APIKeyPolicy;
use App\Services\SalaryExportService;
use App\Services\YclientsService; // правильное имя

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SalaryExportService::class, function ($app) {
            return new SalaryExportService($app->make(YClientsService::class));
        });

        $this->app->singleton(YclientsService::class, function ($app) {
            return new YclientsService(config('services.yclients.partner_token'));
        });
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