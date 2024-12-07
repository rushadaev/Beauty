<?php

namespace App\Console\Commands;

use App\Services\YclientsService;
use App\Models\SyncLog;
use Illuminate\Console\Command;

class FetchBranchesInfo extends Command
{
    protected $signature = 'app:fetch-branches-info
                          {--full : Run full synchronization}';
                          
    protected $description = 'Synchronize branches with Yclients API';

    private YclientsService $yclientsService;

    public function __construct(YclientsService $yclientsService)
    {
        parent::__construct();
        $this->yclientsService = $yclientsService;
    }

    public function handle()
    {
        $syncType = $this->option('full') ? 'full' : 'regular';
        $this->info("Starting {$syncType} branches synchronization...");

        try {
            // Устанавливаем токен
            $this->yclientsService->setUserToken(config('services.yclients.user_token'));
        
            $result = $this->yclientsService->syncBranches();
        
            if ($result['success']) {
                $this->info("✓ Successfully synchronized {$result['synced']} branches.");
                
                if ($result['errors'] > 0) {
                    $this->warn("⚠ There were {$result['errors']} errors during synchronization.");
                }
                
                // Получаем последний лог синхронизации
                $lastSync = SyncLog::latest()->first();
                if ($lastSync) {
                    $this->line("\nSync Statistics:");
                    $this->line("• Duration: " . number_format($lastSync->duration, 2) . " seconds");
                    $this->line("• Synced: {$lastSync->synced_count}");
                    $this->line("• Errors: {$lastSync->error_count}");
                }
            } else {
                $this->error("✗ " . $result['message']);
            }
        
            // Выводим отладочную информацию
            if (!empty($result['debug_info'])) {
                $this->line("\nDebug information:");
                foreach ($result['debug_info'] as $info) {
                    $this->line('• ' . $info);
                }
            }
            
            return $result['success'] ? Command::SUCCESS : Command::FAILURE;

        } catch (\Exception $e) {
            $this->error("Fatal error during synchronization: " . $e->getMessage());
            $this->line("\nStack trace:");
            $this->line($e->getTraceAsString());
            return Command::FAILURE;
        }
    }
}