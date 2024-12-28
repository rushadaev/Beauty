<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddYclientsStaffIdToEmployeeRegistrationsTable extends Migration
{
    public function up()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->unsignedBigInteger('yclients_staff_id')->nullable()->after('status');
        });
    }

    public function down()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn('yclients_staff_id');
        });
    }
}