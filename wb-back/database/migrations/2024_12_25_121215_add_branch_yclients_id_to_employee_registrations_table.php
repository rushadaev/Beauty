<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBranchYclientsIdToEmployeeRegistrationsTable extends Migration
{
    public function up()
{
    Schema::table('employee_registrations', function (Blueprint $table) {
        $table->integer('branch_yclients_id')->nullable()->after('branch_id');
    });
}

public function down()
{
    Schema::table('employee_registrations', function (Blueprint $table) {
        $table->dropColumn('branch_yclients_id');
    });
}
}