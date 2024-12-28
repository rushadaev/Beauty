<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBranchFieldsToEmployeeRegistrationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->string('work_address')->nullable()->change(); // Делаем существующее поле nullable
            $table->string('branch_name')->nullable();
            $table->string('branch_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('employee_registrations', function (Blueprint $table) {
            $table->dropColumn(['branch_name', 'branch_id']);
            $table->string('work_address')->nullable(false)->change();
        });
    }
}