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

    public function generatePayrollExcel()
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

            // Получаем данные по зарплате
            $salaryData = $this->yclientsService->getMasterSalary(
                490462, // ID компании
                1731160, // ID мастера
                '2024-12-13',
                '2024-12-28'
            );

            if (!$salaryData || !isset($salaryData['data'])) {
                throw new \Exception('Не удалось получить данные о зарплате');
            }

            // Заполняем данные
            $row = 2;
            $data = $salaryData['data'];
            
            $sheet->setCellValue('A' . $row, '13.12.2024 - 28.12.2024');
            $sheet->setCellValue('B' . $row, $data['master_info']['name'] ?? 'Неизвестно');
            $sheet->setCellValue('C' . $row, $data['master_info']['branch'] ?? 'Неизвестно');
            $sheet->setCellValue('D' . $row, $data['salary']['services_total']);
            $sheet->setCellValue('E' . $row, $data['salary']['products_total']);
            $sheet->setCellValue('F' . $row, $data['salary']['total']);
            $sheet->setCellValue('G' . $row, '40817810123456789012'); // Хардкод номера счета
            $sheet->setCellValue('H' . $row, 'Сбербанк'); // Хардкод банка

            // Форматирование
            foreach (range('A', 'H') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Стили для заголовков
            $headerStyle = [
                'font' => [
                    'bold' => true,
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => [
                        'rgb' => 'E0E0E0',
                    ],
                ],
            ];
            $sheet->getStyle('A1:H1')->applyFromArray($headerStyle);

            // Форматирование денежных значений
            $sheet->getStyle('D2:F' . $row)->getNumberFormat()
                ->setFormatCode('#,##0.00 ₽');

            // Создаем временный файл
            $writer = new Xlsx($spreadsheet);
            $filename = 'salary_report_' . date('Y-m-d') . '.xlsx';
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