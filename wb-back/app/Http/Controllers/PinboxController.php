<?php

namespace App\Http\Controllers;

use App\Services\YclientsService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PinboxController extends Controller
{
    private YClientsService $yclientsService;
    private const COMPANY_ID = 490462; // ID филиала "Спортивная"
    private const BRANCH_IDS = '63744,63745,63746'; // ID в Pinbox

    // Категории для Pinbox
    private const CATEGORIES = [
        'WOMAN' => 'Женский шугаринг',
        'MAN' => 'Мужской шугаринг',
        'ADDITIONAL' => 'Дополнительные услуги'
    ];

    // Маппинг категорий
    private const CATEGORY_MAPPING = [
        'Классический шугаринг Cherry Town  женский' => self::CATEGORIES['WOMAN'],
        'Чёрный шунгитовый шугаринг Monochrome женский' => self::CATEGORIES['WOMAN'],
        'Лечебный spa-шугаринг Botanix  женский' => self::CATEGORIES['WOMAN'],
        'Полимерный воск  italwax женский' => self::CATEGORIES['WOMAN'],
        'Классический шугаринг Cherry Town мужской' => self::CATEGORIES['MAN'],
        'Чёрный шунгитовый шугаринг Monochrome мужской' => self::CATEGORIES['MAN'],
        'Лечебный spa-шугаринг Botanix  мужской' => self::CATEGORIES['MAN'],
        'Комбинированная депиляция  сахар +воск мужской' => self::CATEGORIES['MAN'],
        'Полимерный воск  italwax мужской' => self::CATEGORIES['MAN'],
        'Карамельная липосакция Renie' => self::CATEGORIES['ADDITIONAL']
    ];

    public function __construct(YClientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
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

            // Авторизация
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

            // Получаем все категории и услуги
            $formattedServices = $this->getFormattedServices($authResult['token']);

            // Создаем Excel файл
            
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Задаем заголовки
        $headers = [
            'A' => 'Наименование товара',
            'B' => 'Тип цены',
            'C' => 'Цена товара',
            'D' => 'Валюта',
            'E' => 'Категория',
            'F' => 'Описание',
            'G' => 'Номера филиалов',
            'H' => 'URL фото'
        ];

        // Записываем заголовки
        foreach ($headers as $column => $header) {
            $sheet->setCellValue($column . '1', $header);
        }

        // Заполняем данными
        $row = 2;
foreach ($formattedServices as $service) {
    $finalName = str_replace(' - ', ' — ', $service['name']);

    $sheet->setCellValue('A' . $row, $finalName);       // Наименование
    $sheet->setCellValue('B' . $row, $service['price_type']);
    $sheet->setCellValue('C' . $row, $service['price']);
    $sheet->setCellValue('D' . $row, 0); // Рубли
    $sheet->setCellValue('E' . $row, $service['category']);

    // Описание делаем пустым:
    $sheet->setCellValue('F' . $row, '');

    $sheet->setCellValue('G' . $row, self::BRANCH_IDS);
    $sheet->setCellValue('H' . $row, 'https://pinbox.ru/assets/images/cabinet/dfprice.img.png');
    $row++;
}

        // Форматирование
        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getStyle('A1:H1')->getFont()->setBold(true);

        // Создаем файл
        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'pinbox_template');
        $writer->save($tempFile);

        return response()->download(
            $tempFile,
            'pinbox_services.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        )->deleteFileAfterSend(true);

    } catch (\Exception $e) {
        Log::error('Error generating Pinbox template:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Не удалось сгенерировать шаблон: ' . $e->getMessage()
        ], 500);
    }
}

     /**
     * Получает услуги YClients и приводит их к формату для выгрузки в Pinbox.
     */
    private function getFormattedServices(string $userToken): array
    {
        // Устанавливаем токен для последующих запросов
        $this->yclientsService->setUserToken($userToken);

        $formattedServices = [];

        // Получаем категории
        $categories = $this->yclientsService->getServiceCategories(self::COMPANY_ID);
        if (!$categories) {
            throw new \Exception('Не удалось получить категории услуг');
        }

        // Перебираем категории, которые присутствуют в CATEGORY_MAPPING
        foreach ($categories as $category) {
            if (!isset(self::CATEGORY_MAPPING[$category['title']])) {
                continue;
            }

            // Получаем услуги по ID категории
            $services = $this->yclientsService->getServices(
                self::COMPANY_ID,
                $category['id']
            );

            if (!$services) {
                continue;
            }

            foreach ($services as $service) {
                // Формируем название с учётом правил (включая удаление "мужской"/"женский")
                $formattedTitle = $this->formatServiceTitle($service['title'], $category['title']);

                // Добавляем в общий список
                $formattedServices[] = [
                    'name'       => $formattedTitle,
                    'price_type' => $service['price_min'] ? 'фикс' : 'от',
                    'price'      => $service['price_min'],
                    'category'   => self::CATEGORY_MAPPING[$category['title']]
                ];
            }
        }

        return $formattedServices;
    }

 /**
     * Форматирует название услуги (убирает "мужской"/"женский" из serviceTitle
     * и добавляет нужные префиксы/суффиксы в зависимости от категории).
     */
    private function formatServiceTitle(string $serviceTitle, string $categoryTitle): string
    {
        //
        // 1) Предварительная очистка serviceTitle
        //
        // Убираем «мужской», «женский» (в любом регистре),
        // а также «муж.» (например, "муж." / "МУЖ."), и т.п.
        $serviceTitle = preg_replace('/\s*(мужской|женский)\s*/iu', ' ', $serviceTitle);
        $serviceTitle = str_ireplace('муж.', '', $serviceTitle);
    
        // Если у вас когда-то добавлялась подстановка вида "шугаринг мужской",
        // можно убрать её отдельно:
        $serviceTitle = str_ireplace('шугаринг мужской', 'шугаринг', $serviceTitle);
        $serviceTitle = str_ireplace('шугаринг женский', 'шугаринг', $serviceTitle);
    
        // Чистим двойные пробелы и обрезаем по краям
        $serviceTitle = preg_replace('/\s+/', ' ', $serviceTitle);
        $serviceTitle = trim($serviceTitle);
    
        //
        // 2) Предварительная очистка categoryTitle
        //
        $categoryTitle = preg_replace('/\s*(мужской|женский)\s*/iu', ' ', $categoryTitle);
        $categoryTitle = str_ireplace('муж.', '', $categoryTitle);
    
        // Если в categoryTitle тоже могли вставляться «шугаринг мужской»
        $categoryTitle = str_ireplace('шугаринг мужской', 'шугаринг', $categoryTitle);
        $categoryTitle = str_ireplace('шугаринг женский', 'шугаринг', $categoryTitle);
    
        // Убираем "Cherry Town" (если нужно)
        $categoryTitle = str_ireplace('Cherry Town', '', $categoryTitle);
    
        // Чистим двойные пробелы
        $categoryTitle = preg_replace('/\s+/', ' ', $categoryTitle);
        $categoryTitle = trim($categoryTitle);
    
        //
        // 3) Спец-обработка категорий (italwax, Botanix, Monochrome, Карамельная липосакция).
        //    Здесь мы уже НЕ подставляем «мужской» / «женский», чтобы не возвращались эти слова.
        //
    
        // italwax
        if (stripos($categoryTitle, 'italwax') !== false) {
            // Если в названии услуги нет "italwax", добавим "Italwax" в конце
            if (stripos($serviceTitle, 'italwax') === false) {
                return "Полимерный воск italwax шугаринг — {$serviceTitle} Italwax";
            }
            return "Полимерный воск italwax шугаринг — {$serviceTitle}";
        }
    
        // Botanix
        if (
            stripos($serviceTitle, 'Botanix-SPA') !== false
            || stripos($categoryTitle, 'Botanix') !== false
        ) {
            // Если уже есть "Botanix-SPA" в названии услуги
            if (stripos($serviceTitle, 'Botanix-SPA') !== false) {
                return "Лечебный spa-шугаринг — {$serviceTitle}";
            }
            return "Лечебный spa-шугаринг — {$serviceTitle} (Botanix-SPA)";
        }
    
        // Monochrome
        if (stripos($categoryTitle, 'Monochrome') !== false) {
            if (stripos($serviceTitle, 'monochrome') === false) {
                return "Чёрный шунгитовый шугаринг — {$serviceTitle} Monochrome";
            }
            return "Чёрный шунгитовый шугаринг — {$serviceTitle}";
        }
    
        // Карамельная липосакция
        if (stripos($categoryTitle, 'Карамельная липосакция') !== false) {
            return "Карамельная липосакция Renie — {$serviceTitle}";
        }
    
        //
        // 4) Базовый случай, если не попали под спец-блоки
        //
        // Если после чистки в $categoryTitle что-то осталось,
        // соединяем через длинное тире.
        if ($categoryTitle !== '') {
            return "{$categoryTitle} — {$serviceTitle}";
        } else {
            return $serviceTitle;
        }
    }
    

}
