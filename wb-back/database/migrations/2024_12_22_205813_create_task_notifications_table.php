<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('task_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')
                  ->constrained('admin_tasks')
                  ->onDelete('cascade');
            $table->string('telegram_id');              // ID администратора в Telegram
            $table->boolean('is_read')->default(false); // Прочитано ли уведомление
            $table->boolean('is_sent')->default(false); // Было ли отправлено уведомление
            $table->timestamp('read_at')->nullable();   // Когда прочитано
            $table->timestamp('sent_at')->nullable();   // Когда отправлено
            $table->integer('send_attempts')->default(0); // Количество попыток отправки
            $table->text('error_log')->nullable();       // Лог ошибок при отправке
            $table->timestamp('next_retry_at')->nullable(); // Когда следующая попытка отправки
            $table->timestamps();
            $table->softDeletes(); // Мягкое удаление
            
            // Индексы для оптимизации запросов
            $table->index('telegram_id');
            $table->index('is_read');
            $table->index('is_sent');
            $table->index(['task_id', 'telegram_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('task_notifications');
    }
};