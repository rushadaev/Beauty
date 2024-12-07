<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    protected $fillable = [
        'type',
        'status',
        'synced_count',
        'error_count',
        'details',
        'duration'
    ];

    protected $casts = [
        'details' => 'array',
        'duration' => 'float'
    ];

    public static function logBranchSync(array $result, float $duration): self
    {
        return self::create([
            'type' => 'branches',
            'status' => $result['success'] ? 'success' : 'error',
            'synced_count' => $result['synced'] ?? 0,
            'error_count' => $result['errors'] ?? 0,
            'details' => [
                'message' => $result['message'] ?? '',
                'debug_info' => $result['debug_info'] ?? []
            ],
            'duration' => $duration
        ]);
    }
}