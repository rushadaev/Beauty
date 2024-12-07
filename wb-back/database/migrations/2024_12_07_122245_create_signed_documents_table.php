<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('signed_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_registration_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->string('path');
            $table->string('original_name');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('signed_documents');
    }
};