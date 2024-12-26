<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->unsignedInteger('master_price')
                  ->after('is_self_employed')
                  ->nullable()
                  ->comment('Процент ставки мастера');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn('master_price');
        });
    }
};