<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTasksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id(); // Primary key
            $table->unsignedBigInteger('user_id'); // ID пользователя
            $table->string('name'); // Название задачи
            $table->text('description')->nullable(); // Описание задачи
            $table->integer('task_number')->nullable(); // Номер задачи
            $table->string('responsible')->nullable(); // Ответственный
            $table->date('deadline')->nullable(); // Дедлайн
            $table->date('assigned_date')->nullable(); // Дата когда поставили задачу
            $table->string('status')->nullable(); // Статус
            $table->timestamps(); // Created and updated timestamps
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('tasks');
    }
}
