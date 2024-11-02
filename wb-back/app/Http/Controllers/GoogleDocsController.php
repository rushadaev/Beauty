<?php

namespace App\Http\Controllers;

use Google_Client;
use Google_Service_Docs;
use Google_Service_Docs_BatchUpdateDocumentRequest;
use Illuminate\Http\Request;

class GoogleDocsController extends Controller
{
    public function replaceVariablesInDoc(Request $request)
    {
        // Path to your Google API credentials JSON file
        $serviceAccountPath = storage_path('app/google/credentials.json');
        
        // Create and configure Google Client
        $client = new Google_Client();
        $client->setAuthConfig($serviceAccountPath);
        $client->addScope('https://www.googleapis.com/auth/documents');

        // Initialize Google Docs service
        $service = new Google_Service_Docs($client);



        // Extract document ID from the URL
        $documentUrl = $request->input('documentId');
        preg_match('/\/d\/([^\/]+)/', $documentUrl, $matches);

        if (empty($matches[1])) {
            return response()->json(['error' => 'Invalid Google Docs URL'], 400);
        }

        $documentId = $matches[1];

        // Define the replacements from the request
        $replacements = [];
        for ($i = 1; $i <= 11; $i++) {
            $variableKey = 'var' . $i;
            $variableValue = $request->input($variableKey);
            if ($variableValue) {
                // Match (переменная 1)...(переменная 11) with the actual values provided in the request
                $replacements["(переменная $i)"] = $variableValue;
            }
        }

        // Prepare requests for batchUpdate
        $requests = [];
        foreach ($replacements as $key => $value) {
            $requests[] = new \Google_Service_Docs_Request([
                'replaceAllText' => [
                    'containsText' => [
                        'text' => $key,
                        'matchCase' => true,
                    ],
                    'replaceText' => $value,
                ],
            ]);
        }

        // Create a BatchUpdateDocumentRequest instance
        $batchUpdateRequest = new Google_Service_Docs_BatchUpdateDocumentRequest();
        $batchUpdateRequest->setRequests($requests);

        // Execute batchUpdate request
        try {
            $result = $service->documents->batchUpdate($documentId, $batchUpdateRequest);
            return response()->json(['message' => 'Replacements complete', 'result' => $result]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
