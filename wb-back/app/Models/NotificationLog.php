<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    protected $fillable = [
        'notification_id',
        'current_amount',
        'sent_at',
        'status',
        'error_message'
    ];

    protected $casts = [
        'current_amount' => 'decimal:2',
        'sent_at' => 'datetime'
    ];

    public function notification()
    {
        return $this->belongsTo(WarehouseNotification::class, 'notification_id');
    }
}