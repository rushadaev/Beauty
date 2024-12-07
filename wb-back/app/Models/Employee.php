<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes; // Так как в таблице есть deleted_at

    protected $fillable = [
        'telegram_id',
        'full_name',
        'short_name',
        'birth_date',
        'phone',
        'email',
        'password',
        'branch_id',
        'position',
        'is_active',
        'yclients_id',
        'description',
        'avatar',
        'schedule',
        'services',
        'passport_series_number',
        'passport_issued_by',
        'passport_issue_date',
        'passport_division_code',
        'registration_address',
        'inn',
        'account_number',
        'bank_name',
        'bik',
        'correspondent_account',
        'bank_inn',
        'bank_kpp',
        'has_med_book',
        'med_book_expiry',
        'has_education_cert',
        'education_cert_photo',
        'is_self_employed',
        'contract_number',
        'contract_signed_at',
        'contract_expires_at',
        'work_address',
        'last_login_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'has_med_book' => 'boolean',
        'has_education_cert' => 'boolean',
        'is_self_employed' => 'boolean',
        'birth_date' => 'date',
        'passport_issue_date' => 'date',
        'med_book_expiry' => 'date',
        'contract_signed_at' => 'datetime',
        'contract_expires_at' => 'datetime',
        'last_login_at' => 'datetime',
        'schedule' => 'array',
        'services' => 'array',
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    // Если есть связь с филиалом
    

    // Область видимости для активных сотрудников
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}