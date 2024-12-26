<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeRegistration extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'full_name',
        'birth_date',
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
        'phone',
        'email',
        'has_med_book',
        'med_book_expiry',
        'has_education_cert',
        'education_cert_photo',
        'is_self_employed',
        'master_price',  // Добавляем это поле
        'status',
        'contract_signed_at',
        'contract_expires_at',
        'work_address',
        'contract_number',
        'short_name',
        'documents_uploaded_at'
    ];

    protected $casts = [
        'birth_date' => 'date',
        'passport_issue_date' => 'date',
        'med_book_expiry' => 'date',
        'contract_signed_at' => 'datetime',
        'contract_expires_at' => 'datetime',
        'documents_uploaded_at' => 'datetime',
        'has_med_book' => 'boolean',
        'has_education_cert' => 'boolean',
        'is_self_employed' => 'boolean',
    ];

    public function signedDocuments()
    {
        return $this->hasMany(SignedDocument::class);
    }

    public function setPassportIssuedByAttribute($value)
    {
        $this->attributes['passport_issued_by'] = mb_strtoupper($value, 'UTF-8');
    }

    public function setFullNameAttribute($value)
    {
        $this->attributes['full_name'] = $value;
        
        // Разбиваем ФИО на части
        $parts = explode(' ', trim($value));
        
        if (count($parts) >= 2) {
            $lastName = $parts[0];
            $firstInitial = mb_substr($parts[1], 0, 1, 'UTF-8');
            
            // Если есть отчество
            $middleInitial = '';
            if (isset($parts[2])) {
                $middleInitial = mb_substr($parts[2], 0, 1, 'UTF-8');
            }
            
            // Формируем сокращенное ФИО
            $this->attributes['short_name'] = $lastName . ' ' . $firstInitial . '.' . 
                ($middleInitial ? $middleInitial . '.' : '');
        } else {
            // Если передано неполное ФИО, сохраняем как есть
            $this->attributes['short_name'] = $value;
        }
    }
}