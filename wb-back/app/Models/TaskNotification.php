<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TaskNotification extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'task_id',
        'telegram_id',
        'is_read',
        'is_sent',
        'read_at',
        'sent_at',
        'send_attempts',
        'error_log',
        'next_retry_at'
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'is_sent' => 'boolean',
        'read_at' => 'datetime',
        'sent_at' => 'datetime',
        'next_retry_at' => 'datetime',
        'send_attempts' => 'integer'
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(AdminTask::class, 'task_id');
    }

    // Метод для отметки уведомления как прочитанного
    public function markAsRead(): bool
    {
        return $this->update([
            'is_read' => true,
            'read_at' => now()
        ]);
    }

    // Метод для отметки уведомления как отправленного
    public function markAsSent(): bool
    {
        return $this->update([
            'is_sent' => true,
            'sent_at' => now(),
            'send_attempts' => $this->send_attempts + 1
        ]);
    }

    // Метод для логирования ошибки отправки
    public function logError(string $error): bool
    {
        return $this->update([
            'error_log' => $error,
            'send_attempts' => $this->send_attempts + 1,
            'next_retry_at' => $this->calculateNextRetryTime()
        ]);
    }

    // Вспомогательный метод для расчета времени следующей попытки
    private function calculateNextRetryTime(): ?\DateTime
    {
        // Экспоненциальное увеличение времени между попытками
        $minutes = min(pow(2, $this->send_attempts), 1440); // Максимум 24 часа
        return now()->addMinutes($minutes);
    }

    // Скоуп для получения неотправленных уведомлений
    public function scopeUnsent($query)
    {
        return $query->where('is_sent', false)
                    ->where(function($q) {
                        $q->whereNull('next_retry_at')
                          ->orWhere('next_retry_at', '<=', now());
                    });
    }

    // Скоуп для получения непрочитанных уведомлений
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }
}