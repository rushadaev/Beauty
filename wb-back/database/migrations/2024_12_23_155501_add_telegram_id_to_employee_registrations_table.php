<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddTelegramIdToEmployeeRegistrationsTable extends Migration
{
    public function up()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->string('telegram_id')->nullable()->after('phone');
        });
    }

    public function down()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn('telegram_id');
        });
    }
}