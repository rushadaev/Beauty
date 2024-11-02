<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class NodeApiService
{
    protected $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.nodejs.base_url', 'http://nodejs-server:3000');
    }

    public function listDrafts($userId)
    {
        try {
            if (!$userId) {
                throw new Exception('User ID is required.');
            }

            $response = Http::get("{$this->baseUrl}/api/drafts/list", [
                'userId' => $userId,
            ]);

            if ($response->failed()) {
                Log::error('Failed to fetch drafts.', ['response' => $response->json()]);
                throw new Exception('Failed to fetch drafts.');
            }

            return $response->json();
        } catch (Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function listWarehouses($userId, $draftId)
    {
        try {
            if (!$userId || !$draftId) {
                throw new Exception('User ID and Draft ID are required.');
            }

            $response = Http::get("{$this->baseUrl}/api/orders/warehouses", [
                'userId' => $userId,
                'draftId' => $draftId,
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch warehouses.');
            }

            return $response->json();
        } catch (Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function listTimeSlots($userId, $preorderId)
    {
        try {
            if (!$userId || !$preorderId) {
                throw new Exception('User ID and Preorder ID are required.');
            }

            $response = Http::get("{$this->baseUrl}/api/acceptance/fetchTimeslots", [
                'userId' => $userId,
                'preorderId' => $preorderId,
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch time slots.');
            }

            return $response->json();
        } catch (Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function createOrder($userId, $draftId, $warehouseId, $boxTypeMask)
    {
        try {
            if (!$userId || !$draftId || !$warehouseId || !$boxTypeMask) {
                throw new Exception('User ID, Draft ID, Warehouse ID, and Box Type Mask are required.');
            }

            $response = Http::post("{$this->baseUrl}/api/orders/create", [
                'userId' => $userId,
                'draftId' => $draftId,
                'warehouseId' => $warehouseId,
                'boxTypeMask' => $boxTypeMask,
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to create order.');
            }

            return $response->json();
        } catch (Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function bookTimeSlot($userId, $preorderId, $warehouseId, $deliveryDate, $monopalletCount = null)
    {
        try {
            if (!$userId || !$preorderId || !$warehouseId || !$deliveryDate) {
                throw new Exception('User ID, Preorder ID, Warehouse ID, and Delivery Date are required.');
            }

            $response = Http::post("{$this->baseUrl}/api/acceptance/bookTimeslot", [
                'userId' => $userId,
                'preorderId' => $preorderId,
                'warehouseId' => $warehouseId,
                'deliveryDate' => $deliveryDate,
                'monopalletCount' => $monopalletCount,
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to book time slot.');
            }

            return $response->json();
        } catch (Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function authenticate($user, $phone)
    {
//        try {
//            $response = $this->checkUser($user);
//            Log::info('User is valid', ['response' => $response]);
//        } catch (Exception $e) {
//            Log::error($e->getMessage());
//            return response()->json(['error' => $e->getMessage()], 400);
//        }


        try {
            if (!$phone) {
                throw new Exception('Phone number is required.');
            }

            $telegramId = $user->telegram_id;

            // Send the request to Node.js and receive an immediate response
            $response = Http::post("{$this->baseUrl}/api/auth/authenticate", [
                'userId' => $user->id,
                'telegramId' => $telegramId,
                'credentials' => [
                    'phone' => $phone,
                ],
            ]);

            if ($response->successful()) {
                Log::info('Authentication job started for user: ' . $user->id);

                // Return success message immediately
                return response()->json(['message' => 'Authentication job started. Please check back for the result.'], 202);
            }

            if ($response->failed()) {
                Log::error('Failed to start authentication for user: ' . $user->id, ['response' => $response->json()]);
                throw new Exception('Authentication failed.');
            }

        } catch (Exception $e) {
            Log::error($e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }

        return response()->json(['error' => 'An unexpected error occurred.'], 500);
    }

    private function checkUser($user)
    {
        if (!$user instanceof User) {
            throw new Exception('Invalid user object.');
        }
        try {
            $respone = $this->listDrafts($user->id);
            return $respone;
        } catch (Exception $e) {
            throw new Exception('User does not exist.');
        }

    }
}
