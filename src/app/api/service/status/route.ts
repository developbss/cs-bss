import { NextRequest, NextResponse } from 'next/server';
import { queryMySQL } from '@/lib/mysql';
import { phoneVariants } from '@/lib/auth';

// Vercel serverless config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface ServiceRow {
  id: number;
  nota_dinas: string;
  id_customer: number;
  jenis_item: string;
  merk_item: string;
  model_type: string;
  imei_sn: string;
  foto_unit: string;
  gejala_pilihan: string;
  kondisi_masuk: string;
  kelengkapan_pilihan: string;
  layanan_pilihan: string;
  layanan_dikerjakan: string;
  sparepart_dipakai: string;
  status: string;
  nominal_dp: number;
  total_biaya: number;
  sisa_bayar: number;
  total_bayar: number;
  diskon: number;
  keterangan: string;
  penginput_nama: string;
  teknisi_nama: string;
  created_at: string;
  tanggal_masuk: string;
  tanggal_proses: string;
  tanggal_selesai: string;
  tanggal_diambil: string;
  customer_nama: string;
  customer_wa: string;
  customer_alamat: string;
}

interface RunningTestRow {
  id: number;
  id_service: number;
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
  created_at: string;
}

interface SparepartRow {
  id: number;
  id_service: number;
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

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone');
    const notaDinas = req.nextUrl.searchParams.get('nota');

    if (!phone && !notaDinas) {
      return NextResponse.json({ error: 'Phone or nota required' }, { status: 400 });
    }

    let services: ServiceRow[] = [];

    if (notaDinas) {
      services = await queryMySQL<ServiceRow>(`
        SELECT s.*, c.nama as customer_nama, c.wa as customer_wa, c.alamat as customer_alamat
        FROM bss_service_antrian s
        LEFT JOIN customers c ON s.id_customer = c.id
        WHERE s.nota_dinas = ?
        ORDER BY s.created_at DESC
      `, [notaDinas]);
    } else if (phone) {
      const variants = phoneVariants(phone);
      const placeholders = variants.map(() => '?').join(',');

      services = await queryMySQL<ServiceRow>(`
        SELECT s.*, c.nama as customer_nama, c.wa as customer_wa, c.alamat as customer_alamat
        FROM bss_service_antrian s
        LEFT JOIN customers c ON s.id_customer = c.id
        WHERE c.wa IN (${placeholders})
           OR REPLACE(REPLACE(c.wa, '+', ''), '-', '') IN (${placeholders})
        ORDER BY s.created_at DESC
      `, [...variants, ...variants]);
    }

    if (services.length === 0) {
      return NextResponse.json({ services: [] });
    }

    // BATCH queries instead of N+1 to minimize round-trips to MySQL
    const serviceIds = services.map(s => s.id);
    const idPlaceholders = serviceIds.map(() => '?').join(',');

    // Fetch all running tests and spareparts in 2 queries (instead of 2*N)
    const [allRunningTests, allSpareparts] = await Promise.all([
      queryMySQL<RunningTestRow>(
        `SELECT rt.* FROM bss_running_test rt
         INNER JOIN (
           SELECT id_service, MAX(id) as max_id
           FROM bss_running_test
           WHERE id_service IN (${idPlaceholders})
           GROUP BY id_service
         ) latest ON rt.id = latest.max_id`,
        serviceIds
      ),
      queryMySQL<SparepartRow>(
        `SELECT * FROM bss_service_sparepart_detail WHERE id_service IN (${idPlaceholders})`,
        serviceIds
      ),
    ]);

    // Index by service_id for O(1) lookup
    const testMap = new Map<number, RunningTestRow>();
    for (const rt of allRunningTests) {
      testMap.set(rt.id_service, rt);
    }

    const sparepartMap = new Map<number, SparepartRow[]>();
    for (const sp of allSpareparts) {
      if (!sparepartMap.has(sp.id_service)) sparepartMap.set(sp.id_service, []);
      sparepartMap.get(sp.id_service)!.push(sp);
    }

    // Enrich services
    const enriched = services.map(svc => ({
      ...svc,
      running_test: testMap.get(svc.id) || null,
      spareparts: sparepartMap.get(svc.id) || [],
    }));

    return NextResponse.json({ services: enriched });
  } catch (error) {
    console.error('Service status error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
