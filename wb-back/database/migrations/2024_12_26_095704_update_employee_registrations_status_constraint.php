<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class UpdateEmployeeRegistrationsStatusConstraint extends Migration
{
    public function up()
    {
        // Сначала удаляем существующий constraint
        DB::statement("ALTER TABLE employee_registrations DROP CONSTRAINT IF EXISTS employee_registrations_status_check");
        
        // Создаем новый constraint с обновленным списком статусов
        DB::statement("ALTER TABLE employee_registrations ADD CONSTRAINT employee_registrations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'documents_uploaded', 'invite_sent', 'completed'))");
    }

    public function down()
    {
        // В случае отката возвращаем предыдущий constraint
        DB::statement("ALTER TABLE employee_registrations DROP CONSTRAINT IF EXISTS employee_registrations_status_check");
        DB::statement("ALTER TABLE employee_registrations ADD CONSTRAINT employee_registrations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'documents_uploaded', 'completed'))");
    }
}