<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('short_name');
        });
    }

    public function down()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('short_name')->after('full_name');
        });
    }
};