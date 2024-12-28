<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('admin_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');                 // Заголовок задачи
            $table->text('description')->nullable(); // Описание задачи
            $table->enum('status', [
                'pending',      // Ожидает выполнения
                'in_progress', // В процессе
                'completed'    // Выполнена
            ])->default('pending');
            $table->enum('type', [
                'schedule_update',    // Обновление расписания
                'photo_update',       // Обновление фото
                'description_update', // Обновление описания
                'other'              // Другое
            ])->default('other');
            $table->string('master_phone')->nullable();  // Телефон мастера
            $table->string('master_name')->nullable();   // Имя мастера
            $table->json('additional_data')->nullable(); // Дополнительные данные в JSON
            $table->timestamp('deadline')->nullable();   // Крайний срок выполнения
            $table->timestamp('completed_at')->nullable(); // Когда задача была выполнена
            $table->string('completed_by')->nullable();    // Кто выполнил задачу (telegram_id)
            $table->integer('priority')->default(0);       // Приоритет задачи
            $table->timestamps();
            $table->softDeletes(); // Мягкое удаление
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_tasks');
    }
};