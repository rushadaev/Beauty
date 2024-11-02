<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAPIKeysTable extends Migration
{
    public function up()
    {
        Schema::create('a_p_i_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('service'); // Service name, e.g., 'supplies', 'feedbacks'
            $table->string('api_key', 1024);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('a_p_i_keys');
    }
}