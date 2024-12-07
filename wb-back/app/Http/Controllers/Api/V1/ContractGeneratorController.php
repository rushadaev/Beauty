<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EmployeeRegistration;
use PhpOffice\PhpWord\TemplateProcessor;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use ZipArchive;

class ContractGeneratorController extends Controller
{
    private function generateDocument($registration, $templatePath, $documentType, $fileName, $phone)
    {
        if (!file_exists($templatePath)) {
            throw new \Exception("Template not found: {$documentType}");
        }

        $templateProcessor = new TemplateProcessor($templatePath);

        $formatDate = function($date) {
            return $date ? Carbon::parse($date)->format('d.m.Y') : '';
        };

        $variables = [
            'contract_number' => $registration->contract_number,
            'contract_signed_at' => $formatDate($registration->contract_signed_at),
            'contract_expires_at' => $formatDate($registration->contract_expires_at),
            'work_address' => $registration->work_address,
            'fullName' => $registration->full_name,
            'short_name' => $registration->short_name,
            'passport' => $registration->passport_series_number,
            'birthDate' => $formatDate($registration->birth_date),
            'issuedBy' => $registration->passport_issued_by,
            'issueDate' => $formatDate($registration->passport_issue_date),
            'registrationAddress' => $registration->registration_address,
            'inn' => $registration->inn,
            'accountNumber' => $registration->account_number,
            'bankName' => $registration->bank_name,
            'bik' => $registration->bik,
            'corrAccount' => $registration->correspondent_account,
            'bankInn' => $registration->bank_inn,
            'bankKpp' => $registration->bank_kpp,
            'phone' => $phone
        ];

        foreach ($variables as $key => $value) {
            $templateProcessor->setValue($key, $value ?? '');
        }

        $outputPath = storage_path("app/temp/{$documentType}_" . uniqid() . '.docx');
        $templateProcessor->saveAs($outputPath);

        if (!file_exists($outputPath)) {
            throw new \Exception("Failed to save document: {$fileName}");
        }

        return [
            'path' => $outputPath,
            'filename' => $fileName
        ];
    }

    public function generate(Request $request)
    {
        try {
            Log::info('Starting documents generation', ['request_id' => $request->id]);
            
            $registration = EmployeeRegistration::findOrFail($request->id);
            
            $documents = [
                [
                    'type' => 'contract',
                    'template' => storage_path('app/templates/contract_template.docx'),
                    'filename' => "Договор_{$registration->contract_number}_{$registration->short_name}.docx"
                ],
                [
                    'type' => 'service',
                    'template' => storage_path('app/templates/service_template.docx'),
                    'filename' => "Соглашение_о_порядке_оказания_услуг_{$registration->contract_number}_{$registration->short_name}.docx"
                ],
                [
                    'type' => 'confidential',
                    'template' => storage_path('app/templates/confidential_template.docx'),
                    'filename' => "Соглашение_о_конфиденциальности_{$registration->contract_number}_{$registration->short_name}.docx"
                ]
            ];

            $zipPath = storage_path('app/temp/documents_' . uniqid() . '.zip');
            $zip = new ZipArchive();
            
            if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
                throw new \Exception("Cannot create zip archive");
            }

            // Форматируем телефон
            $phone = $registration->phone;
            if (!empty($phone)) {
                $phone = preg_replace('/^\+7/', '', $phone);
                $phone = preg_replace('/(\d{3})(\d{3})(\d{2})(\d{2})/', '+7 ($1) $2-$3-$4', $phone);
            }

            $tempFiles = [];

            foreach ($documents as $doc) {
                $generatedFile = $this->generateDocument(
                    $registration,
                    $doc['template'],
                    $doc['type'],
                    $doc['filename'],
                    $phone
                );
                
                $tempFiles[] = $generatedFile['path'];
                $zip->addFile($generatedFile['path'], $generatedFile['filename']);
            }
            
            $zip->close();

            // Очищаем временные файлы
            foreach ($tempFiles as $tempFile) {
                if (file_exists($tempFile)) {
                    unlink($tempFile);
                }
            }

            return response()->download(
                $zipPath,
                "Документы_{$registration->contract_number}_{$registration->short_name}.zip",
                [
                    'Content-Type' => 'application/zip',
                    'Content-Disposition' => 'attachment'
                ]
            )->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            Log::error('Documents generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}