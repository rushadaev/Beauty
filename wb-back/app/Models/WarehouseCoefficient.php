<?php

namespace App\Models;

use Backpack\CRUD\app\Models\Traits\CrudTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarehouseCoefficient extends Model
{
    use CrudTrait;
    use HasFactory;

    // The table associated with the model (optional if it follows the naming convention)
    protected $table = 'warehouse_coefficients';

    // The attributes that are mass assignable
    protected $fillable = [
        'warehouse_id',
        'warehouse_name',
        'box_type_id',
        'box_type_name',
        'coefficient',
        'date',
    ];

    // If you need to customize the date format or any other attributes, you can do that here.
    // For example, if 'date' is not automatically treated as a Carbon instance, you can specify it:
    protected $casts = [
        'date' => 'datetime',
    ];
}