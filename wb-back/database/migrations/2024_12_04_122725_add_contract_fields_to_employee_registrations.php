<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->date('contract_signed_at')->nullable();
            $table->date('contract_expires_at')->nullable();
            $table->text('work_address')->nullable();
        });
    }

    public function down()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn([
                'contract_signed_at',
                'contract_expires_at',
                'work_address'
            ]);
        });
    }
};