<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class APIKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'service',
        'api_key',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Define the relationship with Cabinet
    public function cabinet()
    {
        return $this->belongsTo(Cabinet::class);
    }
}