'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronRight, ChevronLeft, Tag, Loader2, ShieldCheck, X } from 'lucide-react';

interface Category { id: number; nama_kategori: string; product_count: number; }
interface Brand { id: number; nama_merek: string; product_count: number; }
interface Product {
  produk_id: number; type: string; foto_filename: string;
  nama_kategori: string; nama_merek: string;
  variasi_count: number; price_min: number; price_max: number;
}
interface Variasi {
  id: number; nama_variasi: string; harga_jual: number;
  garansi_angka: number; garansi_satuan: string; deskripsi: string; urutan: number;
}
interface ProdukDetail {
  id: number; type: string; foto_filename: string;
  nama_kategori: string; nama_merek: string;
}

type View = 'categories' | 'brands' | 'products' | 'search' | 'detail';

const formatRp = (n: number) => {
  if (!n) return 'Rp 0';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};

// Kategori yang disembunyikan dari tampilan customer
const HIDDEN_CATEGORIES = [
  'perbaikan', 'aksesories', 'aksesoris', 'jasa pasang', 'jasa pindah data + icloud',
  'jasa pindah data', 'lem', 'port usb android', 'port usb iphone',
];

export default function Pricelist() {
  const [view, setView] = useState<View>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<{ produk: ProdukDetail; variasi: Variasi[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const scrollTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pricelist?action=categories');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (e) {
      console.error(e);
      setError('Gagal memuat data. Server sedang sibuk, coba lagi.');
    }
    setLoading(false);
  };

  const loadBrands = async (cat: Category) => {
    setSelectedCategory(cat);
    setSelectedBrand(null);
    setView('brands');
    setLoading(true);
    scrollTop();
    try {
      const res = await fetch(`/api/pricelist?action=brands&category_id=${cat.id}`);
      const data = await res.json();
      if (data.brands) setBrands(data.brands);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadProducts = async (brandId?: number, catId?: number, pg = 1) => {
    setView('products');
    setPage(pg);
    setLoading(true);
    scrollTop();
    try {
      const params = new URLSearchParams({ action: 'products', page: String(pg), limit: '20' });
      if (catId) params.set('category_id', String(catId));
      if (brandId) params.set('brand_id', String(brandId));
      const res = await fetch(`/api/pricelist?${params}`);
      const data = await res.json();
      if (data.products) { setProducts(data.products); setTotalPages(data.pages); setTotal(data.total); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleBrandClick = (brand: Brand) => {
    setSelectedBrand(brand);
    loadProducts(brand.id, selectedCategory?.id, 1);
  };

  // Build search URL with smart filtering
  const buildSearchUrl = (q: string, pg: number) => {
    const params = new URLSearchParams({ action: 'search', q, page: String(pg), limit: '20' });
    if (selectedCategory) {
      // Inside a category: search within that category only
      params.set('category_id', String(selectedCategory.id));
    } else {
      // At root: exclude hidden categories
      params.set('exclude_categories', HIDDEN_CATEGORIES.join(','));
    }
    return `/api/pricelist?${params}`;
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (q.length < 2) {
      if (view === 'search') {
        // Go back to where user was before searching
        if (selectedCategory) setView('brands');
        else setView('categories');
        setProducts([]);
      }
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setView('search');
      setPage(1);
      setLoading(true);
      scrollTop();
      try {
        const res = await fetch(buildSearchUrl(q, 1));
        const data = await res.json();
        if (data.products) { setProducts(data.products); setTotalPages(data.pages); setTotal(data.total); }
      } catch (e) { console.error(e); }
      setLoading(false);
    }, 300);
  }, [view, selectedCategory]);

  const loadSearchPage = async (pg: number) => {
    setPage(pg);
    setLoading(true);
    scrollTop();
    try {
      const res = await fetch(buildSearchUrl(searchQuery, pg));
      const data = await res.json();
      if (data.products) { setProducts(data.products); setTotalPages(data.pages); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadDetail = async (productId: number) => {
    setView('detail');
    setLoading(true);
    scrollTop();
    try {
      const res = await fetch(`/api/pricelist?action=detail&id=${productId}`);
      const data = await res.json();
      if (data.produk) setDetail({ produk: data.produk, variasi: data.variasi });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const goBack = () => {
    if (view === 'detail') {
      if (searchQuery) setView('search');
      else if (selectedBrand) setView('products');
      else if (selectedCategory) setView('brands');
      else setView('categories');
    } else if (view === 'products') {
      setView('brands');
    } else if (view === 'brands') {
      setView('categories');
      setSelectedCategory(null);
    } else if (view === 'search') {
      setSearchQuery('');
      // Go back to context: if inside a category go to brands, else categories
      if (selectedCategory) setView('brands');
      else setView('categories');
    }
    scrollTop();
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    if (view === 'categories') return null;
    const parts: { label: string; onClick?: () => void }[] = [{ label: 'Kategori', onClick: () => { setView('categories'); setSelectedCategory(null); setSelectedBrand(null); setSearchQuery(''); scrollTop(); } }];
    // Show category in breadcrumb when inside a category (brands/products/detail or searching within category)
    if (selectedCategory) {
      parts.push({ label: selectedCategory.nama_kategori, onClick: () => { setView('brands'); setSelectedBrand(null); setSearchQuery(''); scrollTop(); } });
    }
    if (view === 'search') parts.push({ label: `"${searchQuery}"` });
    if (selectedBrand && (view === 'products' || view === 'detail')) parts.push({ label: selectedBrand.nama_merek, onClick: view === 'detail' ? () => { setView('products'); scrollTop(); } : undefined });
    if (view === 'detail' && detail) parts.push({ label: detail.produk.type });

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px 8px', flexWrap: 'wrap' }}>
        <button onClick={goBack} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        {parts.map((p, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ color: '#3b4a54', fontSize: 10 }}>›</span>}
            {p.onClick ? (
              <button onClick={p.onClick} style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontSize: 11, padding: 0 }}>{p.label}</button>
            ) : (
              <span style={{ color: '#8696a0', fontSize: 11 }}>{p.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  // Product card
  const renderProductCard = (p: Product) => (
    <div key={p.produk_id} onClick={() => loadDetail(p.produk_id)}
      style={{ background: '#1f2c34', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s' }}>
      {/* Image placeholder */}
      <div style={{ width: '100%', aspectRatio: '1', background: '#0b141a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {p.foto_filename ? (
          <img src={`https://mybss.cloud/pricelist/assets/img/lcd/${p.foto_filename.replace('.jpg', '.png')}`}
            alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <Tag size={32} color="#2a3942" />
        )}
        {p.variasi_count > 1 && (
          <span style={{
            position: 'absolute', top: 8, right: 8, background: '#00a884', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          }}>{p.variasi_count} varian</span>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 11, color: '#00a884', fontWeight: 500, marginBottom: 2 }}>{p.nama_kategori}</div>
        <div style={{ fontSize: 13, color: '#e9edef', fontWeight: 600, lineHeight: 1.3, marginBottom: 6,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {p.nama_merek} {p.type}
        </div>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 700 }}>
          {p.price_min === p.price_max ? formatRp(p.price_min) : `${formatRp(p.price_min)} - ${formatRp(p.price_max)}`}
        </div>
      </div>
    </div>
  );

  // Pagination
  const renderPagination = (currentPage: number, totalPgs: number, onPage: (pg: number) => void) => {
    if (totalPgs <= 1) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
        <button disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)}
          style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: currentPage <= 1 ? '#1f2c34' : '#2a3942', color: currentPage <= 1 ? '#3b4a54' : '#e9edef', cursor: currentPage <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ color: '#8696a0', fontSize: 13 }}>{currentPage} / {totalPgs}</span>
        <button disabled={currentPage >= totalPgs} onClick={() => onPage(currentPage + 1)}
          style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: currentPage >= totalPgs ? '#1f2c34' : '#2a3942', color: currentPage >= totalPgs ? '#3b4a54' : '#e9edef', cursor: currentPage >= totalPgs ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: '#1f2c34', padding: '12px 14px', borderBottom: '1px solid #2a3942' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e9edef', marginBottom: 10 }}>Pricelist BSS</div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#8696a0" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari produk... (cth: iphone 15 lcd)"
            style={{ width: '100%', background: '#2a3942', borderRadius: 22, padding: '10px 14px 10px 38px', fontSize: 13, border: 'none', outline: 'none', color: '#e9edef', boxSizing: 'border-box' }} />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); if (selectedCategory) setView('brands'); else setView('categories'); }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ flexShrink: 0, paddingTop: 8 }}>
        {renderBreadcrumb()}
      </div>

      {/* Content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={28} color="#00a884" className="animate-spin" />
          </div>
        )}

        {/* Error state with retry */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, color: '#e9edef', fontWeight: 600, marginBottom: 6 }}>Koneksi Bermasalah</div>
            <div style={{ fontSize: 13, color: '#8696a0', marginBottom: 16, lineHeight: 1.5 }}>{error}</div>
            <button onClick={() => { setError(''); loadCategories(); }}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#00a884', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Coba Lagi
            </button>
          </div>
        )}

        {/* CATEGORIES VIEW */}
        {!loading && view === 'categories' && (
          <div>
            <div style={{ fontSize: 12, color: '#8696a0', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Kategori</div>
            {categories.filter(cat => !HIDDEN_CATEGORIES.includes(cat.nama_kategori.toLowerCase())).map(cat => (
              <div key={cat.id} onClick={() => loadBrands(cat)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#1f2c34', borderRadius: 12, marginBottom: 6, cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e9edef' }}>{cat.nama_kategori}</div>
                  <div style={{ fontSize: 11, color: '#8696a0', marginTop: 2 }}>{cat.product_count} produk</div>
                </div>
                <ChevronRight size={18} color="#8696a0" />
              </div>
            ))}
          </div>
        )}

        {/* BRANDS VIEW */}
        {!loading && view === 'brands' && (
          <div>
            <div style={{ fontSize: 12, color: '#8696a0', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Merek · {selectedCategory?.nama_kategori}
            </div>
            {brands.map(brand => (
              <div key={brand.id} onClick={() => handleBrandClick(brand)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#1f2c34', borderRadius: 12, marginBottom: 6, cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e9edef' }}>{brand.nama_merek}</div>
                  <div style={{ fontSize: 11, color: '#8696a0', marginTop: 2 }}>{brand.product_count} produk</div>
                </div>
                <ChevronRight size={18} color="#8696a0" />
              </div>
            ))}
            {brands.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#8696a0', fontSize: 13 }}>
                Tidak ada merek ditemukan
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS GRID (search or browse) */}
        {!loading && (view === 'products' || view === 'search') && (
          <div>
            <div style={{ fontSize: 12, color: '#8696a0', fontWeight: 600, marginBottom: 10 }}>
              {total} produk ditemukan
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {products.map(p => renderProductCard(p))}
            </div>
            {products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#8696a0', fontSize: 13 }}>
                Tidak ditemukan
              </div>
            )}
            {renderPagination(page, totalPages, (pg) => {
              if (view === 'search') loadSearchPage(pg);
              else loadProducts(selectedBrand?.id, selectedCategory?.id, pg);
            })}
          </div>
        )}

        {/* DETAIL VIEW */}
        {!loading && view === 'detail' && detail && (
          <div>
            {/* Product header */}
            <div style={{ background: '#1f2c34', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: '100%', aspectRatio: '4/3', background: '#0b141a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {detail.produk.foto_filename ? (
                  <img src={`https://mybss.cloud/pricelist/assets/img/lcd/${detail.produk.foto_filename.replace('.jpg', '.png')}`}
                    alt="" style={{ maxWidth: '70%', maxHeight: '80%', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Tag size={48} color="#2a3942" />
                )}
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#00a884', fontWeight: 500, marginBottom: 4 }}>
                  {detail.produk.nama_kategori} · {detail.produk.nama_merek}
                </div>
                <div style={{ fontSize: 18, color: '#e9edef', fontWeight: 700, lineHeight: 1.3 }}>
                  {detail.produk.nama_merek} {detail.produk.type}
                </div>
                <div style={{ fontSize: 12, color: '#8696a0', marginTop: 4 }}>
                  {detail.variasi.length} varian tersedia
                </div>
              </div>
            </div>

            {/* Variants */}
            {detail.variasi.map((v, idx) => (
              <div key={v.id} style={{
                background: '#1f2c34', borderRadius: 14, padding: '16px', marginBottom: 8,
                borderLeft: `3px solid ${idx === 0 ? '#00a884' : idx === 1 ? '#5eb5f7' : '#ea580c'}`,
              }}>
                {/* Tier badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                    padding: '3px 10px', borderRadius: 10,
                    background: idx === 0 ? 'rgba(0,168,132,0.15)' : idx === 1 ? 'rgba(94,181,247,0.15)' : 'rgba(234,88,12,0.15)',
                    color: idx === 0 ? '#00a884' : idx === 1 ? '#5eb5f7' : '#ea580c',
                  }}>
                    {v.nama_variasi}
                  </span>
                </div>

                {/* Price */}
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                  {formatRp(v.harga_jual)}
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e9edef', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#e9edef' }}>{detail.produk.nama_merek} {detail.produk.type}</span>
                  </div>
                  {v.garansi_angka > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={14} color="#00a884" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#e9edef' }}>Garansi {v.garansi_angka} {v.garansi_satuan}</span>
                    </div>
                  )}
                  {v.deskripsi && v.deskripsi.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8696a0', flexShrink: 0, marginTop: 5 }} />
                      <span style={{ fontSize: 13, color: '#8696a0' }}>{line.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
