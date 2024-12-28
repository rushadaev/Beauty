<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('telegram_id')->index();
            $table->string('name');
            $table->decimal('sum', 10, 2)->nullable();
            $table->timestamp('notification_datetime');
            $table->enum('type', ['single', 'recurring'])->default('single');
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'custom'])->nullable();
            $table->integer('frequency_value')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_notification_sent_at')->nullable();
            $table->timestamps();

            // Составной индекс для оптимизации выборки
            $table->index(['telegram_id', 'is_active', 'notification_datetime']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
    }
};