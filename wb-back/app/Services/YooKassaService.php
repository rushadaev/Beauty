<?php

namespace App\Services;

use YooKassa\Client;
use YooKassa\Model\Notification\NotificationSucceeded;
use YooKassa\Model\Notification\NotificationWaitingForCapture;
use YooKassa\Model\Notification\NotificationCanceled;
use YooKassa\Model\Notification\NotificationRefundSucceeded;
use YooKassa\Model\Notification\NotificationEventType;
use App\Modles\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
class YooKassaService
{
    protected $client;

    public function __construct()
    {
        $this->client = new Client();
        $this->client->setAuth(config('yookassa.shop_id'), config('yookassa.secret_key'));
    }

    public function createPaymentLink($amount, $orderId, $telegramId, $description, $subscriptionPeriod)
    {
        $uniqueId = uniqid('', true);

        $payment = $this->client->createPayment(
            [
                'amount' => [
                    'value' => $amount,
                    'currency' => 'RUB',
                ],
                'confirmation' => [
                    'type' => 'redirect',
                    'return_url' => route('payment.return', ['orderId' => $orderId]),
                ],
                'capture' => true,
                'description' => $description,
                'metadata' => [
                    'order_id' => $orderId,
                    'telegram_id' => $telegramId,
                    'subscription_period' => $subscriptionPeriod,
                ],
            ],
            $uniqueId
        );

        // Store payment ID in cache with the order ID as the key
        Cache::put("payment_id_{$orderId}", $payment->getId(), now()->addMinutes(60));

        return $payment->getConfirmation()->getConfirmationUrl();
    }

    public function createPaymentLinkTest($amount, $orderId, $telegramId, $description, $subscriptionPeriod)
    {
        $this->client->setAuth(config('yookassa.test_shop_id'), config('yookassa.test_secret_key'));
        $uniqueId = uniqid('', true);

        $payment = $this->client->createPayment(
            [
                'amount' => [
                    'value' => $amount,
                    'currency' => 'RUB',
                ],
                'confirmation' => [
                    'type' => 'redirect',
                    'return_url' => route('payment.return', ['orderId' => $orderId]),
                ],
                'capture' => true,
                'description' => $description,
                'metadata' => [
                    'order_id' => $orderId,
                    'telegram_id' => $telegramId,
                    'subscription_period' => $subscriptionPeriod
                ],
            ],
            $uniqueId
        );

        // Store payment ID in cache with the order ID as the key
        Cache::put("payment_id_{$orderId}", $payment->getId(), now()->addMinutes(60));

        return $payment->getConfirmation()->getConfirmationUrl();
    }

    public function listOrders($id)
    {
        return Order::where('user_id', $id)->get();
    }

    public function createPayout($amount, $accountId, $description)
    {
        $payout = $this->client->createPayout(
            [
                'amount' => [
                    'value' => $amount,
                    'currency' => 'RUB',
                ],
                'payout_destination_data' => [
                    'type' => 'yoo_money',
                    'account_number' => $accountId,
                ],
                'description' => $description,
            ]
        );

        return $payout;
    }

    public function listPayouts()
    {
        // You can filter and paginate payouts as needed
        return $this->client->getPayouts([]);
    }

    public function retrievePayment($paymentId)
    {
        return $this->client->getPaymentInfo($paymentId);
    }

    public function handleWebhook($requestBody)
    {
        try {
            switch ($requestBody['event']) {
                case NotificationEventType::PAYMENT_SUCCEEDED:
                    $notification = new NotificationSucceeded($requestBody);
                    break;
                case NotificationEventType::PAYMENT_WAITING_FOR_CAPTURE:
                    $notification = new NotificationWaitingForCapture($requestBody);
                    break;
                case NotificationEventType::PAYMENT_CANCELED:
                    $notification = new NotificationCanceled($requestBody);
                    break;
                case NotificationEventType::REFUND_SUCCEEDED:
                    $notification = new NotificationRefundSucceeded($requestBody);
                    break;
                default:
                    throw new \Exception('Unknown event type');
            }

            // Get the payment object
            $payment = $notification->getObject();

            return $payment;
        } catch (\Exception $e) {
            // Handle errors if data is invalid
            Log::error('Webhook processing error', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
