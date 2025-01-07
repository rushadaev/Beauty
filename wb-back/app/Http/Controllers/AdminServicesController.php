<?php

namespace App\Http\Controllers;

use App\Services\YclientsService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;


class AdminServicesController extends Controller
{
    private YClientsService $yclientsService;

    public function __construct(YClientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
    }

    public function getCategories(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|string',
                'password' => 'required|string',
                'company_id' => 'required|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Авторизация администратора
            $authResult = $this->yclientsService->authenticateByCredentials(
                $request->input('phone'),
                $request->input('password')
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации'
                ], 401);
            }

            // Получение категорий услуг
            $categories = $this->yclientsService->getServiceCategories(
                $request->input('company_id'),
                $authResult['user_token']
            );

            return response()->json([
                'success' => true,
                'data' => $categories
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getCategories:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить категории: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getServices(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|string',
                'password' => 'required|string',
                'company_id' => 'required|integer',
                'category_id' => 'required|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Авторизация администратора
            $authResult = $this->yclientsService->authenticateByCredentials(
                $request->input('phone'),
                $request->input('password')
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации'
                ], 401);
            }

            // Получение услуг
            $services = $this->yclientsService->getServices(
                $request->input('company_id'),
                $request->input('category_id'),
                $authResult['user_token']
            );

            return response()->json([
                'success' => true,
                'data' => $services
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getServices:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить услуги: ' . $e->getMessage()
            ], 500);
        }
    }

    public function generateTemplate(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
            'password' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Авторизация администратора
        $authResult = $this->yclientsService->authenticateByCredentials(
            $request->input('phone'),
            $request->input('password')
        );

        if (!isset($authResult['success']) || !$authResult['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка авторизации'
            ], 401);
        }

        // Создаем Excel файл
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Заголовки
        $sheet->setCellValue('A1', 'Филиал');
        $sheet->setCellValue('C1', 'Категория');
        $sheet->setCellValue('E1', 'Услуга');
        $sheet->setCellValue('G1', 'Текущая цена');
        $sheet->setCellValue('H1', 'Новая цена');

        // Получаем компании и их услуги
        $companies = $this->yclientsService->getCompanies([]);
        
        if (empty($companies)) {
            throw new \Exception('Не удалось получить список компаний');
        }

        Log::info('Retrieved companies:', ['count' => count($companies)]);
        
        $row = 2;
        foreach ($companies as $company) {
            $categories = $this->yclientsService->getServiceCategories($company['id']);
            
            if (empty($categories)) {
                Log::warning("No categories found for company: {$company['id']}");
                continue;
            }

            Log::info('Retrieved categories for company:', [
                'company_id' => $company['id'],
                'categories_count' => count($categories)
            ]);
            
            foreach ($categories as $category) {
                $services = $this->yclientsService->getServices($company['id'], $category['id']);
                
                if (empty($services)) {
                    Log::warning("No services found for category: {$category['id']} in company: {$company['id']}");
                    continue;
                }

                Log::info('Retrieved services for category:', [
                    'company_id' => $company['id'],
                    'category_id' => $category['id'],
                    'services_count' => count($services)
                ]);
                
                foreach ($services as $service) {
                    // Видимые колонки
                    $sheet->setCellValue("A{$row}", $company['title']);
                    $sheet->setCellValue("C{$row}", $category['title']);
                    $sheet->setCellValue("E{$row}", $service['title']);
                    $sheet->setCellValue("G{$row}", $service['price_min']);
                    $sheet->setCellValue("H{$row}", '');
                    
                    // Служебные данные (скрытые)
                    $sheet->setCellValue("B{$row}", $company['id']);
                    $sheet->setCellValue("D{$row}", $category['id']);
                    $sheet->setCellValue("F{$row}", $service['id']);
                    
                    $row++;
                }
            }
        }

        if ($row === 2) {
            throw new \Exception('Нет данных для заполнения таблицы');
        }

        // Защита ячеек
        $sheet->getProtection()->setSheet(true);
        $sheet->getStyle('A:G')->getProtection()->setLocked(\PhpOffice\PhpSpreadsheet\Style\Protection::PROTECTION_PROTECTED);
        $sheet->getStyle('H')->getProtection()->setLocked(\PhpOffice\PhpSpreadsheet\Style\Protection::PROTECTION_UNPROTECTED);

        // Форматирование
        $sheet->getStyle('G:H')->getNumberFormat()->setFormatCode('#,##0.00₽');
        $sheet->getStyle('A1:H1')->getFont()->setBold(true);

        // Автоматическая ширина колонок
        foreach (['A', 'C', 'E', 'G', 'H'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Скрываем служебные колонки
        $sheet->getColumnDimension('B')->setVisible(false);
        $sheet->getColumnDimension('D')->setVisible(false);
        $sheet->getColumnDimension('F')->setVisible(false);

        // Создаем временный файл
        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'services_template');
        $writer->save($tempFile);

        return response()->download(
            $tempFile,
            'services_template.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        )->deleteFileAfterSend(true);

    } catch (\Exception $e) {
        Log::error('Error generating template:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Не удалось сгенерировать шаблон: ' . $e->getMessage()
        ], 500);
    }
}

    public function processUpdates(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|string',
                'password' => 'required|string',
                'file' => 'required|file|mimes:xlsx'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Авторизация администратора
            $authResult = $this->yclientsService->authenticateByCredentials(
                $request->input('phone'),
                $request->input('password')
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации'
                ], 401);
            }

            $file = $request->file('file');
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();

            $changes = [];
            $errors = [];

            foreach ($worksheet->getRowIterator(2) as $row) {
                $rowIndex = $row->getRowIndex();
                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);
                
                $rowData = [];
                foreach ($cellIterator as $cell) {
                    $rowData[] = $cell->getValue();
                }

                if (!empty($rowData[7])) { // Если есть новая цена
                    $changes[] = [
                        'branch_id' => $rowData[1],
                        'service_id' => $rowData[5],
                        'branch_name' => $rowData[0],
                        'service_name' => $rowData[4],
                        'old_price' => $rowData[6],
                        'new_price' => $rowData[7]
                    ];
                }
            }

            if (empty($changes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Не найдено изменений цен в файле'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'changes' => $changes,
                    'errors' => $errors
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error processing updates:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Не удалось обработать файл: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updatePrices(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|string',
                'password' => 'required|string',
                'updates' => 'required|array',
                'updates.*.branch_id' => 'required|integer',
                'updates.*.service_id' => 'required|integer',
                'updates.*.new_price' => 'required|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Авторизация администратора
            $authResult = $this->yclientsService->authenticateByCredentials(
                $request->input('phone'),
                $request->input('password')
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации'
                ], 401);
            }

            $updates = $request->input('updates');
            $results = [
                'success' => 0,
                'failed' => 0,
                'errors' => []
            ];

            foreach ($updates as $update) {
                try {
                    $result = $this->yclientsService->updateServicePrice(
                        $authResult['token'],         // string $userToken
                        (int)$update['branch_id'],    // int $companyId
                        (int)$update['service_id'],   // int $serviceId
                        (float)$update['new_price']   // float $price
                    );
                    

                    if ($result['success']) {
                        $results['success']++;
                    } else {
                        $results['failed']++;
                        $results['errors'][] = [
                            'branch_id' => $update['branch_id'],
                            'service_id' => $update['service_id'],
                            'error' => $result['message'] ?? 'Неизвестная ошибка'
                        ];
                    }
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'branch_id' => $update['branch_id'],
                        'service_id' => $update['service_id'],
                        'error' => $e->getMessage()
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating prices:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Не удалось обновить цены: ' . $e->getMessage()
            ], 500);
        }
    }
}