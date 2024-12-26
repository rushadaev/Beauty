namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\YclientsService;
use Illuminate\Support\Facades\Log;

class RecordsController extends Controller
{
    protected $yclientsService;

    public function __construct(YclientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
    }

    public function getMasterRecords(Request $request)
    {
        try {
            $data = $request->validate([
                'phone' => 'required|string',
                'password' => 'required|string',
                'start_date' => 'required|date_format:Y-m-d',
                'end_date' => 'required|date_format:Y-m-d'
            ]);

            Log::info('Getting master records', [
                'phone' => $data['phone'],
                'date_range' => [
                    'start' => $data['start_date'],
                    'end' => $data['end_date']
                ]
            ]);

            // 1. Аутентификация через админский аккаунт
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $this->yclientsService->authenticateByCredentials(
                $adminLogin, 
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                Log::error('Admin authentication failed', ['auth_result' => $authResult]);
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации администратора'
                ], 401);
            }

            // 2. Установка админского токена
            $this->yclientsService->setUserToken($authResult['token']);

            // 3. Поиск мастера и его филиала
            $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

            if (!$masterInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Мастер не найден'
                ], 404);
            }

            Log::info('Master found', [
                'company_id' => $masterInfo['company']['id'],
                'master_id' => $masterInfo['master']['id']
            ]);

            // 4. Получение записей мастера
            $records = $this->yclientsService->getRecords(
                $masterInfo['company']['id'],
                [
                    'staff_id' => $masterInfo['master']['id'],
                    'start_date' => $data['start_date'],
                    'end_date' => $data['end_date']
                ]
            );

            if (!$records) {
                return response()->json([
                    'success' => false,
                    'message' => 'Не удалось получить записи'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'data' => $records
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting master records:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Ошибка при получении записей: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getMasterRecordDetails(Request $request)
    {
        try {
            $data = $request->validate([
                'phone' => 'required|string',
                'password' => 'required|string',
                'record_id' => 'required|string'
            ]);

            Log::info('Getting record details', [
                'phone' => $data['phone'],
                'record_id' => $data['record_id']
            ]);

            // 1. Аутентификация через админский аккаунт
            $adminLogin = config('services.yclients.admin_login');
            $adminPassword = config('services.yclients.admin_password');

            $authResult = $this->yclientsService->authenticateByCredentials(
                $adminLogin, 
                $adminPassword
            );

            if (!isset($authResult['success']) || !$authResult['success']) {
                Log::error('Admin authentication failed', ['auth_result' => $authResult]);
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка авторизации администратора'
                ], 401);
            }

            // 2. Установка админского токена
            $this->yclientsService->setUserToken($authResult['token']);

            // 3. Поиск мастера и его филиала
            $masterInfo = $this->yclientsService->findMasterInCompanies($data['phone']);

            if (!$masterInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Мастер не найден'
                ], 404);
            }

            // 4. Получение деталей записи
            $record = $this->yclientsService->getRecord(
                $masterInfo['company']['id'],
                $data['record_id']
            );

            if (!$record) {
                return response()->json([
                    'success' => false,
                    'message' => 'Запись не найдена'
                ], 404);
            }

            // 5. Проверяем, что запись принадлежит этому мастеру
            if ($record['staff_id'] != $masterInfo['master']['id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Запись не принадлежит данному мастеру'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $record
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting record details:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Ошибка при получении данных записи: ' . $e->getMessage()
            ], 500);
        }
    }
}