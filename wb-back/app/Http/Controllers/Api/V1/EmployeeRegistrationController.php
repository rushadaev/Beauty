<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EmployeeRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class EmployeeRegistrationController extends Controller
{
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
                'work_address' => 'г. Москва, ул. Пушкина, д.1, кв. 1',
                'contract_signed_at' => $now,
                'contract_expires_at' => $now->copy()->addYear(),
                'status' => 'pending'
            ]);

            Log::info('Attempting to create registration with data:', $data);

            // short_name будет сгенерирован автоматически в модели
            $registration = EmployeeRegistration::create($data);
            
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

            $files = $request->files;
            $uploadedFiles = [];

            foreach ($files as $file) {
                // Создаем безопасное имя файла
                $safeName = Carbon::now()->timestamp . '_' . 
                           preg_replace('/[^a-zA-Z0-9.]/', '_', $file['name']);
                
                // Формируем путь для сохранения
                $path = "employee_registrations/{$registration->id}/signed_documents/{$safeName}";
                
                try {
                    // Получаем содержимое файла
                    $fileContent = file_get_contents($file['url']);
                    if ($fileContent === false) {
                        throw new \Exception("Failed to download file: {$file['name']}");
                    }

                    // Сохраняем файл
                    if (!Storage::put($path, $fileContent)) {
                        throw new \Exception("Failed to save file: {$file['name']}");
                    }

                    // Создаем запись о документе
                    $document = $registration->signedDocuments()->create([
                        'path' => $path,
                        'original_name' => $file['name']
                    ]);

                    $uploadedFiles[] = [
                        'original_name' => $file['name'],
                        'stored_path' => $path
                    ];
                } catch (\Exception $e) {
                    Log::error('Error processing file', [
                        'file_name' => $file['name'],
                        'error' => $e->getMessage()
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
                'files_count' => count($uploadedFiles)
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
}
