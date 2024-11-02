<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCabinetsTable extends Migration
{
    public function up()
    {
        Schema::create('cabinets', function (Blueprint $table) {
            $table->id(); // Primary key: Cabinet ID
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Link to the users table
            $table->string('name'); // Cabinet name
            $table->json('settings')->nullable(); // JSON column for settings
            $table->timestamps(); // Timestamps for created_at and updated_at
        });
    }

    public function down()
    {
        Schema::dropIfExists('cabinets');
    }
}