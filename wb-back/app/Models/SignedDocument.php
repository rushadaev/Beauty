<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SignedDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_registration_id',
        'path',
        'original_name'
    ];

    public function employeeRegistration()
    {
        return $this->belongsTo(EmployeeRegistration::class);
    }
}