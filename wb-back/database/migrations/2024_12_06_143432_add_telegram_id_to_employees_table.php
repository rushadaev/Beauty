<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->bigInteger('telegram_id')->nullable()->after('id');
            // Индекс для ускорения поиска
            $table->index('telegram_id');
        });
    }

    public function down()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex(['telegram_id']);
            $table->dropColumn('telegram_id');
        });
    }
};