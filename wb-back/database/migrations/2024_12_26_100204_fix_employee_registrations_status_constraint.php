<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class FixEmployeeRegistrationsStatusConstraint extends Migration
{
    public function up()
    {
        // Удаляем существующий constraint
        DB::statement("ALTER TABLE employee_registrations DROP CONSTRAINT IF EXISTS employee_registrations_status_check");
        
        // Добавляем новый constraint со всеми необходимыми статусами
        DB::statement("ALTER TABLE employee_registrations ADD CONSTRAINT employee_registrations_status_check CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'documents_uploaded'::character varying, 'invite_sent'::character varying, 'completed'::character varying]::text[]))");
    }

    public function down()
    {
        // В случае отката возвращаем базовый constraint
        DB::statement("ALTER TABLE employee_registrations DROP CONSTRAINT IF EXISTS employee_registrations_status_check");
        DB::statement("ALTER TABLE employee_registrations ADD CONSTRAINT employee_registrations_status_check CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'documents_uploaded'::character varying, 'completed'::character varying]::text[]))");
    }
}