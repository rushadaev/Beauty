<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckMedBookExpirations extends Command
{
    protected $signature = 'app:check-med-books';
    protected $description = 'Check medical books expiration dates and notify admins and employees';

    private TelegramService $telegramService;
    private array $checkDates = [
        30 => 'один месяц',
        14 => 'две недели',
        7 => 'одну неделю',
        3 => 'три дня'
    ];

    public function __construct(TelegramService $telegramService)
    {
        parent::__construct();
        $this->telegramService = $telegramService;
    }

    public function handle()
    {
        try {
            Log::info('Starting medical books expiration check');

            foreach ($this->checkDates as $days => $period) {
                $this->checkExpirations($days, $period);
            }

            Log::info('Medical books expiration check completed successfully');
            return Command::SUCCESS;

        } catch (\Exception $e) {
            Log::error('Error checking medical books expiration', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }

    private function checkExpirations(int $days, string $period)
    {
        $targetDate = Carbon::now()->addDays($days)->startOfDay();
        
        // Получаем сотрудников напрямую из таблицы Employee
        $employees = Employee::where('has_med_book', true)
            ->where('is_active', true)
            ->whereDate('med_book_expiry', $targetDate->toDateString())
            ->get();

        if ($employees->isNotEmpty()) {
            // Сначала отправляем уведомления сотрудникам через бот для мастеров
            $this->telegramService->setBotToken(config('telegram.bot_token_master'));

            foreach ($employees as $employee) {
                if ($employee->telegram_id) {
                    $employeeMessage = "❗ *Внимание!*\n\n";
                    $employeeMessage .= "Через {$period} истекает срок действия вашей медицинской книжки.\n\n";
                    $employeeMessage .= sprintf(
                        "📅 Дата окончания: %s\n\n",
                        Carbon::parse($employee->med_book_expiry)->format('d.m.Y')
                    );
                    $employeeMessage .= "Пожалуйста, не забудьте продлить медицинскую книжку!";

                    try {
                        $this->telegramService->sendMessage(
                            $employee->telegram_id,
                            $employeeMessage,
                            'Markdown'
                        );

                        Log::info('Med book expiration notification sent to employee', [
                            'employee_id' => $employee->id,
                            'telegram_id' => $employee->telegram_id,
                            'name' => $employee->full_name
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to send notification to employee', [
                            'employee_id' => $employee->id,
                            'telegram_id' => $employee->telegram_id,
                            'name' => $employee->full_name,
                            'error' => $e->getMessage()
                        ]);
                    }
                } else {
                    Log::warning('Employee has no telegram_id', [
                        'employee_id' => $employee->id,
                        'name' => $employee->full_name
                    ]);
                }
            }

            // Переключаемся на бот для админов и отправляем им уведомление
            $this->telegramService->setBotToken(config('telegram.bot_token_supplies'));
            
            $adminMessage = "❗ *ВНИМАНИЕ: Истечение срока медицинских книжек*\n\n";
            $adminMessage .= "Через {$period} истекает срок действия медицинских книжек у следующих сотрудников:\n\n";

            foreach ($employees as $employee) {
                $adminMessage .= sprintf(
                    "👤 *%s*\n📅 Дата окончания: %s\n📍 Филиал: %s\n\n",
                    $employee->full_name,
                    Carbon::parse($employee->med_book_expiry)->format('d.m.Y'),
                    optional($employee->branch)->name ?? 'Не указан'
                );
            }

            $adminMessage .= "❗ Пожалуйста, примите необходимые меры для продления медицинских книжек.";

            // Отправка сообщения админам
            $sent = $this->telegramService->sendMessageToAllAdmins($adminMessage);
            
            Log::info('Med book expiration notification sent to admins', [
                'period' => $period,
                'employees_count' => $employees->count(),
                'sent_successfully' => $sent
            ]);
        }
    }
}