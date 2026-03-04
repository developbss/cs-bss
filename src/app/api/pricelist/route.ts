import { NextRequest, NextResponse } from 'next/server';
import { queryMySQL } from '@/lib/mysql';

// Vercel serverless config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// GET /api/pricelist?action=categories
// GET /api/pricelist?action=brands&category_id=X
// GET /api/pricelist?action=search&q=iphone+lcd&page=1&limit=20
// GET /api/pricelist?action=products&category_id=X&brand_id=Y&page=1&limit=20
// GET /api/pricelist?action=detail&id=X

interface CategoryRow { id: number; nama_kategori: string; product_count: number; }
interface BrandRow { id: number; nama_merek: string; product_count: number; }
interface ProductRow {
  produk_id: number; type: string; foto_filename: string;
  nama_kategori: string; nama_merek: string;
  variasi_count: number; price_min: number; price_max: number;
}
interface VariasiRow {
  id: number; nama_variasi: string; harga_jual: number;
  garansi_angka: number; garansi_satuan: string; deskripsi: string; urutan: number;
}
interface ProdukDetailRow {
  id: number; type: string; foto_filename: string;
  nama_kategori: string; nama_merek: string;
}

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action') || '';

    // ========== CATEGORIES ==========
    if (action === 'categories') {
      const cats = await queryMySQL<CategoryRow>(`
        SELECT k.id, k.nama_kategori, COUNT(p.id) as product_count
        FROM persediaan_kategori k
        INNER JOIN persediaan_produk p ON p.id_kategori = k.id
        GROUP BY k.id, k.nama_kategori
        HAVING product_count > 0
        ORDER BY k.nama_kategori
      `);
      return NextResponse.json({ categories: cats }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    // ========== BRANDS BY CATEGORY ==========
    if (action === 'brands') {
      const categoryId = req.nextUrl.searchParams.get('category_id');
      if (!categoryId) return NextResponse.json({ error: 'category_id required' }, { status: 400 });

      const brands = await queryMySQL<BrandRow>(`
        SELECT DISTINCT m.id, m.nama_merek, COUNT(DISTINCT p.id) as product_count
        FROM persediaan_merek m
        INNER JOIN persediaan_produk p ON p.id_merek = m.id
        WHERE m.id_kategori = ?
        GROUP BY m.id
        ORDER BY m.nama_merek
      `, [categoryId]);
      return NextResponse.json({ brands }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    // ========== SMART SEARCH (paginated) ==========
    if (action === 'search') {
      const q = req.nextUrl.searchParams.get('q') || '';
      const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'));
      const limit = Math.min(50, Math.max(10, parseInt(req.nextUrl.searchParams.get('limit') || '20')));
      const offset = (page - 1) * limit;
      const categoryId = req.nextUrl.searchParams.get('category_id');
      const excludeCategories = req.nextUrl.searchParams.get('exclude_categories');

      if (q.length < 2) return NextResponse.json({ products: [], total: 0, page, pages: 0 });

      const words = q.trim().split(/\s+/);
      let whereClause = '';
      const params: string[] = [];

      words.forEach(word => {
        const term = `%${word}%`;
        whereClause += `${whereClause ? ' AND ' : ''}(p.type LIKE ? OR m.nama_merek LIKE ? OR k.nama_kategori LIKE ? OR CONCAT(m.nama_merek, ' ', p.type) LIKE ?)`;
        params.push(term, term, term, term);
      });

      // Filter by specific category if inside a category
      if (categoryId) {
        whereClause += ' AND p.id_kategori = ?';
        params.push(categoryId);
      }

      // Exclude hidden categories (comma-separated lowercase names)
      if (excludeCategories) {
        const excluded = excludeCategories.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
        if (excluded.length > 0) {
          const placeholders = excluded.map(() => '?').join(',');
          whereClause += ` AND LOWER(k.nama_kategori) NOT IN (${placeholders})`;
          params.push(...excluded);
        }
      }

      // Count total
      const countResult = await queryMySQL<{ total: number }>(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM persediaan_produk p
        JOIN persediaan_kategori k ON p.id_kategori = k.id
        JOIN persediaan_merek m ON p.id_merek = m.id
        WHERE ${whereClause}
      `, params);
      const total = countResult[0]?.total || 0;

      // Get paginated products
      const orderTerm = `${q}%`;
      const products = await queryMySQL<ProductRow>(`
        SELECT p.id as produk_id, p.type, p.foto_filename, k.nama_kategori, m.nama_merek,
               COUNT(v.id) as variasi_count, MIN(v.harga_jual) as price_min, MAX(v.harga_jual) as price_max
        FROM persediaan_produk p
        JOIN persediaan_kategori k ON p.id_kategori = k.id
        JOIN persediaan_merek m ON p.id_merek = m.id
        LEFT JOIN persediaan_variasi v ON v.id_produk = p.id
        WHERE ${whereClause}
        GROUP BY p.id
        ORDER BY
          CASE
            WHEN CONCAT(m.nama_merek, ' ', p.type) LIKE ? THEN 1
            WHEN p.type LIKE ? THEN 2
            WHEN m.nama_merek LIKE ? THEN 3
            ELSE 4
          END, m.nama_merek, p.type
        LIMIT ? OFFSET ?
      `, [...params, orderTerm, orderTerm, orderTerm, String(limit), String(offset)]);

      return NextResponse.json({
        products,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    }

    // ========== PRODUCTS BY CATEGORY/BRAND (paginated) ==========
    if (action === 'products') {
      const categoryId = req.nextUrl.searchParams.get('category_id');
      const brandId = req.nextUrl.searchParams.get('brand_id');
      const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'));
      const limit = Math.min(50, Math.max(10, parseInt(req.nextUrl.searchParams.get('limit') || '20')));
      const offset = (page - 1) * limit;

      if (!categoryId && !brandId) {
        return NextResponse.json({ error: 'category_id or brand_id required' }, { status: 400 });
      }

      let where = 'WHERE 1=1';
      const params: string[] = [];

      if (categoryId) { where += ' AND p.id_kategori = ?'; params.push(categoryId); }
      if (brandId) { where += ' AND p.id_merek = ?'; params.push(brandId); }

      const countResult = await queryMySQL<{ total: number }>(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM persediaan_produk p ${where}
      `, params);
      const total = countResult[0]?.total || 0;

      const products = await queryMySQL<ProductRow>(`
        SELECT p.id as produk_id, p.type, p.foto_filename, k.nama_kategori, m.nama_merek,
               COUNT(v.id) as variasi_count, MIN(v.harga_jual) as price_min, MAX(v.harga_jual) as price_max
        FROM persediaan_produk p
        JOIN persediaan_kategori k ON p.id_kategori = k.id
        JOIN persediaan_merek m ON p.id_merek = m.id
        LEFT JOIN persediaan_variasi v ON v.id_produk = p.id
        ${where}
        GROUP BY p.id
        ORDER BY m.nama_merek, p.type
        LIMIT ? OFFSET ?
      `, [...params, String(limit), String(offset)]);

      return NextResponse.json({ products, total, page, pages: Math.ceil(total / limit) });
    }

    // ========== PRODUCT DETAIL ==========
    if (action === 'detail') {
      const id = req.nextUrl.searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const produk = await queryMySQL<ProdukDetailRow>(`
        SELECT p.id, p.type, p.foto_filename, k.nama_kategori, m.nama_merek
        FROM persediaan_produk p
        JOIN persediaan_kategori k ON p.id_kategori = k.id
        JOIN persediaan_merek m ON p.id_merek = m.id
        WHERE p.id = ?
      `, [id]);

      if (!produk[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const variasi = await queryMySQL<VariasiRow>(`
        SELECT id, nama_variasi, harga_jual, garansi_angka, garansi_satuan, deskripsi, urutan
        FROM persediaan_variasi WHERE id_produk = ? ORDER BY urutan
      `, [id]);

      return NextResponse.json({ produk: produk[0], variasi }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Pricelist error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
