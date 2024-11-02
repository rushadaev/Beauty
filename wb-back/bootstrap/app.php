<?php

use App\Http\Middleware\AuthenticateTelegramUser;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '/api/v1',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias(['telegram.auth' => AuthenticateTelegramUser::class]);
        $middleware->validateCsrfTokens(except: [
            '/webhook/telegram',
            '/webhook/telegram/feedback',
            '/webhook/telegram/supplies',
            '/webhook/telegram/supplies/new',
            '/webhook/payment/success',
            '/webhook/auth-completed',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
