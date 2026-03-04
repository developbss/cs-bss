<?php
/**
 * Enhanced Pricelist BSS Service HP Lumajang
 * Path: /public_html/pricelist/index.php
 * * Smart Search + Premium 3D Card Design (Apple-inspired)
 */

require_once 'config.php';

// Get categories for manual filter
$categories = [];
try {
    $stmt = $pdo->query("SELECT id, nama_kategori FROM persediaan_kategori ORDER BY nama_kategori");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // Silent fail
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pricelist - BSS Service hp lumajang</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            --bg-primary: #000000;
            --bg-secondary: #0a0a0a;
            --bg-card: #1a1a1a;
            --text-primary: #f5f5f7;
            --text-secondary: #86868b;
            --accent-blue: #2997ff;
            --gradient-header: linear-gradient(180deg, #1d1d1f 0%, #000000 100%);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background: var(--bg-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text-primary);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        /* HEADER */
        .header-section {
            background: var(--gradient-header);
            padding: 20px 0;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: saturate(180%) blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo {
            font-size: 21px;
            font-weight: 600;
            letter-spacing: -0.5px;
        }

        .logo span { color: var(--text-secondary); font-weight: 400; }

        /* SEARCH SECTION */
        .search-section {
            padding: 60px 0 40px 0;
            text-align: center;
        }

        .search-title {
            font-size: 56px;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 8px;
            background: linear-gradient(180deg, #ffffff 0%, #a1a1a6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .search-subtitle {
            font-size: 21px;
            color: var(--text-secondary);
            margin-bottom: 40px;
        }

        .smart-search-container {
            max-width: 680px;
            margin: 0 auto;
            position: relative;
        }

        .smart-search-input {
            width: 100%;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 16px;
            padding: 20px 56px;
            font-size: 17px;
            color: var(--text-primary);
            transition: all 0.3s;
            outline: none;
        }

        .smart-search-input::placeholder { color: var(--text-secondary); }

        .smart-search-input:focus {
            background: rgba(255,255,255,0.12);
            border-color: var(--accent-blue);
            box-shadow: 0 0 0 4px rgba(41, 151, 255, 0.15);
        }

        .search-icon {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            font-size: 18px;
        }

        .search-clear {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .search-clear.show { opacity: 1; }
        .search-clear:hover { background: rgba(255,255,255,0.2); }

        /* SEARCH SUGGESTIONS */
        .search-suggestions {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: #1d1d1f;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            display: none;
            z-index: 1000;
            max-height: 420px;
            overflow-y: auto;
        }

        .search-suggestions.show { display: block; }

        .suggestion-group {
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .suggestion-group:last-child { border-bottom: none; }

        .suggestion-group-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 4px 20px 8px 20px;
        }

        .suggestion-item {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            cursor: pointer;
            transition: background 0.15s;
        }

        .suggestion-item:hover, .suggestion-item.active {
            background: rgba(41, 151, 255, 0.12);
        }

        .suggestion-icon {
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.06);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 14px;
            color: var(--text-secondary);
        }

        .suggestion-content { flex: 1; }

        .suggestion-title {
            font-size: 15px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 2px;
        }

        .suggestion-title mark {
            background: transparent;
            color: var(--accent-blue);
            font-weight: 600;
        }

        .suggestion-meta { font-size: 13px; color: var(--text-secondary); }

        .suggestion-price { font-size: 14px; font-weight: 600; color: var(--accent-blue); }

        /* FILTER TOGGLE */
        .filter-toggle {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 20px;
            padding: 10px 20px;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 100px;
            color: var(--text-secondary);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .filter-toggle:hover {
            background: rgba(255,255,255,0.05);
            color: var(--text-primary);
        }

        .filter-toggle i:last-child { transition: transform 0.3s; }
        .filter-toggle.active i:last-child { transform: rotate(180deg); }

        /* MANUAL FILTER PANEL */
        .manual-filter-panel {
            max-width: 900px;
            margin: 30px auto 0 auto;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            padding: 24px;
            display: none;
        }

        .manual-filter-panel.show {
            display: block;
            animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .filter-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }

        .filter-group label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .filter-group select {
            width: 100%;
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            padding: 14px 40px 14px 16px;
            font-size: 15px;
            color: var(--text-primary);
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2386868b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
        }

        .filter-group select:focus {
            outline: none;
            border-color: var(--accent-blue);
        }

        .filter-group select option {
            background: #1d1d1f;
            color: var(--text-primary);
        }

        /* RESULTS */
        .results-section { padding: 40px 0 80px 0; }

        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .results-info { font-size: 17px; color: var(--text-secondary); }
        .results-info strong { color: var(--text-primary); }
        .results-count { font-size: 15px; color: var(--text-secondary); }

        /* PREMIUM 3D CARDS */
        .product-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
        }

        @media (max-width: 1200px) { .product-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) { 
            .product-grid { grid-template-columns: 1fr; }
            .filter-row { grid-template-columns: 1fr 1fr; }
            .search-title { font-size: 36px; }
        }

        /* Premium Card Base */
        .premium-card {
            position: relative;
            border-radius: 28px;
            overflow: hidden;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transform-style: preserve-3d;
        }

        .premium-card:hover {
            transform: translateY(-16px) scale(1.02);
        }

        /* TIER 1 - SILVER/COMMON */
        .premium-card.tier-1 {
            background: linear-gradient(165deg, #3a3a3c 0%, #1c1c1e 50%, #2c2c2e 100%);
            box-shadow: 
                0 20px 60px rgba(0,0,0,0.4),
                0 0 0 1px rgba(255,255,255,0.1),
                inset 0 1px 0 rgba(255,255,255,0.15),
                inset 0 -1px 0 rgba(0,0,0,0.3);
        }

        .premium-card.tier-1:hover {
            box-shadow: 
                0 40px 100px rgba(0,0,0,0.5),
                0 0 0 1px rgba(255,255,255,0.2),
                inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .premium-card.tier-1::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
            pointer-events: none;
            z-index: 1;
        }

        .tier-1 .tier-badge {
            background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%);
            color: #1f2937;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5);
        }

        .tier-1 .price-amount { color: #ffffff; }

        .tier-1 .specs-list li::before {
            background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
        }

        /* TIER 2 - BLUE/EPIC */
        .premium-card.tier-2 {
            background: linear-gradient(165deg, #1e3a5f 0%, #0c1929 50%, #1a365d 100%);
            box-shadow: 
                0 20px 60px rgba(37, 99, 235, 0.2),
                0 0 0 1px rgba(59, 130, 246, 0.3),
                inset 0 1px 0 rgba(147, 197, 253, 0.2),
                inset 0 -1px 0 rgba(0,0,0,0.3);
        }

        .premium-card.tier-2:hover {
            box-shadow: 
                0 40px 100px rgba(37, 99, 235, 0.35),
                0 0 0 1px rgba(59, 130, 246, 0.5),
                0 0 80px rgba(59, 130, 246, 0.15),
                inset 0 1px 0 rgba(147, 197, 253, 0.3);
        }

        .premium-card.tier-2::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, transparent 100%);
            pointer-events: none;
            z-index: 1;
        }

        .tier-2 .tier-badge {
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
            color: #ffffff;
            box-shadow: 0 4px 25px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .tier-2 .price-amount {
            background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 50%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .tier-2 .specs-list li::before {
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
        }

        /* TIER 3 - GOLD/LEGENDARY */
        .premium-card.tier-3 {
            background: linear-gradient(165deg, #451a03 0%, #1c0a00 50%, #78350f 100%);
            box-shadow: 
                0 20px 60px rgba(217, 119, 6, 0.2),
                0 0 0 1px rgba(251, 191, 36, 0.3),
                inset 0 1px 0 rgba(253, 224, 71, 0.2),
                inset 0 -1px 0 rgba(0,0,0,0.3);
        }

        .premium-card.tier-3:hover {
            box-shadow: 
                0 40px 100px rgba(217, 119, 6, 0.35),
                0 0 0 1px rgba(251, 191, 36, 0.5),
                0 0 80px rgba(251, 191, 36, 0.15),
                inset 0 1px 0 rgba(253, 224, 71, 0.3);
        }

        .premium-card.tier-3::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: linear-gradient(180deg, rgba(251, 191, 36, 0.12) 0%, transparent 100%);
            pointer-events: none;
            z-index: 1;
        }

        .tier-3 .tier-badge {
            background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%);
            color: #1c0a00;
            box-shadow: 0 4px 25px rgba(217, 119, 6, 0.5), inset 0 1px 0 rgba(255,255,255,0.4);
        }

        .tier-3 .price-amount {
            background: linear-gradient(135deg, #fde68a 0%, #fcd34d 50%, #f59e0b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .tier-3 .specs-list li::before {
            background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%);
        }

        /* Card Components */
        .tier-badge {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 24px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            z-index: 10;
            white-space: nowrap;
        }

        .card-image-container {
            position: relative;
            height: 220px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 55px 30px 25px 30px;
            background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
        }

        .card-image {
            max-width: 180px;
            max-height: 180px;
            width: auto;
            height: auto;
            object-fit: contain;
            filter: drop-shadow(0 25px 50px rgba(0,0,0,0.5));
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 2;
        }

        .premium-card:hover .card-image {
            transform: scale(1.1) translateY(-8px);
        }

        .no-image-placeholder {
            width: 120px;
            height: 120px;
            background: rgba(255,255,255,0.03);
            border-radius: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
        }

        .no-image-placeholder i { font-size: 36px; margin-bottom: 8px; opacity: 0.4; }
        .no-image-placeholder span { font-size: 12px; opacity: 0.4; }

        .card-body-content {
            padding: 20px 28px 32px 28px;
            position: relative;
            z-index: 2;
        }

        .price-tag { text-align: center; margin-bottom: 24px; }

        .price-amount {
            font-size: 42px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1;
        }

        .price-amount small { font-size: 22px; font-weight: 700; }

        .specs-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .specs-list li {
            display: flex;
            align-items: flex-start;
            padding: 10px 0;
            font-size: 14px;
            font-weight: 500;
            color: rgba(255,255,255,0.85);
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .specs-list li:last-child { border-bottom: none; }

        .specs-list li::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-right: 14px;
            margin-top: 7px;
            flex-shrink: 0;
        }

        /* Not Available */
        .premium-card.not-available {
            opacity: 0.5;
            filter: grayscale(0.5);
        }

        .premium-card.not-available:hover { transform: none; }

        /* STATES */
        .initial-state, .loading-state, .empty-state {
            text-align: center;
            padding: 100px 20px;
        }

        .state-icon {
            font-size: 64px;
            margin-bottom: 24px;
            background: linear-gradient(135deg, var(--text-secondary) 0%, #4a4a4f 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .state-title {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 12px;
        }

        .state-description {
            font-size: 17px;
            color: var(--text-secondary);
            max-width: 400px;
            margin: 0 auto;
        }

        .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: var(--accent-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px auto;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* FOOTER */
        .footer {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
            font-size: 13px;
            border-top: 1px solid rgba(255,255,255,0.08);
        }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
    </style>
</head>
<body>

<!-- Header -->
<header class="header-section">
    <div class="container">
        <div class="d-flex justify-content-between align-items-center">
            <div class="logo">BSS <span>iPhone & android Repair</span></div>
            <span class="text-secondary small">
                <i class="fas fa-map-marker-alt me-1"></i> Jl. Suwandak - Lumajang
            </span>
        </div>
    </div>
</header>

<!-- Smart Search Section -->
<section class="search-section">
    <div class="container">
        <h1 class="search-title">Cari Layanan</h1>
        <p class="search-subtitle">Ketik type HP, merek, atau jenis sparepart</p>
        
        <div class="smart-search-container">
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="smartSearch" class="smart-search-input" 
                   placeholder="Contoh: iPhone 13 Pro, Samsung A54 LCD..." autocomplete="off">
            <div class="search-clear" id="searchClear"><i class="fas fa-times"></i></div>
            <div class="search-suggestions" id="searchSuggestions"></div>
        </div>
        
        <button class="filter-toggle" id="filterToggle">
            <i class="fas fa-sliders-h"></i>
            <span>Filter Manual</span>
            <i class="fas fa-chevron-down"></i>
        </button>
        
        <div class="manual-filter-panel" id="manualFilterPanel">
            <div class="filter-row">
                <div class="filter-group">
                    <label>Kategori</label>
                    <select id="filterKategori">
                        <option value="">Semua Kategori</option>
                        <?php foreach ($categories as $cat): ?>
                        <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['nama_kategori']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Sub Kategori</label>
                    <select id="filterMerek" disabled>
                        <option value="">Pilih SubKategori</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Type</label>
                    <select id="filterType" disabled>
                        <option value="">Pilih Type</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>&nbsp;</label>
                    <button class="btn w-100" onclick="applyManualFilter()" 
                            style="background: var(--accent-blue); color: white; border: none; border-radius: 12px; padding: 14px; font-weight: 600;">
                        <i class="fas fa-search me-2"></i>Cari
                    </button>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Results Section -->
<section class="results-section">
    <div class="container">
        <div class="results-header" id="resultsHeader" style="display: none;">
            <div class="results-info" id="resultsInfo"></div>
            <div class="results-count" id="resultsCount"></div>
        </div>
        <div id="resultsContainer">
            <div class="initial-state">
                <div class="state-icon"><i class="fas fa-search"></i></div>
                <h3 class="state-title">Mulai Pencarian</h3>
                <p class="state-description">Ketik type HP atau sparepart di kotak pencarian untuk melihat daftar harga.</p>
            </div>
        </div>
    </div>
</section>

<footer class="footer">
    <div class="container">
        <p><strong>BSS.id Repair iPhone & android</strong></p>
        <p>© <?= date('Y') ?> BSS.id Digital Manajemen</p>
    </div>
</footer>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script>
$(document).ready(function() {
    let searchTimeout;
    let currentSuggestionIndex = -1;

    // SMART SEARCH
    $('#smartSearch').on('input', function() {
        const query = $(this).val().trim();
        
        if (query.length > 0) {
            $('#searchClear').addClass('show');
        } else {
            $('#searchClear').removeClass('show');
            $('#searchSuggestions').removeClass('show');
            return;
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) fetchSuggestions(query);
        }, 200);
    });

    $('#searchClear').on('click', function() {
        $('#smartSearch').val('').focus();
        $(this).removeClass('show');
        $('#searchSuggestions').removeClass('show');
    });

    $('#smartSearch').on('keydown', function(e) {
        const $items = $('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, $items.length - 1);
            $items.removeClass('active');
            if (currentSuggestionIndex >= 0) $items.eq(currentSuggestionIndex).addClass('active');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
            $items.removeClass('active');
            if (currentSuggestionIndex >= 0) $items.eq(currentSuggestionIndex).addClass('active');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSuggestionIndex >= 0) $items.eq(currentSuggestionIndex).click();
            else searchAll($('#smartSearch').val().trim());
        } else if (e.key === 'Escape') {
            $('#searchSuggestions').removeClass('show');
        }
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('.smart-search-container').length) {
            $('#searchSuggestions').removeClass('show');
        }
    });

    function fetchSuggestions(query) {
        $.ajax({
            url: 'ajax/pricelist_ajax.php',
            data: { action: 'smart_search', q: query },
            dataType: 'json',
            success: function(res) {
                if (res.success && res.data) renderSuggestions(res.data, query);
            }
        });
    }

    function renderSuggestions(data, query) {
        currentSuggestionIndex = -1;
        let html = '';
        
        const grouped = {};
        data.forEach(item => {
            if (!grouped[item.nama_kategori]) grouped[item.nama_kategori] = [];
            grouped[item.nama_kategori].push(item);
        });

        Object.keys(grouped).forEach(kategori => {
            html += `<div class="suggestion-group"><div class="suggestion-group-title">${kategori}</div>`;
            
            grouped[kategori].slice(0, 5).forEach(item => {
                const title = highlightMatch(item.display_name, query);
                const price = item.price_min === item.price_max 
                    ? formatPrice(item.price_min)
                    : formatPrice(item.price_min) + ' - ' + formatPrice(item.price_max);
                
                // FIXED: Replaced raw dot character with HTML entity &bull; to prevent encoding issues
                html += `
                    <div class="suggestion-item" data-id="${item.id}" data-type="produk">
                        <div class="suggestion-icon"><i class="fas fa-mobile-alt"></i></div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${title}</div>
                            <div class="suggestion-meta">${item.nama_merek} &bull; ${item.variasi_count} variasi</div>
                        </div>
                        <div class="suggestion-price">${price}</div>
                    </div>
                `;
            });
            html += `</div>`;
        });

        if (data.length === 0) {
            html = `<div class="p-4 text-center text-secondary">
                <i class="fas fa-search mb-2" style="font-size: 24px; opacity: 0.5;"></i>
                <p class="mb-0">Tidak ditemukan untuk "${escapeHtml(query)}"</p>
            </div>`;
        } else {
            html += `
                <div class="suggestion-item" data-type="search-all" style="border-top: 1px solid rgba(255,255,255,0.1);">
                    <div class="suggestion-icon" style="background: rgba(41, 151, 255, 0.15);">
                        <i class="fas fa-search" style="color: var(--accent-blue);"></i>
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">Tampilkan semua hasil untuk "${escapeHtml(query)}"</div>
                        <div class="suggestion-meta">${data.length} produk ditemukan</div>
                    </div>
                </div>
            `;
        }

        $('#searchSuggestions').html(html).addClass('show');
    }

    $(document).on('click', '.suggestion-item', function() {
        const type = $(this).data('type');
        if (type === 'search-all') searchAll($('#smartSearch').val().trim());
        else loadProductDetail($(this).data('id'));
        $('#searchSuggestions').removeClass('show');
    });

    function searchAll(query) {
        if (!query) return;
        showLoading();
        $.ajax({
            url: 'ajax/pricelist_ajax.php',
            data: { action: 'get_pricelist', search: query },
            dataType: 'json',
            success: function(res) {
                if (res.success && res.data && res.data.length > 0) renderResults(res.data, res.info);
                else showEmpty(query);
            },
            error: showError
        });
    }

    function loadProductDetail(productId) {
        showLoading();
        $.ajax({
            url: 'ajax/pricelist_ajax.php',
            data: { action: 'get_pricelist', id_produk: productId },
            dataType: 'json',
            success: function(res) {
                if (res.success && res.data && res.data.length > 0) renderResults(res.data, res.info);
                else showEmpty();
            }
        });
    }

    // MANUAL FILTER
    $('#filterToggle').on('click', function() {
        $(this).toggleClass('active');
        $('#manualFilterPanel').toggleClass('show');
    });

    $('#filterKategori').on('change', function() {
        const id = $(this).val();
        $('#filterMerek').html('<option value="">Pilih Merek</option>').prop('disabled', true);
        $('#filterType').html('<option value="">Pilih Type</option>').prop('disabled', true);
        if (!id) return;
        
        $.getJSON('ajax/pricelist_ajax.php', { action: 'get_merek', id_kategori: id }, function(data) {
            let opts = '<option value="">Semua Sub Kategori</option>';
            data.forEach(m => opts += `<option value="${m.id}">${m.nama_merek}</option>`);
            $('#filterMerek').html(opts).prop('disabled', false);
        });
    });

    $('#filterMerek').on('change', function() {
        const katId = $('#filterKategori').val();
        const merkId = $(this).val();
        $('#filterType').html('<option value="">Pilih Type</option>').prop('disabled', true);
        if (!katId) return;
        
        $.getJSON('ajax/pricelist_ajax.php', { action: 'get_type', id_kategori: katId, id_merek: merkId || '' }, function(data) {
            let opts = '<option value="">Semua Type</option>';
            data.forEach(t => opts += `<option value="${t.id}">${t.type}</option>`);
            $('#filterType').html(opts).prop('disabled', false);
        });
    });

    window.applyManualFilter = function() {
        const k = $('#filterKategori').val(), m = $('#filterMerek').val(), t = $('#filterType').val();
        if (!k && !m && !t) { alert('Pilih minimal satu filter'); return; }
        
        showLoading();
        $.ajax({
            url: 'ajax/pricelist_ajax.php',
            data: { action: 'get_pricelist', id_kategori: k, id_merek: m, id_produk: t },
            dataType: 'json',
            success: function(res) {
                if (res.success && res.data && res.data.length > 0) renderResults(res.data, res.info);
                else showEmpty();
            }
        });
    };

    // RENDER RESULTS
    function renderResults(data, info) {
        const products = {};
        data.forEach(item => {
            if (!products[item.produk_id]) {
                products[item.produk_id] = {
                    id: item.produk_id,
                    type: item.type,
                    foto_filename: item.foto_filename,
                    nama_kategori: item.nama_kategori,
                    nama_merek: item.nama_merek,
                    variasi: []
                };
            }
            products[item.produk_id].variasi.push(item);
        });

        $('#resultsHeader').show();
        // FIXED: Replaced raw dot character with HTML entity &bull; to prevent encoding issues
        $('#resultsInfo').html(`<strong>${info.merek || ''} ${Object.values(products)[0]?.type || ''}</strong> ${info.kategori ? '&bull; ' + info.kategori : ''}`);
        $('#resultsCount').text(`${info.total_variasi} variasi dari ${info.total_produk} produk`);

        let html = '<div class="product-grid">';
        
        Object.values(products).forEach(product => {
            product.variasi.sort((a, b) => a.urutan - b.urutan);
            
            product.variasi.forEach((v, idx) => {
                const tier = (idx % 3) + 1;
                const isAvailable = v.harga_jual > 0;
                const katSlug = product.nama_kategori.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                
                // MODIFIED: Replace .jpg with .png in the image path logic
                const imgPath = `assets/img/${katSlug}/${product.foto_filename.replace('.jpg', '.png')}`;
                
                let specs = [product.type];
                if (v.garansi_angka > 0) specs.push(`Garansi ${v.garansi_angka} ${v.garansi_satuan}`);
                if (v.deskripsi) specs = specs.concat(v.deskripsi.split('\n').filter(s => s.trim()));

                const price = isAvailable ? 'Rp ' + new Intl.NumberFormat('id-ID').format(v.harga_jual) : 'Tidak Tersedia';

                html += `
                    <div class="premium-card tier-${tier} ${!isAvailable ? 'not-available' : ''}">
                        <div class="tier-badge">${escapeHtml(v.nama_variasi)}</div>
                        <div class="card-image-container">
                            <img src="${imgPath}" alt="${product.type}" class="card-image"
                                 onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'no-image-placeholder\\'><i class=\\'fas fa-mobile-alt\\'></i><span>No Image</span></div>';">
                        </div>
                        <div class="card-body-content">
                            <div class="price-tag">
                                <div class="price-amount">${isAvailable ? price : '<span style=\"font-size:24px;color:var(--text-secondary);\">Tidak Tersedia</span>'}</div>
                            </div>
                            <ul class="specs-list">
                                ${specs.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            });
        });
        
        html += '</div>';
        $('#resultsContainer').html(html);
    }

    // STATES
    function showLoading() {
        $('#resultsHeader').hide();
        $('#resultsContainer').html(`
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <h3 class="state-title">Memuat Data</h3>
                <p class="state-description">Mohon tunggu...</p>
            </div>
        `);
    }

    function showEmpty(query = '') {
        $('#resultsHeader').hide();
        $('#resultsContainer').html(`
            <div class="empty-state">
                <div class="state-icon"><i class="fas fa-inbox"></i></div>
                <h3 class="state-title">Tidak Ada Hasil</h3>
                <p class="state-description">${query ? 'Tidak ditemukan untuk "' + escapeHtml(query) + '"' : 'Tidak ada produk yang sesuai.'}</p>
            </div>
        `);
    }

    function showError() {
        $('#resultsHeader').hide();
        $('#resultsContainer').html(`
            <div class="empty-state">
                <div class="state-icon" style="color:#ef4444;"><i class="fas fa-exclamation-triangle"></i></div>
                <h3 class="state-title">Terjadi Kesalahan</h3>
                <p class="state-description">Gagal memuat data.</p>
            </div>
        `);
    }

    // HELPERS
    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatPrice(p) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(p); }
});
</script>
</body>
</html>