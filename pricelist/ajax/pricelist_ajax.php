<?php
/**
 * Enhanced Pricelist AJAX Handler
 * Path: /public_html/pricelist/ajax/pricelist_ajax.php
 * 
 * Smart Search API
 */

require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$action = $_REQUEST['action'] ?? '';

// ============================================
// SMART SEARCH - Fuzzy search across all fields
// ============================================
if ($action == 'smart_search') {
    try {
        $query = $_GET['q'] ?? '';
        
        if (strlen($query) < 2) {
            echo json_encode(['success' => false, 'data' => []]);
            exit;
        }
        
        // Split query into words for better matching
        $words = preg_split('/\s+/', trim($query));
        $conditions = [];
        $params = [];
        
        foreach ($words as $word) {
            $searchTerm = '%' . $word . '%';
            $conditions[] = "(
                p.type LIKE ? OR 
                m.nama_merek LIKE ? OR 
                k.nama_kategori LIKE ? OR
                CONCAT(m.nama_merek, ' ', p.type) LIKE ?
            )";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $whereClause = implode(' AND ', $conditions);
        
        $sql = "SELECT 
                    p.id,
                    p.type,
                    p.foto_filename,
                    k.nama_kategori,
                    m.nama_merek,
                    CONCAT(m.nama_merek, ' ', p.type) as display_name,
                    COUNT(v.id) as variasi_count,
                    MIN(v.harga_jual) as price_min,
                    MAX(v.harga_jual) as price_max
                FROM persediaan_produk p
                JOIN persediaan_kategori k ON p.id_kategori = k.id
                JOIN persediaan_merek m ON p.id_merek = m.id
                LEFT JOIN persediaan_variasi v ON v.id_produk = p.id
                WHERE {$whereClause}
                GROUP BY p.id
                ORDER BY 
                    CASE 
                        WHEN CONCAT(m.nama_merek, ' ', p.type) LIKE ? THEN 1
                        WHEN p.type LIKE ? THEN 2
                        WHEN m.nama_merek LIKE ? THEN 3
                        ELSE 4
                    END,
                    m.nama_merek, p.type
                LIMIT 30";
        
        // Add ordering params
        $orderTerm = $query . '%';
        $params[] = $orderTerm;
        $params[] = $orderTerm;
        $params[] = $orderTerm;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $results,
            'query' => $query
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage(),
            'data' => []
        ]);
    }
    exit;
}

// ============================================
// GET MEREK BY KATEGORI
// ============================================
if ($action == 'get_merek') {
    try {
        $idKategori = $_GET['id_kategori'] ?? 0;
        
        $stmt = $pdo->prepare("
            SELECT DISTINCT m.id, m.nama_merek 
            FROM persediaan_merek m
            INNER JOIN persediaan_produk p ON p.id_merek = m.id
            WHERE m.id_kategori = ?
            ORDER BY m.nama_merek
        ");
        $stmt->execute([$idKategori]);
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        echo json_encode([]);
    }
    exit;
}

// ============================================
// GET TYPE BY KATEGORI & MEREK
// ============================================
if ($action == 'get_type') {
    try {
        $idKategori = $_GET['id_kategori'] ?? 0;
        $idMerek = $_GET['id_merek'] ?? '';
        
        $sql = "SELECT p.id, p.type 
                FROM persediaan_produk p
                WHERE p.id_kategori = ?";
        $params = [$idKategori];
        
        if (!empty($idMerek)) {
            $sql .= " AND p.id_merek = ?";
            $params[] = $idMerek;
        }
        
        $sql .= " ORDER BY p.type";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        echo json_encode([]);
    }
    exit;
}

// ============================================
// GET PRICELIST DATA
// ============================================
if ($action == 'get_pricelist') {
    try {
        $idKategori = $_GET['id_kategori'] ?? '';
        $idMerek = $_GET['id_merek'] ?? '';
        $idProduk = $_GET['id_produk'] ?? '';
        $search = $_GET['search'] ?? '';
        
        $sql = "SELECT 
                    p.id as produk_id,
                    p.type,
                    p.foto_filename,
                    k.nama_kategori,
                    m.nama_merek,
                    v.id as variasi_id,
                    v.nama_variasi,
                    v.harga_jual,
                    v.garansi_angka,
                    v.garansi_satuan,
                    v.deskripsi,
                    v.urutan
                FROM persediaan_produk p
                JOIN persediaan_kategori k ON p.id_kategori = k.id
                JOIN persediaan_merek m ON p.id_merek = m.id
                JOIN persediaan_variasi v ON v.id_produk = p.id
                WHERE 1=1";
        
        $params = [];
        
        if (!empty($idKategori)) {
            $sql .= " AND p.id_kategori = ?";
            $params[] = $idKategori;
        }
        
        if (!empty($idMerek)) {
            $sql .= " AND p.id_merek = ?";
            $params[] = $idMerek;
        }
        
        if (!empty($idProduk)) {
            $sql .= " AND p.id = ?";
            $params[] = $idProduk;
        }
        
        if (!empty($search)) {
            $words = preg_split('/\s+/', trim($search));
            foreach ($words as $word) {
                $searchTerm = '%' . $word . '%';
                $sql .= " AND (p.type LIKE ? OR m.nama_merek LIKE ? OR k.nama_kategori LIKE ?)";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
        }
        
        if (empty($idKategori) && empty($idMerek) && empty($idProduk) && empty($search)) {
            echo json_encode([
                'success' => false,
                'message' => 'Pilih minimal satu filter',
                'data' => []
            ]);
            exit;
        }
        
        $sql .= " ORDER BY p.type, v.urutan LIMIT 150";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $info = [
            'total_variasi' => count($results),
            'total_produk' => count(array_unique(array_column($results, 'produk_id'))),
            'kategori' => '',
            'merek' => ''
        ];
        
        if (!empty($idKategori)) {
            $stmtK = $pdo->prepare("SELECT nama_kategori FROM persediaan_kategori WHERE id = ?");
            $stmtK->execute([$idKategori]);
            $info['kategori'] = $stmtK->fetchColumn() ?: '';
        }
        
        if (!empty($idMerek)) {
            $stmtM = $pdo->prepare("SELECT nama_merek FROM persediaan_merek WHERE id = ?");
            $stmtM->execute([$idMerek]);
            $info['merek'] = $stmtM->fetchColumn() ?: '';
        }
        
        echo json_encode([
            'success' => true,
            'data' => $results,
            'info' => $info
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage(),
            'data' => []
        ]);
    }
    exit;
}

// ============================================
// GET ALL KATEGORI
// ============================================
if ($action == 'get_kategori') {
    try {
        $stmt = $pdo->query("SELECT id, nama_kategori FROM persediaan_kategori ORDER BY nama_kategori");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        echo json_encode([]);
    }
    exit;
}

// ============================================
// GET PRODUCT DETAIL
// ============================================
if ($action == 'get_detail') {
    try {
        $idProduk = $_GET['id'] ?? 0;
        
        $stmtP = $pdo->prepare("
            SELECT p.*, k.nama_kategori, m.nama_merek
            FROM persediaan_produk p
            JOIN persediaan_kategori k ON p.id_kategori = k.id
            JOIN persediaan_merek m ON p.id_merek = m.id
            WHERE p.id = ?
        ");
        $stmtP->execute([$idProduk]);
        $produk = $stmtP->fetch(PDO::FETCH_ASSOC);
        
        if (!$produk) {
            echo json_encode(['success' => false, 'message' => 'Produk tidak ditemukan']);
            exit;
        }
        
        $stmtV = $pdo->prepare("SELECT * FROM persediaan_variasi WHERE id_produk = ? ORDER BY urutan");
        $stmtV->execute([$idProduk]);
        $variasi = $stmtV->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'produk' => $produk,
            'variasi' => $variasi
        ]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// DEFAULT
echo json_encode(['success' => false, 'message' => 'Invalid action']);