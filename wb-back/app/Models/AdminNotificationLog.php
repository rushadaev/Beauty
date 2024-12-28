<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminNotificationLog extends Model
{
    protected $fillable = [
        'notification_id',
        'sent_at',
        'status',
        'error_message'
    ];

    protected $casts = [
        'sent_at' => 'datetime'
    ];

    public function notification(): BelongsTo
    {
        return $this->belongsTo(AdminNotification::class, 'notification_id');
    }

    // Scope для успешных отправок
    public function scopeDelivered($query)
    {
        return $query->where('status', 'delivered');
    }

    // Scope для ошибок
    public function scopeFailed($query)
    {
        return $query->where('status', 'error');
    }
}