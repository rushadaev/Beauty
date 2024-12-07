<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->date('birth_date');
            $table->string('passport_series_number');
            $table->text('passport_issued_by');
            $table->date('passport_issue_date');
            $table->string('passport_division_code');
            $table->text('registration_address');
            $table->string('inn', 12);
            $table->string('account_number', 20);
            $table->string('bank_name');
            $table->string('bik', 9);
            $table->string('correspondent_account', 20);
            $table->string('bank_inn', 10);
            $table->string('bank_kpp', 9);
            $table->string('phone', 12);
            $table->string('email');
            $table->boolean('has_med_book')->default(false);
            $table->date('med_book_expiry')->nullable();
            $table->boolean('has_education_cert')->default(false);
            $table->string('education_cert_photo')->nullable();
            $table->boolean('is_self_employed')->default(false);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_registrations');
    }
};