<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\YclientsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class YclientsController extends Controller
{
    protected $yclientsService;

    public function __construct(YclientsService $yclientsService)
    {
        $this->yclientsService = $yclientsService;
    }

    /**
     * Get goods from YCLIENTS API.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getGoods(Request $request, $telegramId)
    {

        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        auth()->login($user);

        Log::info('User authenticated', ['user' => $user->toArray()]);

        $companyId = $user->company_id;

        $product_id = $request->input('product_id');

        if (!$companyId) {
            return response()->json(['error' => 'company_id is required'], 400);
        }

        if (isset($product_id)) {
            $data = $this->yclientsService->getProduct((int) $companyId, (int) $product_id);
        } else {
            $data = $this->yclientsService->getGoods((int) $companyId);
        }


        if (isset($data['error'])) {
            return response()->json($data, 500);
        }

        return response()->json($data, 200);
    }

    /**
     * Get companies from YCLIENTS API.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCompanies()
    {
        try {
            $companies = $this->yclientsService->getCompanies();
            return response()->json($companies);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getMyCompany($telegram_id){
        $user = User::where('telegram_id', $telegram_id)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        auth()->login($user);
        $company = $this->yclientsService->getMyCompany();
        return response()->json($company);
    }
}
