<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->timestamp('documents_uploaded_at')->nullable()->after('contract_expires_at');
        });
    }

    public function down()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn('documents_uploaded_at');
        });
    }
};