<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'nodejs' => [
        'base_url' => env('NODEJS_BASE_URL', 'http://nodejs-server:3000'),
    ],

    'yclients' => [
        'partner_token' => env('YCLIENTS_PARTNER_TOKEN', 'rpxh9hw6sjakpdsha6r3'),
        'user_token' => env('YCLIENTS_USER_TOKEN', 'eb4b7a6a59b300074be260e045ade57c'),
        'login' => env('YCLIENTS_LOGIN', null),
        'password' => env('YCLIENTS_PASSWORD', null),
        'admin_login' => env('YCLIENTS_ADMIN_LOGIN'),
        'admin_password' => env('YCLIENTS_ADMIN_PASSWORD'),
    ],
];
