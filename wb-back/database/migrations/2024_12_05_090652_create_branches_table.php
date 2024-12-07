<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address');
            $table->string('phone')->nullable();
            $table->integer('yclients_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('working_hours')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('yclients_id');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('branches');
    }
};