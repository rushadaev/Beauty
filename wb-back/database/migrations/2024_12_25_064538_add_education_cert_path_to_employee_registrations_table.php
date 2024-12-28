<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->string('education_cert_path')->nullable()->after('education_cert_photo');
        });
    }

    public function down()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn('education_cert_path');
        });
    }
};