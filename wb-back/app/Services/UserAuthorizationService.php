<?php

namespace App\Services;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Cache;
use App\Models\User;

class UserAuthorizationService
{
    public function isAllowFeedbackFunctions(User $user)
    {
        $message = "🍓 Подключите кабинет по токену (его может получить только владелец магазина).

1️⃣ Зайдите в Личный кабинет WB -> Настройки -> Доступ к API (ссылка https://seller.wildberries.ru/supplier-settings/access-to-api).

2️⃣ Нажмите кнопку [+ Создать новый токен] и введите любое имя токена (например WbAutoReplyBot).

3️⃣ Выберите тип \"Вопросы и отзывы\".

4️⃣ Нажмите [Создать токен] и отправте его в этот чат."
        if (!Gate::forUser($user)->allows('accessService', 'feedback')) {
            Cache::put("session_{$user->telegram_id}", ['action' => 'collect_wb_feedback_api_key'], 300); // Cache for 5 minutes
            NotificationService::notify($user->telegram_id, $message);
            return false;
        }
        return true;
    }
}