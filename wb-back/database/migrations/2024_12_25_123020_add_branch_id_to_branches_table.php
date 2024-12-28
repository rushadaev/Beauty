<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBranchIdToBranchesTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('branches', function (Blueprint $table) {
        $table->string('branch_id')->nullable()->after('id');
    });
}

public function down()
{
    Schema::table('branches', function (Blueprint $table) {
        $table->dropColumn('branch_id');
    });
}
};
