<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')
                ->constrained('warehouse_notifications')
                ->onDelete('cascade');
            $table->decimal('current_amount', 10, 2);
            $table->timestamp('sent_at');
            $table->string('status', 20); // delivered/error
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['notification_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};