<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fraud_checks', function (Blueprint $table) {
            $table->id();
            $table->string('client_phone', 15)->index();
            $table->timestamp('check_date');
            $table->string('anomaly_type', 50);
            $table->enum('severity', ['critical', 'suspicious'])->default('suspicious');
            $table->jsonb('records_affected');
            $table->jsonb('record_details')->nullable(); // Добавляем детали записей
            $table->enum('status', ['pending', 'resolved', 'ignored'])->default('pending');
            $table->unsignedBigInteger('resolved_by_user_id')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_comment')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Индексы
            $table->index(['client_phone', 'status']);
            $table->index('check_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fraud_checks');
    }
};