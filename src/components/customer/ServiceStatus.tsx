'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Smartphone, Cpu, Camera, Volume2, Mic, Battery, Wifi, Bluetooth, Signal, Fingerprint, Monitor, Power, ChevronDown, ChevronUp, Package, Clock, CheckCircle2, XCircle, AlertCircle, Wrench, ShieldCheck, Loader2 } from 'lucide-react';
import { initNotifications, showNotification } from '@/lib/notifications';

interface SparepartDetail {
  id: number;
  nama_sparepart: string;
  kategori: string;
  merk: string;
  type: string;
  varian: string;
  harga: number;
  qty: number;
  subtotal: number;
  garansi_durasi: number;
  garansi_satuan: string;
  garansi_mulai: string;
  garansi_selesai: string;
  is_garansi_aktif: number;
}

interface RunningTest {
  mainboard: string;
  camera_depan: string;
  camera_belakang: string;
  lcd: string;
  touchscreen: string;
  speaker: string;
  microphone: string;
  charging: string;
  baterai: string;
  tombol_power: string;
  tombol_volume: string;
  wifi: string;
  bluetooth: string;
  sinyal: string;
  fingerprint: string;
  catatan: string;
  tested_by: string;
}

interface ServiceData {
  id: number;
  nota_dinas: string;
  jenis_item: string;
  merk_item: string;
  model_type: string;
  imei_sn: string;
  gejala_pilihan: string;
  kondisi_masuk: string;
  kelengkapan_pilihan: string;
  layanan_pilihan: string;
  layanan_dikerjakan: string;
  status: string;
  nominal_dp: number;
  total_biaya: number;
  sisa_bayar: number;
  keterangan: string;
  penginput_nama: string;
  teknisi_nama: string;
  tanggal_masuk: string;
  tanggal_proses: string;
  tanggal_selesai: string;
  tanggal_diambil: string;
  customer_nama: string;
  customer_wa: string;
  running_test: RunningTest | null;
  spareparts: SparepartDetail[];
}

interface ServiceStatusProps {
  customer: { name: string; phone: string };
}

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
  queue: { color: '#facc15', label: 'Antrian', bg: 'rgba(250,204,21,0.1)' },
  process: { color: '#60a5fa', label: 'Dikerjakan', bg: 'rgba(96,165,250,0.1)' },
  'running test': { color: '#c084fc', label: 'Running Test', bg: 'rgba(192,132,252,0.1)' },
  done: { color: '#4ade80', label: 'Selesai', bg: 'rgba(74,222,128,0.1)' },
  taken: { color: '#34d399', label: 'Diambil', bg: 'rgba(52,211,153,0.1)' },
  cancel: { color: '#f87171', label: 'Dibatalkan', bg: 'rgba(248,113,113,0.1)' },
  annul: { color: '#9ca3af', label: 'Annul', bg: 'rgba(156,163,175,0.1)' },
  pending: { color: '#fb923c', label: 'Pending', bg: 'rgba(251,146,60,0.1)' },
};

const statusIcons: Record<string, React.ReactNode> = {
  queue: <Clock size={16} />,
  process: <Wrench size={16} />,
  'running test': <Cpu size={16} />,
  done: <CheckCircle2 size={16} />,
  taken: <Package size={16} />,
  cancel: <XCircle size={16} />,
  annul: <AlertCircle size={16} />,
  pending: <AlertCircle size={16} />,
};

export default function ServiceStatus({ customer }: ServiceStatusProps) {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const prevStatusMapRef = useRef<Map<number, string>>(new Map());
  const initialLoadDoneRef = useRef(false);

  // Setup notification system
  useEffect(() => {
    initNotifications();
  }, []);

  const showServiceNotification = useCallback((nota: string, oldStatus: string, newStatus: string) => {
    const cfg = statusConfig[newStatus] || statusConfig.queue;
    showNotification(`🔧 Update Service ${nota}`, `Status berubah: ${statusConfig[oldStatus]?.label || oldStatus} → ${cfg.label}`, {
      tag: `bss-service-${nota}`,
      sound: '/sound/notification-service.mp3',
      url: '/',
    });
  }, []);

  useEffect(() => {
    if (customer.phone) {
      searchByPhone(customer.phone);
    }
  }, [customer.phone]);

  // Poll service status every 30 seconds for changes
  useEffect(() => {
    if (!customer.phone) return;
    const pollService = async () => {
      try {
        const res = await fetch(`/api/service/status?phone=${encodeURIComponent(customer.phone)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.services) {
          const newServices = data.services as ServiceData[];
          // Check for status changes
          if (initialLoadDoneRef.current) {
            for (const svc of newServices) {
              const prevStatus = prevStatusMapRef.current.get(svc.id);
              if (prevStatus && prevStatus !== svc.status) {
                showServiceNotification(svc.nota_dinas, prevStatus, svc.status);
              }
            }
          }
          // Update tracking
          prevStatusMapRef.current = new Map(newServices.map(s => [s.id, s.status]));
          initialLoadDoneRef.current = true;
          setServices(newServices);
        }
      } catch { /* silent */ }
    };
    const interval = setInterval(pollService, 30000);
    return () => clearInterval(interval);
  }, [customer.phone, showServiceNotification]);

  const searchByPhone = async (phone: string) => {
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const res = await fetch(`/api/service/status?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const svcs = data.services || [];
      setServices(svcs);
      // Initialize status tracking
      prevStatusMapRef.current = new Map(svcs.map((s: ServiceData) => [s.id, s.status]));
      initialLoadDoneRef.current = true;
    } catch (e) {
      console.error('Search error:', e);
      setError('Gagal memuat status service. Server sedang sibuk, coba lagi.');
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      if (searchInput.toUpperCase().startsWith('BSS-')) {
        searchByNota(searchInput);
      } else {
        searchByPhone(searchInput);
      }
    }
  };

  const searchByNota = async (nota: string) => {
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const res = await fetch(`/api/service/status?nota=${encodeURIComponent(nota)}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setServices(data.services || []);
    } catch (e) {
      console.error('Search error:', e);
      setError('Gagal memuat status service. Server sedang sibuk, coba lagi.');
    }
    setLoading(false);
  };

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  const getTestIcon = (key: string) => {
    const icons: Record<string, React.ReactNode> = {
      mainboard: <Cpu size={14} />, camera_depan: <Camera size={14} />, camera_belakang: <Camera size={14} />,
      lcd: <Monitor size={14} />, touchscreen: <Smartphone size={14} />, speaker: <Volume2 size={14} />,
      microphone: <Mic size={14} />, charging: <Battery size={14} />, baterai: <Battery size={14} />,
      tombol_power: <Power size={14} />, tombol_volume: <Volume2 size={14} />,
      wifi: <Wifi size={14} />, bluetooth: <Bluetooth size={14} />, sinyal: <Signal size={14} />,
      fingerprint: <Fingerprint size={14} />,
    };
    return icons[key] || <Cpu size={14} />;
  };

  const getTestLabel = (key: string) => {
    const labels: Record<string, string> = {
      mainboard: 'Mainboard', camera_depan: 'Kamera Depan', camera_belakang: 'Kamera Belakang',
      lcd: 'LCD', touchscreen: 'Touchscreen', speaker: 'Speaker', microphone: 'Microphone',
      charging: 'Charging', baterai: 'Baterai', tombol_power: 'Tombol Power', tombol_volume: 'Tombol Volume',
      wifi: 'WiFi', bluetooth: 'Bluetooth', sinyal: 'Sinyal', fingerprint: 'Fingerprint',
    };
    return labels[key] || key;
  };

  const getStatusStep = (status: string) => {
    const steps = ['queue', 'process', 'done', 'running test', 'taken'];
    return steps.indexOf(status);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: '#1f2c34', padding: '12px 16px' }}>
        <h2 style={{ color: '#e9edef', fontSize: 18, fontWeight: 600, margin: '0 0 12px' }}>Status Service</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#2a3942', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
            <Search size={16} color="#8696a0" style={{ marginRight: 8, flexShrink: 0 }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="5 digit no HP belakang / ID nota"
              style={{ flex: 1, background: 'transparent', color: '#e9edef', padding: '11px 0', fontSize: 13, border: 'none', outline: 'none' }}
            />
          </div>
          <button
            onClick={handleSearch}
            style={{ background: '#00a884', color: '#fff', padding: '0 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#06cf9c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#00a884')}
          >
            Cari
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <Loader2 size={32} color="#00a884" className="animate-spin" />
          </div>
        )}

        {/* Error state with retry */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, color: '#e9edef', fontWeight: 600, marginBottom: 6 }}>Koneksi Bermasalah</div>
            <div style={{ fontSize: 13, color: '#8696a0', marginBottom: 16, lineHeight: 1.5 }}>{error}</div>
            <button
              onClick={() => {
                setError('');
                if (searchInput.trim()) handleSearch();
                else if (customer.phone) searchByPhone(customer.phone);
              }}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#00a884', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && searched && services.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Smartphone size={48} color="rgba(134,150,160,0.3)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#8696a0', fontSize: 14, margin: 0 }}>Tidak ada data service ditemukan</p>
            <p style={{ color: 'rgba(134,150,160,0.6)', fontSize: 12, marginTop: 4 }}>Coba cek 5 digit nomor HP belakang atau ID nota</p>
          </div>
        )}

        {services.map((svc) => {
          const cfg = statusConfig[svc.status] || statusConfig.queue;
          const icon = statusIcons[svc.status] || statusIcons.queue;
          const expanded = expandedId === svc.id;
          const step = getStatusStep(svc.status);

          return (
            <div key={svc.id} style={{ background: '#1f2c34', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
              {/* Card Header */}
              <button
                onClick={() => setExpandedId(expanded ? null : svc.id)}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0,
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ color: '#e9edef', fontSize: 14, fontWeight: 600 }}>{svc.nota_dinas}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                      background: cfg.bg, color: cfg.color,
                    }}>{cfg.label}</span>
                  </div>
                  <p style={{ color: '#8696a0', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {svc.merk_item} {svc.model_type} &bull; {svc.gejala_pilihan}
                  </p>
                </div>
                {expanded ? <ChevronUp size={18} color="#8696a0" /> : <ChevronDown size={18} color="#8696a0" />}
              </button>

              {/* Expanded Detail */}
              {expanded && (
                <div style={{ padding: '0 16px 16px' }}>
                  {/* Progress Steps */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 16 }}>
                    {['Antrian', 'Proses', 'Selesai', 'Testing', 'Diambil'].map((label, i) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                          background: i <= step ? '#00a884' : '#2a3942',
                          color: i <= step ? '#fff' : '#8696a0',
                        }}>
                          {i <= step ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: 9, color: i <= step ? '#00a884' : '#8696a0' }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Info Section */}
                  {renderInfoSection('Info Perangkat', [
                    ['Jenis', svc.jenis_item], ['Merk', svc.merk_item], ['Model', svc.model_type],
                    ...(svc.imei_sn ? [['IMEI/SN', svc.imei_sn] as [string, string]] : []),
                    ['Gejala', svc.gejala_pilihan || '-'], ['Kondisi Masuk', svc.kondisi_masuk || '-'],
                    ['Kelengkapan', svc.kelengkapan_pilihan || '-'],
                  ])}

                  {renderInfoSection('Info Service', [
                    ['Layanan', svc.layanan_dikerjakan || svc.layanan_pilihan || '-'],
                    ['Teknisi', svc.teknisi_nama || '-'], ['Input oleh', svc.penginput_nama || '-'],
                    ...(svc.keterangan ? [['Keterangan', svc.keterangan] as [string, string]] : []),
                  ])}

                  {/* Timeline */}
                  <div style={{ background: '#0b141a', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <h4 style={{ color: '#00a884', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>Timeline</h4>
                    {[
                      { label: 'Masuk', date: svc.tanggal_masuk, active: true },
                      { label: 'Proses', date: svc.tanggal_proses, active: !!svc.tanggal_proses },
                      { label: 'Selesai', date: svc.tanggal_selesai, active: !!svc.tanggal_selesai },
                      { label: 'Diambil', date: svc.tanggal_diambil, active: !!svc.tanggal_diambil },
                    ].map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.active ? '#00a884' : '#2a3942', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, width: 56, color: t.active ? '#e9edef' : 'rgba(134,150,160,0.5)' }}>{t.label}</span>
                        <span style={{ fontSize: 12, color: t.active ? '#8696a0' : 'rgba(134,150,160,0.3)' }}>{t.date ? formatDate(t.date) : '-'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Biaya */}
                  <div style={{ background: '#0b141a', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <h4 style={{ color: '#00a884', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>Biaya</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#8696a0' }}>Total Biaya</span>
                      <span style={{ color: '#e9edef', fontWeight: 600 }}>{formatCurrency(svc.total_biaya)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: '#8696a0' }}>DP</span>
                      <span style={{ color: '#e9edef' }}>{formatCurrency(svc.nominal_dp)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #2a3942', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#8696a0', fontWeight: 500 }}>Sisa Bayar</span>
                      <span style={{ color: '#facc15', fontWeight: 700 }}>{formatCurrency(svc.sisa_bayar)}</span>
                    </div>
                  </div>

                  {/* Spareparts */}
                  {svc.spareparts.length > 0 && (
                    <div style={{ background: '#0b141a', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <h4 style={{ color: '#00a884', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={12} /> Sparepart Dipakai
                      </h4>
                      {svc.spareparts.map((sp) => (
                        <div key={sp.id} style={{ background: '#1f2c34', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                          <p style={{ color: '#e9edef', fontSize: 12, fontWeight: 500, margin: 0 }}>{sp.nama_sparepart}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ color: '#8696a0', fontSize: 10 }}>{sp.qty}x {formatCurrency(sp.harga)}</span>
                            <span style={{ color: '#e9edef', fontSize: 12, fontWeight: 600 }}>{formatCurrency(sp.subtotal)}</span>
                          </div>
                          {sp.garansi_durasi > 0 && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ShieldCheck size={10} color={sp.is_garansi_aktif ? '#4ade80' : '#f87171'} />
                              <span style={{ fontSize: 10, color: sp.is_garansi_aktif ? '#4ade80' : '#f87171' }}>
                                Garansi {sp.garansi_durasi} {sp.garansi_satuan}
                                {sp.garansi_selesai && ` (s/d ${formatDate(sp.garansi_selesai).split(',')[0]})`}
                                {sp.is_garansi_aktif ? ' - Aktif' : ' - Expired'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Running Test */}
                  {svc.running_test && (
                    <div style={{ background: '#0b141a', borderRadius: 10, padding: 12 }}>
                      <h4 style={{ color: '#00a884', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Cpu size={12} /> Running Test
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {Object.entries(svc.running_test)
                          .filter(([key]) => !['id', 'id_service', 'catatan', 'tested_by', 'created_at', 'updated_at'].includes(key))
                          .map(([key, val]) => {
                            const isOk = val === 'berfungsi';
                            const isBroken = val === 'tidak_berfungsi';
                            return (
                              <div
                                key={key}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '8px 10px', borderRadius: 8,
                                  background: isOk ? 'rgba(74,222,128,0.05)' : isBroken ? 'rgba(248,113,113,0.05)' : '#2a3942',
                                  color: isOk ? '#4ade80' : isBroken ? '#f87171' : '#8696a0',
                                }}
                              >
                                {getTestIcon(key)}
                                <div>
                                  <p style={{ fontSize: 10, lineHeight: 1.2, margin: 0 }}>{getTestLabel(key)}</p>
                                  <p style={{ fontSize: 9, opacity: 0.7, margin: 0 }}>
                                    {isOk ? '✓ OK' : isBroken ? '✗ Rusak' : '-'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {svc.running_test.catatan && (
                        <div style={{ background: '#2a3942', borderRadius: 8, padding: 8, marginTop: 8 }}>
                          <p style={{ color: '#8696a0', fontSize: 10, margin: '0 0 2px' }}>Catatan:</p>
                          <p style={{ color: '#e9edef', fontSize: 12, margin: 0 }}>{svc.running_test.catatan}</p>
                        </div>
                      )}
                      {/* Warning if any test failed */}
                      {Object.entries(svc.running_test)
                        .filter(([key]) => !['id', 'id_service', 'catatan', 'tested_by', 'created_at', 'updated_at'].includes(key))
                        .some(([, val]) => val === 'tidak_berfungsi') && (
                        <div style={{
                          background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)',
                          borderRadius: 8, padding: '10px 12px', marginTop: 10,
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                        }}>
                          <AlertCircle size={14} color="#fb923c" style={{ flexShrink: 0, marginTop: 1 }} />
                          <p style={{ color: '#fbbf24', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                            Jika terdapat <span style={{ color: '#f87171', fontWeight: 600 }}>Gagal</span> pada running test, berarti kondisi tersebut sudah rusak sejak HP anda masuk ke konter kami.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderInfoSection(title: string, items: [string, string][]) {
  return (
    <div style={{ background: '#0b141a', borderRadius: 10, padding: 12, marginBottom: 12 }}>
      <h4 style={{ color: '#00a884', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0' }}>
        {items.map(([label, val], i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span style={{ fontSize: 12, color: '#8696a0' }}>{label}</span>
            <span style={{ fontSize: 12, color: '#e9edef' }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
