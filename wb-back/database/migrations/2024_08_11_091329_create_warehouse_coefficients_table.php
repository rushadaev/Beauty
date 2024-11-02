<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('warehouse_coefficients', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('warehouse_id');
            $table->string('warehouse_name');
            $table->unsignedBigInteger('box_type_id')->nullable(); // Allow null values
            $table->string('box_type_name');
            $table->integer('coefficient');
            $table->dateTime('date');
            $table->timestamps();
        
            // Indexes for faster querying
            $table->index('warehouse_id');
            $table->index('box_type_id');
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warehouse_coefficients');
    }
};
