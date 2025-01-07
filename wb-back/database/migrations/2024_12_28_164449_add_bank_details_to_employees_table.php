<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up()
   {
       Schema::table('employees', function (Blueprint $table) {
           $table->string('account_number')->nullable();
           $table->string('bank_name')->nullable();
       });
   }

   public function down()
   {
       Schema::table('employees', function (Blueprint $table) {
           $table->dropColumn(['account_number', 'bank_name']);
       });
   }
};