<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSoftDeletesAndIndexesToEmployeesTable extends Migration
{
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            // Добавляем soft deletes
            $table->softDeletes();
            
            // Добавляем составной индекс
            $table->index(['yclients_id', 'branch_id'], 'employees_yclients_branch_index');
            
            // Добавляем индекс для поиска по статусу
            $table->index('is_active', 'employees_active_index');
        });
    }

    public function down()
    {
        Schema::table('employees', function (Blueprint $table) {
            // Удаляем в обратном порядке
            $table->dropIndex('employees_active_index');
            $table->dropIndex('employees_yclients_branch_index');
            $table->dropSoftDeletes();
        });
    }
}