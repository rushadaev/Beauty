<?php

namespace App\Http\Controllers;

use App\Services\SalaryExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalaryExportController extends Controller
{
    private SalaryExportService $exportService;

    public function __construct(SalaryExportService $exportService)
    {
        $this->exportService = $exportService;
    }

    public function exportPayroll()
    {
        try {
            $result = $this->exportService->generatePayrollExcel();

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 500);
            }

            return response()->download(
                $result['file'],
                $result['filename'],
                [
                    'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ]
            )->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            Log::error('Error in salary export:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Ошибка при экспорте данных: ' . $e->getMessage()
            ], 500);
        }
    }
}