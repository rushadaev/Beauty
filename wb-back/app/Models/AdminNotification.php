<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Log;

class AdminNotification extends Model
{
    protected $fillable = [
        'telegram_id',
        'name',
        'sum',
        'notification_datetime',
        'type',
        'frequency',
        'frequency_value',
        'is_active',
        'last_notification_sent_at'
    ];

    protected $casts = [
        'sum' => 'decimal:2',
        'notification_datetime' => 'datetime:Y-m-d H:i:s',
        'is_active' => 'boolean',
        'last_notification_sent_at' => 'datetime:Y-m-d H:i:s',
        'frequency_value' => 'integer'
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(AdminNotificationLog::class, 'notification_id');
    }

    // Scope для активных уведомлений
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope для уведомлений, которые пора отправлять
    public function scopeDue($query)
    {
        $currentTime = now();
        
        Log::info('Checking due notifications:', [
            'current_time' => $currentTime->toDateTimeString(),
            'timezone' => config('app.timezone')
        ]);
    
        return $query->where(function ($q) use ($currentTime) {
            $q->whereRaw("CAST(notification_datetime AS timestamp) <= ?", [$currentTime])
              ->where('is_active', true)
              ->where(function ($q) {
                  $q->where(function($q) {
                      $q->where('type', 'single')
                        ->whereNull('last_notification_sent_at');
                  })->orWhere(function($q) {
                      $q->where('type', 'recurring')
                        ->where(function($q) {
                          $q->whereNull('last_notification_sent_at')
                            ->orWhere('last_notification_sent_at', '<=', now()->subDay());
                      });
                  });
              });
        });
    }

    // Получить дату следующего уведомления на основе частоты
    public function getNextNotificationDate()
    {
        if (!$this->last_notification_sent_at) {
            return now();
        }

        return match($this->frequency) {
            'daily' => $this->last_notification_sent_at->addDay(),
            'weekly' => $this->last_notification_sent_at->addWeek(),
            'monthly' => $this->last_notification_sent_at->addMonth(),
            'custom' => $this->last_notification_sent_at->addDays($this->frequency_value ?? 1),
            default => now()
        };
    }

    public function shouldSendNow(): bool
{
    $should = $this->is_active && 
              $this->notification_datetime <= now()->utc() &&
              ($this->type === 'single' || $this->isReadyForRecurring());
              
    Log::info('Checking if notification should be sent:', [
        'notification_id' => $this->id,
        'should_send' => $should,
        'is_active' => $this->is_active,
        'notification_time' => $this->notification_datetime,
        'current_time' => now()->utc(),
        'type' => $this->type,
        'last_sent' => $this->last_notification_sent_at
    ]);
    
    return $should;
}

private function isReadyForRecurring(): bool
{
    if (!$this->last_notification_sent_at) {
        return true;
    }
    
    return $this->last_notification_sent_at <= $this->getNextNotificationDate();
}
}