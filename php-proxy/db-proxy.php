<?php
/**
 * BSS MySQL Proxy API
 * -------------------
 * Place this file on the same server as MySQL (mybss.cloud or cPanel hosting).
 * Vercel calls this via HTTPS instead of connecting to MySQL directly.
 * This bypasses firewall/IP restrictions since it's localhost → MySQL.
 *
 * Security: Uses a shared secret key (API_KEY) to prevent unauthorized access.
 */

// CORS headers for Vercel
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ======= CONFIGURATION =======
$API_KEY   = 'BSS_PROXY_2025_SECRET_KEY_CHANGE_THIS'; // Change this to a strong random key
$DB_HOST   = 'localhost';
$DB_NAME   = 'mybe5217_bss';
$DB_USER   = 'mybe5217_bss';
$DB_PASS   = 'bss2025';
// ==============================

// Verify API key
$requestKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($requestKey !== $API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid API key']);
    exit;
}

// Parse request body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['query'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing query']);
    exit;
}

$query  = $input['query'];
$params = $input['params'] ?? [];

// Security: Block dangerous queries (only allow SELECT, SHOW, DESCRIBE)
$queryTrimmed = strtoupper(trim($query));
$allowed = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC'];
$isAllowed = false;
foreach ($allowed as $prefix) {
    if (strpos($queryTrimmed, $prefix) === 0) {
        $isAllowed = true;
        break;
    }
}

// Also allow ALTER TABLE for account route (adding columns)
if (strpos($queryTrimmed, 'ALTER TABLE') === 0) {
    $isAllowed = true;
}

// Also allow UPDATE for account route
if (strpos($queryTrimmed, 'UPDATE') === 0) {
    $isAllowed = true;
}

// Also allow INSERT for account route (new customer registration)
if (strpos($queryTrimmed, 'INSERT') === 0) {
    $isAllowed = true;
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['error' => 'Query type not allowed', 'hint' => 'Only SELECT, SHOW, ALTER, UPDATE, INSERT allowed']);
    exit;
}

try {
    // Connect via localhost (no firewall issues!)
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false, // Use native prepared statements (important for LIMIT/OFFSET int binding)
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
            PDO::ATTR_TIMEOUT => 10,
        ]
    );

    $stmt = $pdo->prepare($query);

    // Bind parameters with correct types
    // PDO::execute() treats all params as string, which breaks LIMIT/OFFSET
    // We must bind individually with PDO::PARAM_INT for numeric values
    foreach ($params as $i => $val) {
        $paramIndex = $i + 1; // PDO uses 1-based index for positional params
        if (is_int($val) || (is_string($val) && ctype_digit($val) && strlen($val) < 10)) {
            $stmt->bindValue($paramIndex, (int)$val, PDO::PARAM_INT);
        } elseif (is_null($val)) {
            $stmt->bindValue($paramIndex, null, PDO::PARAM_NULL);
        } elseif (is_bool($val)) {
            $stmt->bindValue($paramIndex, $val, PDO::PARAM_BOOL);
        } else {
            $stmt->bindValue($paramIndex, $val, PDO::PARAM_STR);
        }
    }

    $stmt->execute();

    // For SELECT/SHOW queries, return rows
    if (strpos($queryTrimmed, 'SELECT') === 0 || strpos($queryTrimmed, 'SHOW') === 0 || strpos($queryTrimmed, 'DESCRIBE') === 0 || strpos($queryTrimmed, 'DESC ') === 0) {
        $rows = $stmt->fetchAll();
        echo json_encode([
            'ok'   => true,
            'rows' => $rows,
            'count' => count($rows),
        ]);
    } else {
        // For INSERT/UPDATE/ALTER, return affected rows + last insert ID
        echo json_encode([
            'ok' => true,
            'affected' => $stmt->rowCount(),
            'insertId' => $pdo->lastInsertId(),
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
    ]);
}
