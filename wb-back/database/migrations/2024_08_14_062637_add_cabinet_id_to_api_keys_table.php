<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCabinetIdToAPIKeysTable extends Migration
{
    public function up()
    {
        Schema::table('a_p_i_keys', function (Blueprint $table) {
            $table->foreignId('cabinet_id')->nullable()->constrained('cabinets')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('a_p_i_keys', function (Blueprint $table) {
            $table->dropForeign(['cabinet_id']);
            $table->dropColumn('cabinet_id');
        });
    }
}