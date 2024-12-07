<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->integer('network_id')->nullable()->after('yclients_id');
            $table->string('network_name')->nullable()->after('network_id');
            
            // Создаем индекс для быстрого поиска по сети
            $table->index('network_id');
        });
    }

    public function down()
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['network_id', 'network_name']);
        });
    }
};