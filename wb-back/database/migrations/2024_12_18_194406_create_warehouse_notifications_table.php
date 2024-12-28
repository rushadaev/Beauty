<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_notifications', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('telegram_id')->index();
            $table->bigInteger('company_id')->index();
            $table->bigInteger('product_id')->index();
            $table->integer('min_amount');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_notification_sent_at')->nullable();
            $table->timestamps();

            // Составной индекс для оптимизации выборки
            $table->index(['company_id', 'product_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_notifications');
    }
};