<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Убираем старое ограничение и добавляем новое с расширенным списком статусов
        DB::statement("ALTER TABLE employee_registrations DROP CONSTRAINT employee_registrations_status_check;");
        DB::statement("ALTER TABLE employee_registrations ADD CONSTRAINT employee_registrations_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'documents_uploaded'));");
    }

    public function down()
    {
        // В случае отката возвращаем старое ограничение
        DB::statement("ALTER TABLE employee_registrations DROP CONSTRAINT employee_registrations_status_check;");
        DB::statement("ALTER TABLE employee_registrations ADD CONSTRAINT employee_registrations_status_check CHECK (status IN ('pending', 'approved', 'rejected'));");
    }
};