<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AdminTask extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'status',
        'type',
        'master_phone',
        'master_name',
        'additional_data',
        'deadline',
        'completed_at',
        'completed_by',
        'priority'
    ];

    protected $casts = [
        'additional_data' => 'array',
        'completed_at' => 'datetime',
        'deadline' => 'datetime',
        'priority' => 'integer'
    ];

    public function notifications(): HasMany
    {
        return $this->hasMany(TaskNotification::class, 'task_id');
    }

    // Статусы
    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';

    // Типы задач
    public const TYPE_SCHEDULE_UPDATE = 'schedule_update';
    public const TYPE_PHOTO_UPDATE = 'photo_update';
    public const TYPE_DESCRIPTION_UPDATE = 'description_update';
    public const TYPE_OTHER = 'other';

    // Метод для создания задачи для мастера
    public static function createForMaster(
        string $type,
        string $masterPhone,
        string $masterName,
        ?string $description = null,
        ?array $additionalData = null
    ): self {
        $titles = [
            self::TYPE_SCHEDULE_UPDATE => "Обновить расписание для мастера {$masterName}",
            self::TYPE_PHOTO_UPDATE => "Проверить новое фото мастера {$masterName}",
            self::TYPE_DESCRIPTION_UPDATE => "Проверить новое описание мастера {$masterName}",
        ];

        return self::create([
            'title' => $titles[$type] ?? "Задача для мастера {$masterName}",
            'description' => $description,
            'type' => $type,
            'master_phone' => $masterPhone,
            'master_name' => $masterName,
            'additional_data' => $additionalData,
            'status' => self::STATUS_PENDING
        ]);
    }

    // Метод для установки задачи как выполненной
    public function markAsCompleted(string $completedBy): bool
    {
        return $this->update([
            'status' => self::STATUS_COMPLETED,
            'completed_at' => now(),
            'completed_by' => $completedBy
        ]);
    }

    // Метод для установки задачи в процесс выполнения
    public function markAsInProgress(): bool
    {
        return $this->update([
            'status' => self::STATUS_IN_PROGRESS
        ]);
    }

    // Скоуп для получения активных задач
    public function scopeActive($query)
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_IN_PROGRESS]);
    }

    // Скоуп для получения задач с истекающим сроком
    public function scopeDue($query)
    {
        return $query->where('deadline', '<=', now()->addDay())
                    ->where('status', '!=', self::STATUS_COMPLETED);
    }
}