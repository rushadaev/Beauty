<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\TelegramService;
use App\Models\AdminTask;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use TelegramBot\Api\Types\Inline\InlineKeyboardMarkup;

class SalaryNotificationCommand extends Command
{
    protected $signature = 'app:salary-notification {--force : Принудительно отправить уведомление}';
    protected $description = 'Отправляет уведомления о расчете зарплаты 13-го и 29-го числа каждого месяца';

    protected $telegramService;

    public function __construct(TelegramService $telegramService)
    {
        parent::__construct();
        $this->telegramService = $telegramService;
    }

    public function handle()
    {
        try {
            $today = Carbon::now('Europe/Moscow');
            
            if (!in_array($today->day, [13, 29]) && !$this->option('force')) {
                $this->info('Сегодня не день расчета зарплаты. Используйте --force для принудительной отправки.');
                Log::info('Сегодня не день расчета зарплаты', ['date' => $today->format('d.m.Y')]);
                return;
            }

            $this->info('Начинаем отправку уведомлений...');

            // Определяем период расчета
            if ($today->day === 13 || ($this->option('force') && $today->day < 29)) {
                $startDate = $today->copy()->subMonth()->setDay(29);
                $endDate = $today->copy()->setDay(12);
            } else {
                $startDate = $today->copy()->setDay(13);
                $endDate = $today->copy()->setDay(28);
            }

            // Создаем задачу
            $task = AdminTask::create([
                'title' => 'Расчет и отправка зарплаты',
                'description' => sprintf(
                    "Необходимо:\n1. Произвести расчет зарплат за период %s - %s\n2. Отправить расчет бухгалтеру\n3. Подготовить выплаты",
                    $startDate->format('d.m.Y'),
                    $endDate->format('d.m.Y')
                ),
                'type' => AdminTask::TYPE_OTHER,
                'status' => AdminTask::STATUS_PENDING,
                'priority' => 5,
                'master_name' => 'Все мастера',  // Добавили это поле
                'deadline' => $today->copy()->endOfDay(),
                'additional_data' => [
                    'salary_period_start' => $startDate->format('Y-m-d'),
                    'salary_period_end' => $endDate->format('Y-m-d'),
                ]
            ]);

            // Формируем текст уведомления
            $message = sprintf(
                "💰 *РАСЧЕТ ЗАРПЛАТЫ*\n\n".
                "Сегодня день расчета зарплаты!\n\n".
                "📅 *Период расчета:*\n".
                "с %s по %s\n\n".
                "❗️ Необходимо:\n".
                "1. Произвести расчет\n".
                "2. Отправить данные бухгалтеру\n".
                "3. Подготовить выплаты",
                $startDate->format('d.m.Y'),
                $endDate->format('d.m.Y')
            );

            // Создаем клавиатуру с помощью InlineKeyboardMarkup
            $keyboard = new InlineKeyboardMarkup([
                [
                    ['text' => '📊 Перейти к расчету', 'callback_data' => 'open_salary_' . $task->id],
                ],
                [
                    ['text' => '💼 Открыть задачу', 'callback_data' => 'view_task_' . $task->id]
                ]
            ]);

            $this->info('Отправляем уведомления администраторам...');

            // Отправляем уведомление всем администраторам
            $result = $this->telegramService->sendMessageToAllAdmins(
                $message,
                'Markdown',
                false,
                $keyboard
            );

            if ($result) {
                $this->info('Уведомления успешно отправлены');
                Log::info('Уведомления о зарплате отправлены', [
                    'date' => $today->toDateString(),
                    'task_id' => $task->id,
                    'period' => [
                        'start' => $startDate->format('d.m.Y'),
                        'end' => $endDate->format('d.m.Y')
                    ],
                    'force' => $this->option('force')
                ]);
            } else {
                $this->error('Ошибка при отправке уведомлений');
                Log::error('Ошибка при отправке уведомлений о зарплате', [
                    'task_id' => $task->id
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Ошибка при отправке уведомлений о зарплате:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            $this->error('Произошла ошибка: ' . $e->getMessage());
        }
    }
}