<?php

return [
    'bot_token' => env('TELEGRAM_BOT_TOKEN', 'your-telegram-bot-token'),
    'bot_token_supplies' => env('TELEGRAM_BOT_TOKEN_SUPPLIES', 'your-telegram-bot-token'),

    'bot_token_supplies_new' => env('TELEGRAM_BOT_TOKEN_SUPPLIES_NEW', 'your-telegram-bot-token'),
    'default_user_id' => '782919745',
    'payment_provider_token' => env('PAYMENT_PROVIDER_TOKEN', 'token'),
    'payment_provider_token_supplies' => env('PAYMENT_PROVIDER_TOKEN_SUPPLIES', 'token'),
    'bot_token_notification' => env('TELEGRAM_BOT_TOKEN_NOTIFICATION', 'your-telegram-bot-token'),
    'notification_group' => env('TELEGRAM_NOTIFICATION_GROUP', 'your-telegram-bot-token'),
    'bot_token_test' => env('TELEGRAM_BOT_TOKEN_TEST', 'your-telegram-bot-token'),
    'channel_test' => env('TELEGRAM_TEST_CHANNEL', 'your-telegram-bot-token'),
];
