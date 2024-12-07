<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('type');  // тип синхронизации (branches, services, etc)
            $table->string('status'); // success/error
            $table->integer('synced_count');
            $table->integer('error_count');
            $table->json('details')->nullable();
            $table->float('duration');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('sync_logs');
    }
};