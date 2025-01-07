<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Log;

class SalaryExportService
{
    private YClientsService $yclientsService;

    public function __construct(YClientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
    }

    public function generatePayrollExcel(string $startDate, string $endDate)
{
    try {
        // Аутентификация администратора
        $adminLogin = config('services.yclients.admin_login');
        $adminPassword = config('services.yclients.admin_password');

        $authResult = $this->yclientsService->authenticateByCredentials(
            $adminLogin,
            $adminPassword
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            throw new \Exception('Ошибка авторизации администратора');
        }

        $this->yclientsService->setUserToken($authResult['token']);

        // Создаем Excel файл
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Заголовки
        $sheet->setCellValue('A1', 'Период выплаты');
        $sheet->setCellValue('B1', 'ФИО мастера');
        $sheet->setCellValue('C1', 'Филиал');
        $sheet->setCellValue('D1', 'Сумма за услуги');
        $sheet->setCellValue('E1', 'Сумма за товары');
        $sheet->setCellValue('F1', 'Итого к выплате');
        $sheet->setCellValue('G1', 'Номер счета');
        $sheet->setCellValue('H1', 'Банк');

        // Получаем компании с доп. параметрами
        $companies = $this->yclientsService->getCompanies([
            'my' => 1,
            'active' => 1, // Только активные
            'group_id' => 287780 // ID сети из конфига
        ]);

        if (!$companies) {
            throw new \Exception('Не удалось получить список компаний');
        }

        Log::info('Found companies:', ['count' => count($companies)]);
        $row = 2;

        // Для каждой компании получаем мастеров и их зарплаты
        foreach ($companies as $company) {
            Log::info('Processing company:', [
                'id' => $company['id'],
                'name' => $company['title']
            ]);

            $staff = $this->yclientsService->getStaff($company['id']);
            
            if (!$staff) {
                Log::warning('No staff found for company', ['company_id' => $company['id']]);
                continue;
            }

            foreach ($staff as $master) {
                try {
                    // Проверяем, что мастер активен
                    if (($master['fired'] ?? 0) == 1 || ($master['hidden'] ?? 0) == 1) {
                        Log::info('Skipping inactive master', [
                            'id' => $master['id'],
                            'name' => $master['name']
                        ]);
                        continue;
                    }

                    // Получаем данные по зарплате
                    $salaryData = $this->yclientsService->getMasterSalary(
                        $company['id'],
                        $master['id'],
                        $startDate,
                        $endDate
                    );

                    if (!$salaryData || !isset($salaryData['data'])) {
                        Log::warning('No salary data for master', [
                            'master_id' => $master['id'],
                            'name' => $master['name']
                        ]);
                        continue;
                    }

                    $data = $salaryData['data']['salary'];

                    $employee = \App\Models\Employee::where('yclients_id', $master['id'])
                    ->where('branch_id', $company['id'])
                    ->first();

                    // Записываем данные в Excel
                    $sheet->setCellValue('A' . $row, "{$startDate} - {$endDate}");
                    $sheet->setCellValue('B' . $row, $master['name']);
                    $sheet->setCellValue('C' . $row, $company['title']);
                    $sheet->setCellValue('D' . $row, $data['services_total'] ?? 0);
                    $sheet->setCellValue('E' . $row, $data['products_total'] ?? 0);
                    $sheet->setCellValue('F' . $row, $data['total'] ?? 0);
                    $sheet->setCellValue('G' . $row, $employee ? $employee->account_number : '');
                    $sheet->setCellValue('H' . $row, $employee ? $employee->bank_name : '');

                    $row++;

                    // Пауза между запросами
                    usleep(100000); // 100ms
                    
                } catch (\Exception $e) {
                    Log::error('Error processing master', [
                        'master_id' => $master['id'],
                        'name' => $master['name'],
                        'error' => $e->getMessage()
                    ]);
                    continue;
                }
            }
        }

        // Если нет данных
        if ($row === 2) {
            throw new \Exception('Нет данных за указанный период');
        }

        // Форматирование
        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Стили для заголовков
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E0E0'],
            ],
        ];
        $sheet->getStyle('A1:H1')->applyFromArray($headerStyle);

        // Форматирование денежных значений
        $sheet->getStyle('D2:F' . ($row-1))->getNumberFormat()
            ->setFormatCode('#,##0.00 ₽');

        // Создаем временный файл
        $writer = new Xlsx($spreadsheet);
        $filename = "salary_report_{$startDate}_{$endDate}.xlsx";
        $tempFile = tempnam(sys_get_temp_dir(), 'salary_report');
        $writer->save($tempFile);

        return [
            'success' => true,
            'file' => $tempFile,
            'filename' => $filename
        ];

    } catch (\Exception $e) {
        Log::error('Error generating salary excel:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'message' => 'Ошибка при формировании отчета: ' . $e->getMessage()
        ];
    }
}
}