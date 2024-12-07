<?php

$partnerToken = 'rpxh9hw6sjakpdsha6r3';

$ch = curl_init();

$url = 'https://api.yclients.com/api/v1/companies';

// Пробуем получить все компании сети
$params = [
    'active' => 1,
    'group_id' => 287780  // ID сети Cherrytown, который мы уже знаем
];

$url .= '?' . http_build_query($params);

curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $partnerToken,  // Только partner_token
        'Accept: application/vnd.yclients.v2+json',
        'Content-Type: application/json'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($error = curl_error($ch)) {
    echo "CURL Error: " . $error . "\n";
}

curl_close($ch);

echo "URL: " . $url . "\n\n";
echo "HTTP Code: " . $httpCode . "\n\n";
echo "Response:\n";
$decoded = json_decode($response, true);

if (!empty($decoded['data'])) {
    foreach ($decoded['data'] as $company) {
        echo "\nКомпания ID: " . $company['id'] . "\n";
        echo "Название: " . $company['title'] . "\n";
        echo "Адрес: " . $company['address'] . "\n";
        echo "Телефон: " . $company['phone'] . "\n";
        echo "Сеть: " . ($company['main_group']['title'] ?? 'Нет данных') . " (ID: " . ($company['main_group']['id'] ?? 'Нет данных') . ")\n";
        echo "------------------------\n";
    }
} else {
    echo "Филиалы не найдены или ошибка в ответе:\n";
    print_r($decoded);
}