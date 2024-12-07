<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->decimal('coordinate_lat', 10, 6)->nullable();
            $table->decimal('coordinate_lon', 10, 6)->nullable();
            $table->text('description')->nullable();
            $table->string('email')->nullable();
            $table->string('city')->nullable();
            $table->string('timezone_name')->default('Europe/Moscow');
        });
    }

    public function down()
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'coordinate_lat',
                'coordinate_lon',
                'description',
                'email',
                'city',
                'timezone_name'
            ]);
        });
    }
};