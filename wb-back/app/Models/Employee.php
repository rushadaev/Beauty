<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'yclients_id',
        'branch_id',
        'full_name',
        'position',
        'is_active',
        'avatar',
        'telegram_id',
        'has_med_book',
        'med_book_expiry'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'has_med_book' => 'boolean',
        'med_book_expiry' => 'date'
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Можно добавить связь с branch если нужно
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'yclients_id');
    }
}