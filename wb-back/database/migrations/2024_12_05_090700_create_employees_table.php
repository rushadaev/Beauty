<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            
            // Personal Information
            $table->string('full_name');
            $table->string('short_name');
            $table->date('birth_date');
            $table->string('phone')->unique();
            $table->string('email')->unique();
            $table->string('password');
            
            // Position and Status
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->string('position');
            $table->boolean('is_active')->default(true);
            $table->integer('yclients_id')->nullable();
            
            // Profile
            $table->text('description')->nullable();
            $table->string('avatar')->nullable();
            $table->json('schedule')->nullable();
            $table->json('services')->nullable();
            
            // Passport Data
            $table->string('passport_series_number');
            $table->string('passport_issued_by');
            $table->date('passport_issue_date');
            $table->string('passport_division_code');
            $table->string('registration_address');
            
            // Banking Details
            $table->string('inn', 12);
            $table->string('account_number');
            $table->string('bank_name');
            $table->string('bik');
            $table->string('correspondent_account');
            $table->string('bank_inn');
            $table->string('bank_kpp');
            
            // Medical Book and Education
            $table->boolean('has_med_book')->default(false);
            $table->date('med_book_expiry')->nullable();
            $table->boolean('has_education_cert')->default(false);
            $table->string('education_cert_photo')->nullable();
            
            // Self Employment and Contract
            $table->boolean('is_self_employed')->default(false);
            $table->string('contract_number')->nullable();
            $table->timestamp('contract_signed_at')->nullable();
            $table->timestamp('contract_expires_at')->nullable();
            $table->string('work_address')->nullable();
            
            // System Fields
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('phone');
            $table->index('email');
            $table->index('branch_id');
            $table->index('yclients_id');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('employees');
    }
};