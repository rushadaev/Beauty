<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Vgrish\YclientsOpenApi\Api\DefaultApi;
use GuzzleHttp\Client;
use Vgrish\YclientsOpenApi\Model\AuthUserRequest;

class YclientsService
{
    protected $apiInstance;
    protected $accessToken;

    public function __construct()
    {
        $this->apiInstance = new DefaultApi(new Client());
        $this->authenticate();
    }

    protected function authenticate()
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $key = 'yclients_access_token_' . $user->telegram_id;
        $isSavedInRedis = Redis::get($key);

        Log::info('YclientsService:authenticate', ['isSavedInRedis' => $isSavedInRedis]);

        if ($isSavedInRedis) {
            $this->accessToken = $isSavedInRedis;
            return;
        }

        $key = $user->getYclientsApiKey();

        if ($key) {
            $this->accessToken = $key;
            return;
        }

        // Authenticate with YCLIENTS API default credentials

        $accept = 'application/vnd.yclients.v2+json';
        $contentType = 'application/json';
        $authorization = 'Bearer ' . config('services.yclients.partner_token');

        $authUserRequest = new AuthUserRequest([
            'login'    => config('services.yclients.login'),
            'password' => config('services.yclients.password'),
        ]);

        try {
            $response = $this->apiInstance->authUser(
                $accept,
                $contentType,
                $authorization,
                $authUserRequest
            );

            $this->accessToken = $response->getData()['user_token'];
            Redis::set($key, $this->accessToken, 'EX', 8640);
        } catch (\Exception $e) {
            // Handle authentication error
            throw new \Exception('YCLIENTS Authentication Failed: ' . $e->getMessage());
        }
    }

    public function createClient($companyId, $clientData)
    {
        $accept = 'application/vnd.yclients.v2+json';
        $contentType = 'application/json';
        $authorization = 'Bearer ' . config('services.yclients.partner_token') . ', User ' . $this->accessToken;

        try {
            $response = $this->apiInstance->clientCreate(
                $companyId,
                $accept,
                $contentType,
                $authorization,
                $clientData
            );

            return $response->getData();
        } catch (\Exception $e) {
            // Handle API error
            throw new \Exception('YCLIENTS API Error: ' . $e->getMessage());
        }
    }

    public function getCompanies()
    {
        $accept        = 'application/vnd.yclients.v2+json';
        $contentType   = 'application/json';
        $authorization = 'Bearer ' . config('services.yclients.partner_token') . ', User ' . $this->accessToken;

        try {
            $response = $this->apiInstance->companyGetList(
                $accept,
                $contentType,
                $authorization
            );

            return $response->getData();
        } catch (\Exception $e) {
            throw new \Exception('YCLIENTS API Error: ' . $e->getMessage());
        }
    }


    public function getMyCompany()
    {
        $user = auth()->user();

        $key = $user->getYclientsApiKey();


        $accept = 'application/vnd.yclients.v2+json';
        $contentType = 'application/json';
        $authorization = 'Bearer ' . config('services.yclients.partner_token') . ', User ' . $key;
        try {
            $response = $this->apiInstance->companyGetList(
                $accept,
                $contentType,
                $authorization,
                null,
                null,
                1
            );

            return $response->getData()[0];
        } catch (\Exception $e) {
            throw new \Exception('YCLIENTS API Error: ' . $e->getMessage());
        }
    }

    public function getGoods($companyId)
    {
        $user = auth()->user();

        $key = $user->getYclientsApiKey();

        $client = new Client();
        $url = 'https://api.yclients.com/api/v1/goods/' . $companyId;

        $headers = [
            'Accept'        => 'application/vnd.yclients.v2+json',
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . config('services.yclients.partner_token') . ', User ' . $key,
        ];

        try {
            $response = $client->get($url, ['headers' => $headers]);
            $data = json_decode($response->getBody(), true);

            if (isset($data['success']) && $data['success']) {
                return $data['data'];
            } else {
                throw new \Exception('Failed to fetch goods.');
            }
        } catch (\Exception $e) {
            throw new \Exception('YCLIENTS API Error: ' . $e->getMessage());
        }
    }

    public function getProduct($companyId, $productId){
        $user = auth()->user();

        $key = $user->getYclientsApiKey();
        $client = new Client();
        $url = 'https://api.yclients.com/api/v1/goods/' . $companyId . '/'. $productId;

        $headers = [
            'Accept'        => 'application/vnd.yclients.v2+json',
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . config('services.yclients.partner_token') . ', User ' . $key,
        ];

        try {
            $response = $client->get($url, ['headers' => $headers]);
            $data = json_decode($response->getBody(), true);

            if (isset($data['success']) && $data['success']) {
                return $data['data'];
            } else {
                throw new \Exception('Failed to fetch goods.');
            }
        } catch (\Exception $e) {
            throw new \Exception('YCLIENTS API Error: ' . $e->getMessage());
        }
    }


    public function authenticateByCreds($telegram_id, $password, $phone)
    {
        $user = User::where('telegram_id', $telegram_id)->first();

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $key = `yclients_access_token_{$telegram_id}` . config('services.yclients.login');
        $isSavedInRedis = Redis::get($key);

        if ($isSavedInRedis) {
            $this->accessToken = $isSavedInRedis;

            return $this->accessToken;
        }

        $accept = 'application/vnd.yclients.v2+json';
        $contentType = 'application/json';
        $authorization = 'Bearer ' . config('services.yclients.partner_token');

        $authUserRequest = new AuthUserRequest([
            'login'    => $phone,
            'password' => $password,
        ]);

        try {
            $response = $this->apiInstance->authUser(
                $accept,
                $contentType,
                $authorization,
                $authUserRequest
            );

            $this->accessToken = $response->getData()['user_token'];
            Redis::set($key, $this->accessToken, 'EX', 8640);

            return $this->accessToken;
        } catch (\Exception $e) {
            // Handle authentication error
            throw new \Exception('YCLIENTS Authentication Failed: ' . $e->getMessage());
        }
    }

}
