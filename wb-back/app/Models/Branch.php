<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'yclients_id',
        'name',
        'address',
        'phone',
        'working_hours',
        'is_active',
        'coordinate_lat',
        'coordinate_lon',
        'description',
        'email',
        'city',
        'timezone_name',
        'branch_id'  // добавляем новое поле
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'coordinate_lat' => 'float',
        'coordinate_lon' => 'float',
        'working_hours' => 'array'
    ];

    /**
     * Получить активные филиалы
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Получить филиалы по городу
     */
    public function scopeInCity($query, string $city)
    {
        return $query->where('city', $city);
    }

    
}