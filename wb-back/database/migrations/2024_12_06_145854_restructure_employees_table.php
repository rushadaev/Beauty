<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Сначала удалим старую таблицу
        Schema::dropIfExists('employees');

        // Создаем новую с минимально необходимыми полями
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('yclients_id');
            $table->unsignedBigInteger('branch_id');
            $table->string('full_name');
            $table->string('position')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('avatar')->nullable();
            $table->timestamps();

            // Индексы
            $table->unique(['yclients_id', 'branch_id']);
            $table->index('branch_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('employees');
    }
};