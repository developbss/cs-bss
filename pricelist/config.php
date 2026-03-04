<?php
/**
 * Config Database untuk Pricelist
 * Path: /public_html/pricelist/config.php
 * 
 * Koneksi database untuk halaman pricelist (standalone)
 */

// Database Configuration
$host = 'localhost';
$dbname = 'mybe5217_bss';
$username = 'mybe5217';
$password = 'Lum44jang++'; // Ganti dengan password database Anda

// Timezone
date_default_timezone_set('Asia/Jakarta');

// PDO Connection
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    // Jika error di production, jangan tampilkan detail error
    if (php_sapi_name() === 'cli') {
        die("Database connection failed: " . $e->getMessage());
    } else {
        die("Database connection failed. Please contact administrator.");
    }
}

// Helper function untuk format rupiah
function formatRupiah($angka, $prefix = 'Rp ') {
    return $prefix . number_format($angka, 0, ',', '.');
}

// Helper function untuk slug
function createSlug($text) {
    $text = strtolower($text);
    $text = preg_replace('/[\s_]+/', '-', $text);
    $text = preg_replace('/[^a-z0-9\-]/', '', $text);
    $text = preg_replace('/-+/', '-', $text);
    return trim($text, '-');
}