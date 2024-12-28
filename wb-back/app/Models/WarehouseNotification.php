<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseNotification extends Model
{
    protected $fillable = [
        'telegram_id',
        'company_id',
        'product_id',
        'min_amount',
        'is_active',
        'last_notification_sent_at'
    ];

    protected $casts = [
        'min_amount' => 'integer',
        'is_active' => 'boolean',
        'last_notification_sent_at' => 'datetime'
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(NotificationLog::class, 'notification_id');
    }

    // Scope для активных уведомлений
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope для уведомлений, которые можно отправить (с учетом cooldown)
    public function scopeReadyToSend($query, int $cooldownHours = 24)
    {
        return $query->where(function ($q) use ($cooldownHours) {
            $q->whereNull('last_notification_sent_at')
                ->orWhere('last_notification_sent_at', '<=', 
                    now()->subHours($cooldownHours));
        });
    }
}