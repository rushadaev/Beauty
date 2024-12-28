<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EmployeeRegistration;
use App\Models\Branch;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use App\Services\YclientsService; // Правильный путь к сервису

class EmployeeRegistrationController extends Controller
{

    protected $telegramService;
    protected $yclientsService;

    public function __construct(TelegramService $telegramService, YclientsService $yclientsService)
{
    $this->telegramService = $telegramService;
    $this->yclientsService = $yclientsService;
    $this->telegramService->setBotToken(config('telegram.bot_token_master'));
}

    public function store(Request $request)
    {
        Log::info('Received employee registration request', $request->all());

        try {
            // Преобразуем даты в нужный формат перед валидацией
            $data = $request->all();
        
            if ($request->birth_date) {
                $data['birth_date'] = Carbon::parse($request->birth_date)->format('Y-m-d');
            }
            
            if ($request->passport_issue_date) {
                $data['passport_issue_date'] = Carbon::parse($request->passport_issue_date)->format('Y-m-d');
            }

            
            
            if ($request->med_book_expiry) {
                $data['med_book_expiry'] = Carbon::parse($request->med_book_expiry)->format('Y-m-d');
            }

            $validator = Validator::make($data, [
                'full_name' => 'required|string|max:255',
                'birth_date' => 'required|date',
                'passport_series_number' => 'required|string',
                'passport_issued_by' => 'required|string', 
                'passport_issue_date' => 'required|date',
                'passport_division_code' => 'required|string',
                'registration_address' => 'required|string',
                'inn' => 'required|string|size:12',
                'account_number' => 'required|string|size:20',
                'bank_name' => 'required|string',
                'bik' => 'required|string|size:9',
                'correspondent_account' => 'required|string|size:20',
                'bank_inn' => 'required|string|size:10',
                'bank_kpp' => 'required|string|size:9',
                'phone' => 'required|string',
                'email' => 'required|email|unique:employee_registrations,email',
                'has_med_book' => 'required|boolean',
                'med_book_expiry' => 'nullable|date',
                'has_education_cert' => 'required|boolean',
                'education_cert_photo' => 'nullable|string',
                'is_self_employed' => 'required|boolean',
                'master_price' => 'required|integer|min:1|max:50', // Добавляем валидацию ставки
                'work_address' => 'required|string|max:255',
                'branch_name' => 'required|string',
                'branch_id' => 'required|string',
                'telegram_id' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed', $validator->errors()->toArray());
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Генерируем номер договора
            $lastNumber = EmployeeRegistration::max('contract_number') ?? '777000';
            $numberPart = intval(substr($lastNumber, 3)) + 1;
            $contractNumber = '777' . str_pad($numberPart, 3, '0', STR_PAD_LEFT);

            // Добавляем дополнительные поля к данным
            $now = now();
            $data = array_merge($data, [
                'contract_number' => $contractNumber,
                
                'contract_signed_at' => $now,
                'contract_expires_at' => $now->copy()->addYear(),
                'status' => 'pending'
            ]);

            Log::info('Attempting to create registration with data:', $data);

            // short_name будет сгенерирован автоматически в модели
            $registration = EmployeeRegistration::create($data);

            if ($data['has_education_cert'] && !empty($data['education_cert_photo'])) {
                $this->saveEducationCertificate($registration, $data['education_cert_photo']);
            }
            
            // Перезагружаем модель чтобы получить все атрибуты
            $registration = $registration->fresh();
            
            // Безопасное логирование с проверкой на null
            $logData = [
                'id' => $registration->id,
                'contract_number' => $registration->contract_number,
                'short_name' => $registration->short_name,
            ];

            // Добавляем даты в лог только если они существуют
            if ($registration->contract_signed_at) {
                $logData['contract_dates']['signed'] = $registration->contract_signed_at->format('d.m.Y');
            }
            if ($registration->contract_expires_at) {
                $logData['contract_dates']['expires'] = $registration->contract_expires_at->format('d.m.Y');
            }

            Log::info('Employee registration created successfully', $logData);

            return response()->json([
                'message' => 'Registration successful',
                'data' => $registration
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to save registration', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
            
            return response()->json([
                'message' => 'Failed to save registration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPendingRegistrations()
{
    try {
        $registrations = EmployeeRegistration::whereIn('status', ['pending', 'documents_uploaded'])
            ->orderBy('created_at', 'desc')
            ->get(['id', 'full_name', 'short_name', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $registrations
        ]);
    } catch (\Exception $e) {
            Log::error('Failed to get pending registrations', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get pending registrations'
            ], 500);
        }
    }

    private function saveEducationCertificate($registration, $fileId) 
{
    try {
        // Получаем информацию о файле из Telegram
        $getFileUrl = "https://api.telegram.org/bot" . config('telegram.bot_token_master') . "/getFile?file_id=" . $fileId;
        $response = file_get_contents($getFileUrl);
        $fileData = json_decode($response, true);

        if (!$fileData || !$fileData['ok']) {
            throw new \Exception('Failed to get file data from Telegram');
        }

        // Создаем безопасное имя файла для сертификата
        $safeName = $this->generateSafeFileName('education_certificate.jpg');

        // Формируем путь для сохранения в отдельную папку education_cert
        $path = sprintf(
            'employee_registrations/%d/education_cert/%s',
            $registration->id,
            $safeName
        );

        // Создаем директорию если её нет
        $directory = dirname(storage_path('app/' . $path));
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        // Скачиваем фото
        $fileUrl = "https://api.telegram.org/file/bot" . config('telegram.bot_token_master') . "/" . $fileData['result']['file_path'];
        $fileContent = file_get_contents($fileUrl);

        if ($fileContent === false) {
            throw new \Exception('Failed to download education certificate photo');
        }

        // Сохраняем фото
        if (!Storage::put($path, $fileContent)) {
            throw new \Exception('Failed to save education certificate photo');
        }

        // Сохраняем путь к файлу в базе
        $registration->update([
            'education_cert_path' => $path
        ]);

        Log::info('Education certificate saved successfully', [
            'registration_id' => $registration->id,
            'path' => $path
        ]);

        return true;

    } catch (\Exception $e) {
        Log::error('Failed to save education certificate', [
            'registration_id' => $registration->id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

public function getEducationCertificate($id)
{
    try {
        $registration = EmployeeRegistration::findOrFail($id);
        
        if (!$registration->education_cert_path) {
            return response()->json([
                'success' => false,
                'message' => 'No education certificate found'
            ], 404);
        }

        $path = storage_path('app/' . $registration->education_cert_path);
        return response()->file($path);
        
    } catch (\Exception $e) {
        Log::error('Failed to get education certificate', [
            'id' => $id,
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to get education certificate'
        ], 500);
    }
}

    /**
     * Получить детали конкретной заявки
     */
    public function show($id)
    {
        try {
            $registration = EmployeeRegistration::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $registration
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get registration details', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get registration details'
            ], 500);
        }
    }

    /**
     * Одобрить заявку
     */
    public function approve($id)
{
    try {
        $registration = EmployeeRegistration::findOrFail($id);
        
        if (!$registration->branch_yclients_id) {
            $branch = Branch::where('branch_id', $registration->branch_id)->first();
            if (!$branch || !$branch->yclients_id) {
                throw new \Exception('Cannot find branch_yclients_id');
            }
            $registration->branch_yclients_id = $branch->yclients_id;
            $registration->save();
        }

        $registration->update([
            'status' => 'approved'
        ]);

        if ($registration->telegram_id) {
            Log::info('Sending approval notification with documents', [
                'telegram_id' => $registration->telegram_id
            ]);
            
            // Сначала отправляем сообщение об одобрении
            $message = "🎉 Поздравляем!\n\n" .
                      "Ваша заявка на трудоустройство в CherryTown одобрена!\n\n" .
                      "Сейчас вам будут отправлены документы для подписания. " .
                      "Пожалуйста, внимательно ознакомьтесь с инструкцией.";
            
            $this->telegramService->sendMessage(
                $registration->telegram_id,
                $message,
                'HTML'
            );

            try {
                // Генерируем документы и сохраняем путь к временному файлу
                $contractGenerator = app(ContractGeneratorController::class);
                $response = $contractGenerator->generate(new Request(['id' => $registration->id]));
                
                // Получаем путь к сгенерированному zip из логов
                $zipPath = storage_path('app/temp/') . 'documents_' . uniqid() . '.zip';
                
                // Копируем файл во временную директорию
                if (!copy($response->getFile()->getPathname(), $zipPath)) {
                    throw new \Exception('Failed to copy zip file');
                }
                
                // Читаем содержимое файла
                $zipContent = file_get_contents($zipPath);
                if (!$zipContent) {
                    throw new \Exception('Failed to read zip content');
                }
                
                // Отправляем документ
                $this->telegramService->sendDocument(
                    $registration->telegram_id,
                    $zipContent,
                    "Документы_{$registration->contract_number}.zip"
                );
                
                // Удаляем временный файл
                unlink($zipPath);
            

                // Отправляем инструкцию
                $instructions = "
Пожалуйста, внимательно прочитайте инструкцию!!!

1. Распакуйте полученный архив
2. Подпишите все документы
3. Отправьте ВСЕ подписанные документы ОДНИМ СООБЩЕНИЕМ в этот чат

❗️ Важные требования:
- Отправьте все документы одним сообщением (можно выбрать несколько файлов)
- Принимаются файлы в форматах PDF или DOCX
- Убедитесь, что все документы хорошо читаемы
- Проверьте наличие всех подписей перед отправкой

Чтобы отправить несколько файлов одним сообщением:
📱 В мобильном приложении:
1. Нажмите на скрепку
2. Выберите \"Файл\"
3. Нажмите на три точки в правом верхнем углу
4. Выберите все нужные документы
5. Нажмите \"Отправить\"

💻 В десктопной версии:
1. Нажмите на скрепку
2. Зажмите Ctrl и выберите все нужные файлы
3. Нажмите \"Открыть\"";

                $this->telegramService->sendMessage(
                    $registration->telegram_id,
                    $instructions,
                    'HTML'
                );

            } catch (\Exception $e) {
                Log::error('Failed to generate or send documents', [
                    'registration_id' => $id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw new \Exception('Failed to generate or send documents: ' . $e->getMessage());
            }
            
        } else {
            Log::warning('No telegram_id found for registration', ['id' => $id]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Registration approved successfully'
        ]);

    } catch (\Exception $e) {
        Log::error('Failed to approve registration', [
            'id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to approve registration: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Отправить приглашение для регистрации пользователя
 */
public function sendInvite($id)
{
    try {
        $registration = EmployeeRegistration::findOrFail($id);
        
        // Изменяем проверку, разрешаем отправку для approved и invite_sent
        

        // Отправляем приглашение через YClients
        $yclients = app(YclientsService::class);
        
        // Форматируем телефон
        $phone = preg_replace('/[^0-9]/', '', $registration->phone);
        if (strlen($phone) === 11) {
            $phone = substr($phone, 1);
        }

        $inviteResult = $yclients->sendUserInvite(
            (int)$registration->branch_yclients_id,
            $phone,
            $registration->email
        );

        if (!$inviteResult) {
            throw new \Exception('Failed to send YClients invitation');
        }

        // Обновляем статус только если он не был invite_sent
        if ($registration->status !== 'invite_sent') {
            $registration->update([
                'status' => 'invite_sent'
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invitation sent successfully'
        ]);

    } catch (\Exception $e) {
        Log::error('Failed to send invitation', [
            'id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to send invitation: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Создать сотрудника после регистрации пользователя
 */
public function createStaffAfterInvite($id)
{
    try {
        $registration = EmployeeRegistration::findOrFail($id);
        
        if ($registration->status !== 'invite_sent') {
            throw new \Exception('Invalid registration status for staff creation');
        }

        // Создаем сотрудника
        $yclients = app(YclientsService::class);
        
        // Форматируем телефон
        $phone = preg_replace('/[^0-9]/', '', $registration->phone);
        if (strlen($phone) === 11) {
            $phone = substr($phone, 1);
        }

        $staffData = [
            'name' => $registration->short_name ?? $registration->full_name,
            'specialization' => 'Мастер',
            'position_id' => null,
            'phone_number' => $phone,
            'email' => $registration->email
        ];

        $result = $yclients->createStaff((int)$registration->branch_yclients_id, $staffData);

        if ($result && isset($result['success']) && $result['success']) {
            // Обновляем статус и сохраняем ID сотрудника
            $registration->update([
                'status' => 'completed',
                'yclients_staff_id' => $result['data']['id'] ?? null
            ]);

            // Отправляем уведомление об успехе
            $this->sendStaffCreationNotification($registration);

            return response()->json([
                'success' => true,
                'message' => 'Staff member created successfully'
            ]);
        } else {
            // Получаем детали ошибки
            $errorDetails = '';
            if (isset($result['meta']['errors'])) {
                $errorDetails = json_encode($result['meta']['errors']);
            } elseif (isset($result['meta']['message'])) {
                $errorDetails = $result['meta']['message'];
            } else {
                $errorDetails = 'Unknown error occurred';
            }

            // Отправляем уведомление об ошибке
            $this->sendStaffCreationNotification($registration, false, $errorDetails);

            throw new \Exception('Failed to create staff member: ' . $errorDetails);
        }

    } catch (\Exception $e) {
        Log::error('Failed to create staff', [
            'id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to create staff: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Отклонить заявку
     */
    public function reject($id)
    {
        try {
            $registration = EmployeeRegistration::findOrFail($id);
            $registration->update(['status' => 'rejected']);

            if ($registration->telegram_id) {
                $message = "❌ К сожалению, мы вынуждены отказать вам в трудоустройстве.\n\nЕсли у вас есть вопросы, вы можете связаться с менеджером.";
                
                $this->telegramService->sendMessage(
                    $registration->telegram_id,
                    $message
                );
                
            }

            return response()->json([
                'success' => true,
                'message' => 'Registration rejected successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to reject registration', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject registration'
            ], 500);
        }
    }

    /**
     * Получить документы заявки
     */
    public function getDocuments($id)
    {
        try {
            $registration = EmployeeRegistration::findOrFail($id);
            
            $documents = $registration->signedDocuments()->get()->map(function($document) {
                return [
                    'path' => '/var/www/wb-back/storage/app/' . $document->path,
                    'original_name' => mb_convert_encoding($document->original_name, 'UTF-8')
                ];
            });
    
            return response()->json([
                'success' => true,
                'data' => $documents
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get registration documents', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get registration documents'
            ], 500);
        }
    }

    public function getMasterDocumentsByPhone($phone)
{
    try {
        \Log::info('Searching for master with phone:', ['phone' => $phone]);

        // Форматируем телефон для поиска
        $formattedPhone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($formattedPhone) === 11 && $formattedPhone[0] === '8') {
            $formattedPhone = '7' . substr($formattedPhone, 1);
        }

        // Добавляем + к номеру для поиска
        $searchPhone = '+' . $formattedPhone;

        \Log::info('Searching for phone:', ['search_phone' => $searchPhone]);

        // Ищем регистрацию
        $registration = EmployeeRegistration::where('phone', $searchPhone)
            ->whereNull('deleted_at')
            ->where('status', 'completed')
            ->first();

        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'Registration not found'
            ], 404);
        }

        // Получаем документы
        $documents = $registration->signedDocuments()->get();
        
        \Log::info('Found documents:', [
            'registration_id' => $registration->id,
            'document_count' => $documents->count()
        ]);

        $documentsData = $documents->map(function($document) {
            return [
                'path' => '/var/www/wb-back/storage/app/' . $document->path,
                'original_name' => mb_convert_encoding($document->original_name, 'UTF-8')
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $documentsData
        ]);
    } catch (\Exception $e) {
        \Log::error('Failed to get master documents by phone', [
            'phone' => $phone,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to get master documents: ' . $e->getMessage()
        ], 500);
    }
}

   /**
* Upload signed documents for the employee registration
*
* @param Request $request
* @param int $id
* @return \Illuminate\Http\JsonResponse
*/
public function uploadSignedDocuments(Request $request, $id)
{
   Log::info('Uploading signed documents request', [
       'registration_id' => $id,
       'request_data' => $request->all()
   ]);

   try {
       $registration = EmployeeRegistration::findOrFail($id);

       $validator = Validator::make($request->all(), [
           'files' => 'required|array',
           'files.*.url' => 'required|string|url',
           'files.*.name' => 'required|string|max:255'
       ]);

       if ($validator->fails()) {
           Log::error('Documents validation failed', $validator->errors()->toArray());
           return response()->json(['errors' => $validator->errors()], 422);
       }

       $files = $request->input('files', []);
       $uploadedFiles = [];

       foreach ($files as $file) {
           Log::info('Processing file', [
               'name' => $file['name'],
               'url' => $file['url']
           ]);

           // Создаем безопасное имя файла
           $safeName = $this->generateSafeFileName($file['name']);
           
           // Формируем путь для сохранения
           $path = sprintf(
               'employee_registrations/%d/signed_documents/%s',
               $registration->id,
               $safeName
           );
           
           Log::info('Attempting to save file', [
               'path' => $path,
               'safe_name' => $safeName
           ]);

           try {
               // Создаем директорию если её нет
               $directory = dirname(storage_path('app/' . $path));
               if (!file_exists($directory)) {
                   mkdir($directory, 0755, true);
               }

               // Получаем содержимое файла
               $fileContent = file_get_contents($file['url']);
               if ($fileContent === false) {
                   Log::error('Failed to download file', [
                       'file_name' => $file['name'],
                       'url' => $file['url']
                   ]);
                   throw new \Exception("Failed to download file: {$file['name']}");
               }

               // Сохраняем файл
               if (!Storage::put($path, $fileContent)) {
                   Log::error('Failed to save file', [
                       'path' => $path
                   ]);
                   throw new \Exception("Failed to save file: {$file['name']}");
               }

               // Создаем запись о документе
               $document = $registration->signedDocuments()->create([
                   'path' => $path,
                   'original_name' => $file['name']
               ]);

               Log::info('File saved successfully', [
                   'document_id' => $document->id,
                   'file_name' => $file['name'],
                   'path' => $path
               ]);

               $uploadedFiles[] = [
                   'original_name' => $file['name'],
                   'stored_path' => $path
               ];
           } catch (\Exception $e) {
               Log::error('Error processing file', [
                   'file_name' => $file['name'],
                   'error' => $e->getMessage(),
                   'trace' => $e->getTraceAsString()
               ]);
               throw $e;
           }
       }

       // Обновляем статус регистрации
       $registration->update([
           'status' => 'documents_uploaded',
           'documents_uploaded_at' => Carbon::now()
       ]);

       Log::info('Documents uploaded successfully', [
           'registration_id' => $id,
           'files_count' => count($uploadedFiles),
           'files' => $uploadedFiles
       ]);

       return response()->json([
           'message' => 'Documents uploaded successfully',
           'data' => [
               'registration_id' => $registration->id,
               'uploaded_files' => $uploadedFiles,
               'status' => $registration->status
           ]
       ], 200);

   } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
       Log::error('Registration not found', ['id' => $id]);
       return response()->json([
           'message' => 'Registration not found'
       ], 404);

   } catch (\Exception $e) {
       Log::error('Failed to upload documents', [
           'registration_id' => $id,
           'error' => $e->getMessage(),
           'trace' => $e->getTraceAsString()
       ]);

       return response()->json([
           'message' => 'Failed to upload documents',
           'error' => $e->getMessage()
       ], 500);
   }
}

/**
* Generate a safe filename from the original name
* 
* @param string $originalName
* @return string
*/
private function generateSafeFileName(string $originalName): string 
{
   // Получаем расширение файла
   $extension = pathinfo($originalName, PATHINFO_EXTENSION);
   
   // Создаем базовое имя из timestamp и хеша оригинального имени
   $timestamp = Carbon::now()->timestamp;
   $hash = substr(md5($originalName), 0, 8);
   
   return "{$timestamp}_{$hash}.{$extension}";
}



}
