import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  SlidersHorizontal,
  Database,
  Building2,
  Tag,
  FileSearch,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Check,
  CircleAlert,
  Zap,
  FileText,
  Save,
  Plus,
  X,
  Copy,
  Inbox,
  Pencil,
  Trash2,
  RefreshCw,
  MessageCircle,
  Link2,
  TriangleAlert,
  ExternalLink,
  Percent,
  Eye,
  EyeOff,
} from "lucide-react";

import Topbar from "../components/Topbar";
import Breadcrumb from "../components/Breadcrumb";
import RedSelect from "../components/RedSelect";

import { apiRequest } from "../services/api";

// ============================================================
// TAB KONFIGURASI SKEMA
// ============================================================

const TABS = [
  {
    id: "instansi",
    label: "INSTANSI & WILAYAH",
    crumb: "Instansi & Wilayah",
    icon: Building2,
    schema: "public.instansi",
    title: "TABEL INDUK: INSTANSI • LEVEL_PEMERINTAHAN • WILAYAH",
    desc: "Konfigurasi entitas instansi pengelola, kode registrasi unik daerah, dan hierarki wilayah administratif.",
  },
  {
    id: "kategori",
    label: "KATEGORI & STATUS",
    crumb: "Kategori & Status",
    icon: Tag,
  },
  {
    id: "keyword",
    label: "DETAIL & KEYWORD",
    crumb: "Detail & Keyword",
    icon: FileSearch,
  },
  {
    id: "sumber",
    label: "LAYANAN_SUMBER (Verifikasi)",
    crumb: "Layanan Sumber",
    icon: ShieldCheck,
    schema: "public.layanan_sumber",
    title: "TABEL SUMBER: LAYANAN_SUMBER • VERIFIKASI",
    desc: "Konfigurasi sumber data layanan beserta status verifikasinya.",
  },
  {
    id: "embedding",
    label: "LAYANAN_EMBEDDING (Qdrant)",
    crumb: "Layanan Embedding",
    icon: Sparkles,
    schema: "public.layanan_embedding",
    title: "TABEL VEKTOR: LAYANAN_EMBEDDING • QDRANT",
    desc: "Konfigurasi embedding layanan yang disinkronkan ke koleksi vektor Qdrant.",
  },
  {
    id: "monitoring",
    label: "MONITORING_LAYANAN",
    crumb: "Monitoring Layanan",
    icon: BarChart3,
    schema: "public.monitoring_layanan",
    title: "TABEL MONITORING: MONITORING_LAYANAN",
    desc: "Konfigurasi pemantauan kualitas dan kesehatan data layanan.",
  },
];

// ============================================================
// FORM INSTANSI
// ============================================================

const defaultForm = {
  kode_instansi: "",
  nama_instansi: "",
  singkatan: "",
  level: "",
  wilayah_id: "",
  website: "",
  aktif: true,
};

// tipe wilayah → level pemerintahan (sama seperti FormInstansi)
function getLevelFromWilayah(wilayah) {
  if (!wilayah) return "";

  const tipe = String(wilayah.tipe || "").trim().toLowerCase();

  switch (tipe) {
    case "nasional":
    case "pusat":
      return "Pusat";
    case "provinsi":
      return "Provinsi";
    case "kabupaten":
      return "Kabupaten";
    case "kota":
      return "Kota";
    default:
      return wilayah.tipe || "";
  }
}

const LEVEL_ORDER = ["Pusat", "Provinsi", "Kota", "Kabupaten"];

// ============================================================
// DATA AWAL TAB DETAIL & KEYWORD
// ============================================================

const PERSYARATAN_OPTIONS = [
  { value: "numbered", label: "Numbered Bullet List (1, 2, 3...)" },
  { value: "bullet", label: "Bullet List (• ...)" },
  { value: "paragraf", label: "Paragraf Biasa" },
];

const PROSEDUR_OPTIONS = [
  { value: "stepflow", label: "Step-by-step Flow (Tahapan Berurutan)" },
  { value: "numbered", label: "Numbered List" },
  { value: "paragraf", label: "Paragraf Biasa" },
];

const KANAL_OPTIONS = [
  { value: "portal", label: "Portal Web Online" },
  { value: "mobile", label: "Aplikasi Mobile" },
  { value: "mpp", label: "Loket MPP Tatap Muka" },
  { value: "wa", label: "WhatsApp Bot Layanan" },
  { value: "keliling", label: "Layanan Keliling / Posko" },
  { value: "callcenter", label: "Call Center 112 / Telepon" },
];

const DEFAULT_DETAIL = {
  deskripsi:
    "Uraian ringkas tujuan layanan publik, dasar kewenangan pemerintah, dan manfaat nyata bagi pemohon.",
  kebutuhan_user:
    "Warga domisili KTP, Pelaku Usaha Mikro, Mahasiswa, Penyandang Disabilitas",
  persyaratan: "numbered",
  prosedur: "stepflow",
  kanal: ["portal", "mobile", "mpp", "wa", "keliling"],
  keywords: [
    { text: "ktp el", count: 42 },
    { text: "kartu keluarga", count: 38 },
    { text: "ppdb zonasi", count: 29 },
    { text: "bpjs kesehatan", count: 25 },
    { text: "bansos beras", count: 21 },
    { text: "simbg pbg", count: 19 },
    { text: "lampu jalan pju", count: 16 },
    { text: "akta kelahiran", count: 15 },
  ],
  limit: 15,
  lemma: true,
};

// warna chip keyword berdasarkan peringkat
const KEYWORD_TONES = [
  "border-blue-200 bg-blue-50 text-blue-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-amber-200 bg-amber-50 text-amber-700",
  "border-violet-200 bg-violet-50 text-violet-700",
];
const KEYWORD_TONE_DEFAULT = "border-slate-200 bg-white text-slate-600";

const KEYWORD_COUNT_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
];
const KEYWORD_COUNT_TONE_DEFAULT = "bg-slate-100 text-slate-600";

// ============================================================
// DATA AWAL TAB KATEGORI & STATUS
// ============================================================

const AUDIT_OPTIONS = [
  { value: "daily", label: "Setiap Hari (Daily Health Check)" },
  { value: "weekly", label: "Setiap 7 Hari Sekali (Weekly Health Check)" },
  { value: "monthly", label: "Setiap 30 Hari Sekali (Monthly Health Check)" },
];

const STATUS_ENUM = [
  { value: "Aktif", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "Pemeliharaan", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  {
    value: "Tinjauan_Berkala",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  { value: "Non-Aktif", tone: "border-red-200 bg-red-50 text-red-600" },
];

function statusTone(status) {
  return (
    STATUS_ENUM.find((s) => s.value === status)?.tone ||
    "border-slate-200 bg-slate-50 text-slate-600"
  );
}

const DEFAULT_KATEGORI = {
  items: [
    {
      id: 1,
      nama: "Infrastruktur & Tata Ruang",
      slug: "infrastruktur-tataruang",
      deskripsi:
        "Jalan, jembatan, izin mendirikan bangunan & penataan tata ruang",
      jumlah: 34,
    },
    {
      id: 2,
      nama: "Kependudukan & Catatan Sipil",
      slug: "kependudukan-capil",
      deskripsi:
        "KTP-el, Kartu Keluarga, Akta Kelahiran, Surat Pindah, dan Biodata Penduduk",
      jumlah: 28,
    },
    {
      id: 3,
      nama: "Pendidikan & Beasiswa",
      slug: "pendidikan-beasiswa",
      deskripsi:
        "PPDB Zonasi, PIP, Beasiswa Kuliah Pemprov, BOS, dan Legalisir Ijazah",
      jumlah: 24,
    },
    {
      id: 4,
      nama: "Kesehatan Masyarakat",
      slug: "kesehatan-masyarakat",
      deskripsi:
        "Rujukan Faskes BPJS, rawat jalan Puskesmas, jadwal ambulans, dan imunisasi",
      jumlah: 22,
    },
    {
      id: 5,
      nama: "Sosial & Bantuan Pangan",
      slug: "sosial-bansos",
      deskripsi:
        "Data Terpadu Kesejahteraan Sosial (DTKS), PKH, Bansos Pangan, dan bantuan sosial",
      jumlah: 18,
    },
    {
      id: 6,
      nama: "Perizinan & Penanaman Modal",
      slug: "perizinan-investasi",
      deskripsi:
        "NIB OSS-RBA, Izin Operasional Tenaga Kesehatan, Reklame, dan izin usaha",
      jumlah: 14,
    },
    {
      id: 7,
      nama: "Perhubungan & Transportasi",
      slug: "perhubungan-transportasi",
      deskripsi:
        "Uji Berkala Kendaraan Bermotor (KIR), izin trayek angkutan umum, dan terminal",
      jumlah: 8,
    },
  ],
  aktif: 136,
  pemeliharaan: 12,
  frekuensi: "weekly",
  lastAudit: "30 menit lalu",
  logs: [
    {
      id: "LYN-001",
      name: "KTP-el",
      status: "Aktif",
      time: "30 mnt lalu",
      note: "Server SIAK Terpusat normal, tidak ada antrean pending",
    },
    {
      id: "LYN-042",
      name: "PPDB",
      status: "Pemeliharaan",
      time: "2 jam lalu",
      note: "Migrasi cloud server persiapan pendaftaran tahap 2",
    },
    {
      id: "LYN-089",
      name: "PBG SIMBG",
      status: "Aktif",
      time: "5 jam lalu",
      note: "Integrasi API Ditjen Cipta Karya KemenPUPR terverifikasi",
    },
  ],
};

// ============================================================
// DATA AWAL TAB LAYANAN_SUMBER
// ============================================================

const DEFAULT_SUMBER = {
  broken: 0,
  items: [
    {
      id: "SRC-001",
      layanan: "Penerbitan KTP Elektronik",
      layananId: "#LYN-001",
      tipe: "PERPRES_NOMOR_96_2018",
      url: "https://jdih.kemendagri.go.id/perpres/96-2018",
      verifiedAt: "20 Mei 2026, 09:15",
      verifiedBy: "Hendra Pratama (Verifikator)",
      status: "valid",
      requested: false,
    },
    {
      id: "SRC-002",
      layanan: "PPDB SMA/SMK Zonasi Jabar",
      layananId: "#LYN-024",
      tipe: "PERGUB_NOMOR_29_2025",
      url: "https://jdih.jabarprov.go.id/pergub-ppdb-2025",
      verifiedAt: "14 Jan 2026, 14:20",
      verifiedBy: "",
      note: "Kedaluwarsa (>120 hari)",
      status: "expired",
      requested: false,
    },
    {
      id: "SRC-003",
      layanan: "Persetujuan Bangunan Gedung (PBG)",
      layananId: "#LYN-089",
      tipe: "PP_NOMOR_16_2021",
      url: "https://simbg.pu.go.id/regulasi-pbg",
      verifiedAt: "02 Mei 2026, 11:00",
      verifiedBy: "Ir. Dedi Sugiarto",
      status: "valid",
      requested: false,
    },
    {
      id: "SRC-004",
      layanan: "Bantuan Pangan Beras DTKS",
      layananId: "#LYN-033",
      tipe: "KEPMENSOS_NOMOR_73_2025",
      url: "https://kemensos.go.id/kepmensos-dtks-2025",
      verifiedAt: "18 Mei 2026, 16:30",
      verifiedBy: "Agus Riyadi, S.Sos",
      status: "valid",
      requested: false,
    },
  ],
};

// ============================================================
// DATA AWAL TAB LAYANAN_EMBEDDING
// ============================================================

const DEFAULT_EMBEDDING = {
  host: "https://qdrant-cluster.internal.pemda.go.id:6333",
  apiKey: "", // tidak pernah disimpan ke localStorage
  chunk: 512,
  autoReindex: true,
  snapshot: true,
};

const SAMPLE_PAYLOAD = {
  qdrant_id: "550e8400-e29b-41d4-a716-446655440000",
  layanan_id: 1,
  nama_layanan: "Penerbitan KTP Elektronik Baru",
  instansi_id: 6,
  kategori: "Kependudukan & Catatan Sipil",
  vector_dim: 1536,
  indexed_at: "2026-05-27T09:15:33Z",
};

// ============================================================
// DATA AWAL TAB MONITORING_LAYANAN
// ============================================================

const PERIODE_OPTIONS = [
  { value: "daily", label: "Harian (Daily Rollup Rekomendasi)" },
  { value: "weekly", label: "Mingguan (Weekly Rollup)" },
  { value: "monthly", label: "Bulanan (Monthly Rollup)" },
];

const TOPK_OPTIONS = [
  { value: "3", label: "Top 3 Potongan (Cepat)" },
  { value: "5", label: "Top 5 Potongan (Optimal)" },
  { value: "10", label: "Top 10 Potongan (Komprehensif)" },
];

const DEFAULT_MONITORING = {
  threshold: 0.75,
  periode: "daily",
  topK: "5",
  failed: [
    {
      id: 1,
      query: "berapa denda telat perpanjang ktp?",
      skor: 0.54,
      cause:
        'Frasa "denda" belum terdaftar di LAYANAN_KEYWORD Disdukcapil.',
      action: { label: "Tambahkan ke Keyword", type: "keyword", value: "denda" },
      done: false,
    },
    {
      id: 2,
      query: "syarat pasang wifi gratis rw",
      skor: 0.61,
      cause: "Program TJSL Diskominfo belum memiliki data LAYANAN_DETAIL.",
      action: { label: "Buat Draft Layanan", type: "draft" },
      done: false,
    },
    {
      id: 3,
      query: "jadwal puskesmas keliling cikutra",
      skor: 0.68,
      cause: "Jadwal operasional spesifik per kelurahan belum terindeks.",
      action: { label: "Perbarui Jadwal Dinkes", type: "note" },
      done: false,
    },
  ],
};

// ============================================================
// PENYIMPANAN LOKAL (tab Detail & Keyword dan Kategori & Status)
// ============================================================

const STORAGE_KEY = "pengaturan_skema_erd";

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    return {
      detail: { ...DEFAULT_DETAIL, ...(saved?.detail || {}) },
      kategori: { ...DEFAULT_KATEGORI, ...(saved?.kategori || {}) },
      sumber: { ...DEFAULT_SUMBER, ...(saved?.sumber || {}) },
      embedding: {
        ...DEFAULT_EMBEDDING,
        ...(saved?.embedding || {}),
        apiKey: "",
      },
      monitoring: { ...DEFAULT_MONITORING, ...(saved?.monitoring || {}) },
    };
  } catch {
    return {
      detail: DEFAULT_DETAIL,
      kategori: DEFAULT_KATEGORI,
      sumber: DEFAULT_SUMBER,
      embedding: DEFAULT_EMBEDDING,
      monitoring: DEFAULT_MONITORING,
    };
  }
}

function formatNow() {
  const d = new Date();

  const tanggal = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const jam = d
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(".", ":");

  return `${tanggal}, ${jam}`;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================
// KOMPONEN KECIL
// ============================================================

const BADGE_TONES = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  red: "border-red-200 bg-red-50 text-red-700",
  gray: "border-slate-200 bg-slate-50 text-slate-500",
};

function Badge({ tone = "gray", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-400/30";

const SELECT_BUTTON_CLASS = "h-10 bg-white px-3 text-slate-800";

function Field({ name, type, children }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-800">
        {name} <span className="font-normal text-slate-400">({type})</span>
      </p>
      {children}
    </div>
  );
}

// nama kolom bergaya kode (mis. `deskripsi`)
function Code({ children }) {
  return (
    <code className="font-mono font-bold text-blue-700">{children}</code>
  );
}

function Switch({ checked, onChange, label, tone = "bg-brand-600" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-400 ${
        checked ? tone : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

// ============================================================
// TAB: DETAIL & KEYWORD
// ============================================================

function DetailKeywordTab({ data, setData, onSave }) {
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordError, setKeywordError] = useState("");

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function toggleKanal(value) {
    setData((d) => ({
      ...d,
      kanal: d.kanal.includes(value)
        ? d.kanal.filter((k) => k !== value)
        : [...d.kanal, value],
    }));
  }

  function addKeyword() {
    const text = keywordInput.trim().toLowerCase();

    if (!text) {
      return setKeywordError("Kata kunci tidak boleh kosong.");
    }
    if (data.keywords.some((k) => k.text === text)) {
      return setKeywordError("Kata kunci sudah ada.");
    }

    setData((d) => ({ ...d, keywords: [...d.keywords, { text, count: 0 }] }));
    setKeywordInput("");
    setKeywordError("");
  }

  function removeKeyword(text) {
    setData((d) => ({
      ...d,
      keywords: d.keywords.filter((k) => k.text !== text),
    }));
  }

  return (
    <>
      {/* STANDARISASI SKEMA */}

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText size={16} />
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-800">
              STANDARISASI SKEMA: LAYANAN_DETAIL & LAYANAN_KEYWORD
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Aturan validasi format teks deskripsi, kebutuhan_user,
              persyaratan, prosedur, kanal dan pembobotan keyword.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Save size={13} />
          Simpan Format Isian
        </button>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        {/* KOLOM LAYANAN_DETAIL */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              KOLOM TABEL LAYANAN_DETAIL (TEKS PANJANG)
            </h3>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">
              Relasi: layanan_id (FK)
            </span>
          </div>

          <div className="mt-4 space-y-5">
            {/* 1. deskripsi */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-800">
                  1. Kolom <Code>deskripsi</Code>{" "}
                  <span className="text-slate-400">(text)</span>
                </p>
                <span className="text-[10px] text-slate-400">
                  Min 50 kata, Max 500 kata
                </span>
              </div>
              <textarea
                rows={4}
                value={data.deskripsi}
                onChange={(e) => update("deskripsi", e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-400/30"
              />
            </div>

            {/* 2. kebutuhan_user */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-800">
                  2. Kolom <Code>kebutuhan_user</Code>{" "}
                  <span className="text-slate-400">(text)</span>
                </p>
                <span className="text-[10px] text-slate-400">
                  Format: Target Subjek / Kriteria
                </span>
              </div>
              <input
                value={data.kebutuhan_user}
                onChange={(e) => update("kebutuhan_user", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            {/* 3 & 4 */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs text-slate-800">
                  3. Format <Code>persyaratan</Code>
                </p>
                <RedSelect
                  value={data.persyaratan}
                  onChange={(v) => update("persyaratan", v)}
                  options={PERSYARATAN_OPTIONS}
                  idleBorder="border-slate-200"
                  buttonClassName={SELECT_BUTTON_CLASS}
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs text-slate-800">
                  4. Format <Code>prosedur</Code>
                </p>
                <RedSelect
                  value={data.prosedur}
                  onChange={(v) => update("prosedur", v)}
                  options={PROSEDUR_OPTIONS}
                  idleBorder="border-slate-200"
                  buttonClassName={SELECT_BUTTON_CLASS}
                />
              </div>
            </div>

            {/* 5. kanal */}
            <div>
              <p className="mb-1.5 text-xs text-slate-800">
                5. Pilihan Nilai <Code>kanal</Code>
                <span className="text-slate-400">(varchar)</span>
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {KANAL_OPTIONS.map((kanal) => {
                  const checked = data.kanal.includes(kanal.value);

                  return (
                    <label
                      key={kanal.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-700 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleKanal(kanal.value)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 ${
                          checked
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked && <Check size={11} strokeWidth={3} />}
                      </span>
                      {kanal.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* KAMUS INDEKS LAYANAN_KEYWORD */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              KAMUS INDEKS LAYANAN_KEYWORD
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              Total: {data.keywords.length} Keyword
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={keywordInput}
              onChange={(e) => {
                setKeywordInput(e.target.value);
                setKeywordError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Ketik kata kunci baru (cth: beasiswa kuliah)..."
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/30"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={13} />
              Tambah
            </button>
          </div>

          <p
            className={`mt-1.5 text-[10px] ${
              keywordError ? "text-red-600" : "text-slate-400"
            }`}
          >
            {keywordError ||
              "Digunakan oleh AI Search engine & full-text search PostgreSQL."}
          </p>

          <p className="mt-5 text-[10px] font-bold tracking-wide text-slate-500">
            KATA KUNCI PALING BANYAK DIRELASIKAN
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.keywords.length === 0 && (
              <p className="text-[11px] text-slate-400">
                Belum ada kata kunci.
              </p>
            )}

            {data.keywords.map((k, index) => (
              <span
                key={k.text}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
                  KEYWORD_TONES[index] || KEYWORD_TONE_DEFAULT
                }`}
              >
                {k.text}
                <span
                  className={`rounded px-1 text-[9px] font-bold ${
                    KEYWORD_COUNT_TONES[index] || KEYWORD_COUNT_TONE_DEFAULT
                  }`}
                >
                  {k.count}x
                </span>
                <button
                  type="button"
                  onClick={() => removeKeyword(k.text)}
                  aria-label={`Hapus kata kunci ${k.text}`}
                  className="opacity-60 transition hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="batas-keyword"
                className="text-xs text-slate-800"
              >
                Batas Keyword per Layanan:
              </label>
              <input
                id="batas-keyword"
                type="number"
                min={1}
                value={data.limit}
                onChange={(e) =>
                  update("limit", Math.max(1, Number(e.target.value) || 1))
                }
                className="h-9 w-16 rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-xs text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-400/30"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-800">
                Otomasi Sinonim (Lemmatization AI):
              </p>
              <Switch
                checked={data.lemma}
                onChange={(v) => update("lemma", v)}
                label="Otomasi sinonim"
                tone="bg-blue-600"
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ============================================================
// TAB: KATEGORI & STATUS
// ============================================================

function StatCard({
  label,
  value,
  helper,
  helperClass,
  icon,
  iconClass,
  labelClass = "text-slate-400",
  valueClass = "text-slate-900",
  cardClass = "border-slate-200",
  round = false,
}) {
  const Icon = icon;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-5 py-4 shadow-card ${cardClass}`}
    >
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold tracking-wide ${labelClass}`}>
          {label}
        </p>
        <p className={`mt-1.5 text-lg font-bold ${valueClass}`}>{value}</p>
        <p className={`mt-0.5 text-[10px] ${helperClass}`}>{helper}</p>
      </div>

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center ${
          round ? "rounded-full" : "rounded-lg"
        } ${iconClass}`}
      >
        <Icon size={16} />
      </div>
    </div>
  );
}

const EMPTY_CATEGORY_FORM = {
  open: false,
  id: null,
  nama: "",
  deskripsi: "",
  jumlah: "",
};

function KategoriStatusTab({ data, setData }) {
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);
  const [formError, setFormError] = useState("");

  const totalMapped = data.items.reduce((sum, k) => sum + k.jumlah, 0);

  function openAdd() {
    setForm({ ...EMPTY_CATEGORY_FORM, open: true });
    setFormError("");
  }

  function openEdit(item) {
    setForm({
      open: true,
      id: item.id,
      nama: item.nama,
      deskripsi: item.deskripsi,
      jumlah: String(item.jumlah),
    });
    setFormError("");
  }

  function closeForm() {
    setForm(EMPTY_CATEGORY_FORM);
    setFormError("");
  }

  function submitForm(e) {
    e.preventDefault();

    const nama = form.nama.trim();
    const deskripsi = form.deskripsi.trim();

    if (!nama) {
      return setFormError("nama_kategori wajib diisi.");
    }

    const jumlah = form.jumlah === "" ? 0 : Number(form.jumlah);

    if (!Number.isInteger(jumlah) || jumlah < 0) {
      return setFormError("Jumlah layanan harus bilangan bulat 0 atau lebih.");
    }

    const duplicate = data.items.some(
      (k) => k.id !== form.id && k.nama.toLowerCase() === nama.toLowerCase()
    );
    if (duplicate) {
      return setFormError("Nama kategori sudah digunakan.");
    }

    setData((d) => {
      if (form.id) {
        return {
          ...d,
          items: d.items.map((k) =>
            k.id === form.id
              ? {
                  ...k,
                  nama,
                  deskripsi,
                  jumlah,
                  slug: k.nama === nama ? k.slug : slugify(nama),
                }
              : k
          ),
        };
      }

      const nextId = d.items.reduce((max, k) => Math.max(max, k.id), 0) + 1;

      return {
        ...d,
        items: [
          ...d.items,
          { id: nextId, nama, slug: slugify(nama), deskripsi, jumlah },
        ],
      };
    });

    closeForm();
  }

  function deleteItem(item) {
    if (!window.confirm(`Hapus kategori "${item.nama}"?`)) return;

    setData((d) => ({ ...d, items: d.items.filter((k) => k.id !== item.id) }));
  }

  function runAudit() {
    setData((d) => ({
      ...d,
      lastAudit: "Baru saja",
      logs: [
        {
          id: "AUDIT",
          name: "Manual",
          status: "Aktif",
          time: "Baru saja",
          note: "Audit checked_at dijalankan dari panel Pengaturan",
        },
        ...d.logs,
      ].slice(0, 5),
    }));
  }

  return (
    <>
      {/* KARTU STATISTIK */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TOTAL KATEGORI"
          value={`${data.items.length} Kategori`}
          helper="Semua aktif di publik"
          helperClass="text-emerald-600"
          icon={Copy}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="LAYANAN TEPETAKAN"
          value={`${totalMapped} Layanan`}
          helper="FK: kategori_id valid"
          helperClass="font-mono text-slate-400"
          icon={Inbox}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="STATUS OPERASIONAL"
          value={`${data.aktif} Aktif`}
          helper={`${data.pemeliharaan} Dalam Pemeliharaan`}
          helperClass="text-amber-600"
          icon={Zap}
          iconClass="bg-amber-50 text-amber-500"
        />
        <StatCard
          label="AUDIT CHECKED_AT"
          value="100%"
          helper={`Terakhir: ${data.lastAudit}`}
          helperClass="text-slate-400"
          icon={ShieldCheck}
          iconClass="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        {/* TABEL MASTER KATEGORI */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-800">
                TABEL MASTER: KATEGORI_LAYANAN
              </h3>
              <p className="mt-1 font-mono text-[10px] leading-4 text-slate-400">
                Entitas pengelolaan tabel LAYANAN (kategori_id • bigint id,
                varchar nama_kategori, varchar deskripsi)
              </p>
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
            >
              <Plus size={13} />
              Tambah Kategori
            </button>
          </div>

          {form.open && (
            <form
              onSubmit={submitForm}
              className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1.6fr_7rem_auto] md:items-end"
            >
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                  nama_kategori{" "}
                  <span className="font-normal text-slate-400">(varchar)</span>
                </p>
                <input
                  autoFocus
                  value={form.nama}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, nama: e.target.value }));
                    setFormError("");
                  }}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                  deskripsi{" "}
                  <span className="font-normal text-slate-400">(varchar)</span>
                </p>
                <input
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deskripsi: e.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                  jml layanan{" "}
                  <span className="font-normal text-slate-400">(int)</span>
                </p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.jumlah}
                  placeholder="0"
                  onChange={(e) => {
                    setForm((f) => ({ ...f, jumlah: e.target.value }));
                    setFormError("");
                  }}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800"
                >
                  {form.id ? "Simpan" : "Tambah"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <p className="text-[11px] text-red-600 md:col-span-4">
                  {formError}
                </p>
              )}
            </form>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="text-[10px] font-semibold text-slate-400">
                  <th className="w-10 py-3 pr-2">ID</th>
                  <th className="w-44 py-3 pr-3">
                    NAMA KATEGORI
                    <br />
                    (NAMA_KATEGORI)
                  </th>
                  <th className="py-3 pr-3">
                    DESKRIPSI (DESKRIPSI)
                  </th>
                  <th className="w-16 py-3 text-center">
                    JML
                    <br />
                    LAYANAN
                  </th>
                  <th className="w-20 py-3 text-center">AKSI</th>
                </tr>
              </thead>

              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="border-t border-slate-100 py-10 text-center text-[11px] text-slate-400"
                    >
                      Belum ada kategori. Klik &quot;Tambah Kategori&quot; untuk
                      membuat yang pertama.
                    </td>
                  </tr>
                )}

                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="py-4 pr-2 text-xs text-slate-500">
                      {item.id}
                    </td>
                    <td className="py-4 pr-3">
                      <p className="text-xs font-semibold leading-4 text-slate-800">
                        {item.nama}
                      </p>
                      <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                        slug: {item.slug}
                      </p>
                    </td>
                    <td className="max-w-[220px] py-4 pr-3 text-[11px] text-slate-600">
                      <p className="line-clamp-2" title={item.deskripsi}>
                        {item.deskripsi}
                      </p>
                    </td>
                    <td className="py-4 text-center text-xs font-bold text-slate-800">
                      {item.jumlah}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-center gap-3 text-slate-400">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          aria-label={`Ubah kategori ${item.nama}`}
                          className="transition hover:text-brand-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item)}
                          aria-label={`Hapus kategori ${item.nama}`}
                          className="transition hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TABEL LAYANAN_STATUS & AUDIT */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-800">
                TABEL LAYANAN_STATUS & AUDIT
              </h3>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                Atribut: status, catatan, checked_at
              </p>
            </div>

            <button
              type="button"
              onClick={runAudit}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <RefreshCw size={12} />
              Audit Sekarang
            </button>
          </div>

          <p className="mt-5 text-xs font-semibold text-slate-800">
            Nilai Enum Status yang Diizinkan:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUS_ENUM.map((s) => (
              <span
                key={s.value}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${s.tone}`}
              >
                {s.value}
              </span>
            ))}
          </div>

          <p className="mt-5 text-xs font-semibold text-slate-800">
            Frekuensi Pemicu Audit (checked_at):
          </p>
          <div className="mt-2">
            <RedSelect
              value={data.frekuensi}
              onChange={(v) => setData((d) => ({ ...d, frekuensi: v }))}
              options={AUDIT_OPTIONS}
              idleBorder="border-slate-200"
              buttonClassName={SELECT_BUTTON_CLASS}
            />
          </div>

          <p className="mt-5 text-[10px] font-bold tracking-wide text-slate-500">
            RIWAYAT LOG CHECKED_AT TERAKHIR
          </p>

          <div className="mt-3 space-y-2.5">
            {data.logs.map((log, index) => {
              const warn = log.status === "Pemeliharaan";

              return (
                <div
                  key={`${log.id}-${index}`}
                  className={`rounded-lg border px-3.5 py-3 ${
                    warn
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-900">
                        {log.id}
                      </span>
                      <span className="text-slate-500">({log.name})</span>
                      <span
                        className={`rounded border px-1.5 py-px text-[9px] font-semibold ${statusTone(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {log.time}
                    </span>
                  </div>

                  <p className="mt-1.5 font-mono text-[10px] leading-4 text-slate-600">
                    catatan: &quot;{log.note}&quot;
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

// ============================================================
// TAB: LAYANAN_SUMBER (VERIFIKASI)
// ============================================================

const EMPTY_SOURCE_FORM = {
  open: false,
  layanan: "",
  layananId: "",
  tipe: "",
  url: "",
};

const SOURCE_STATUS = {
  valid: {
    label: "Valid Sah",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  expired: {
    label: "Perlu SK Baru",
    className: "border-red-200 bg-red-50 text-red-600",
  },
  pending: {
    label: "Belum Diverifikasi",
    className: "border-slate-200 bg-slate-50 text-slate-500",
  },
};

function SumberTab({ data, setData, notify }) {
  const [form, setForm] = useState(EMPTY_SOURCE_FORM);
  const [formError, setFormError] = useState("");

  const total = data.items.length;
  const valid = data.items.filter((i) => i.status === "valid").length;
  const expired = data.items.filter((i) => i.status === "expired").length;

  function patchItem(id, patch) {
    setData((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }

  function verify(item) {
    patchItem(item.id, {
      status: "valid",
      verifiedAt: formatNow(),
      verifiedBy: "Admin PPID (Verifikator)",
      note: "",
      requested: false,
    });
  }

  function requestUpdate(item) {
    patchItem(item.id, { requested: true });
    notify(
      "info",
      `Permintaan pembaruan ${item.id} dicatat. Pemberitahuan ke OPD belum terhubung ke backend.`
    );
  }

  function auditLinks() {
    notify(
      "info",
      "Pemindaian tautan belum terhubung ke backend, jadi belum ada tautan yang diperiksa."
    );
  }

  function updateForm(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFormError("");
  }

  function submitForm(e) {
    e.preventDefault();

    const layanan = form.layanan.trim();
    const layananId = form.layananId.trim().replace(/^#/, "");
    const tipe = form.tipe.trim().toUpperCase().replace(/\s+/g, "_");
    const url = form.url.trim();

    if (!layanan) return setFormError("Nama layanan terkait wajib diisi.");
    if (!layananId) return setFormError("layanan_id wajib diisi.");
    if (!tipe) return setFormError("tipe_sumber wajib diisi.");
    if (!/^https?:\/\/\S+$/i.test(url)) {
      return setFormError("URL rujukan harus diawali http:// atau https://");
    }

    setData((d) => {
      const nextNumber =
        d.items.reduce(
          (max, i) => Math.max(max, Number(i.id.replace(/\D/g, "")) || 0),
          0
        ) + 1;

      return {
        ...d,
        items: [
          ...d.items,
          {
            id: `SRC-${String(nextNumber).padStart(3, "0")}`,
            layanan,
            layananId: `#${layananId}`,
            tipe,
            url,
            verifiedAt: "Belum diverifikasi",
            verifiedBy: "",
            status: "pending",
            requested: false,
          },
        ],
      };
    });

    setForm(EMPTY_SOURCE_FORM);
    setFormError("");
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TOTAL DOKUMEN RUJUKAN"
          value={`${total} Tautan`}
          helper="Tabel: LAYANAN_SUMBER"
          helperClass="text-slate-400"
          icon={ShieldCheck}
          iconClass="bg-amber-50 text-amber-500"
          round
        />
        <StatCard
          label="TERVERIFIKASI SAH"
          value={`${valid} Valid`}
          helper="verified_at < 90 hari"
          helperClass="text-emerald-600"
          icon={Check}
          iconClass="bg-emerald-50 text-emerald-600"
          round
        />
        <StatCard
          label="KEDALUWARSA / PERLU SK BARU"
          labelClass="text-red-600"
          value={`${expired} Dokumen`}
          valueClass="text-red-600"
          helper="Segera minta OPD perbarui"
          helperClass="text-red-500"
          cardClass="border-red-200"
          icon={TriangleAlert}
          iconClass="bg-red-50 text-red-500"
          round
        />
        <StatCard
          label="PEMINDAI TAUTAN ERROR"
          value={`${data.broken} Broken`}
          helper="Pemindai belum terhubung"
          helperClass="text-slate-400"
          icon={Link2}
          iconClass="bg-sky-50 text-sky-500"
          round
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-bold text-slate-800">
              DAFTAR DOKUMEN RUJUKAN RESMI (LAYANAN_SUMBER)
            </h3>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
              Menampilkan {total} Sumber Rujukan
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={auditLinks}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={12} />
              Audit Broken Link
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ ...EMPTY_SOURCE_FORM, open: true });
                setFormError("");
              }}
              className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-amber-800"
            >
              <Plus size={12} />
              Tambah Sumber SK
            </button>
          </div>
        </div>

        {form.open && (
          <form
            onSubmit={submitForm}
            className="mx-5 mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                Layanan terkait
              </p>
              <input
                autoFocus
                value={form.layanan}
                onChange={(e) => updateForm("layanan", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                layanan_id{" "}
                <span className="font-normal text-slate-400">(cth: LYN-001)</span>
              </p>
              <input
                value={form.layananId}
                onChange={(e) => updateForm("layananId", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                tipe_sumber{" "}
                <span className="font-normal text-slate-400">
                  (cth: PERPRES_NOMOR_96_2018)
                </span>
              </p>
              <input
                value={form.tipe}
                onChange={(e) => updateForm("tipe", e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                URL rujukan regulasi
              </p>
              <input
                value={form.url}
                onChange={(e) => updateForm("url", e.target.value)}
                placeholder="https://"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                className="h-9 rounded-lg bg-amber-700 px-4 text-xs font-semibold text-white transition hover:bg-amber-800"
              >
                Tambah
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_SOURCE_FORM);
                  setFormError("");
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              {formError && (
                <p className="text-[11px] text-red-600">{formError}</p>
              )}
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] font-semibold tracking-wide text-slate-500">
                <th className="w-24 px-5 py-3.5">ID</th>
                <th className="px-3 py-3.5">LAYANAN TERKAIT</th>
                <th className="px-3 py-3.5">
                  TIPE SUMBER
                  <br />
                  (TIPE_SUMBER)
                </th>
                <th className="px-3 py-3.5">URL RUJUKAN REGULASI (URL)</th>
                <th className="px-3 py-3.5">
                  TANGGAL VERIFIKASI
                  <br />
                  (VERIFIED_AT)
                </th>
                <th className="px-3 py-3.5 text-center">
                  STATUS
                  <br />
                  VALIDASI
                </th>
                <th className="px-5 py-3.5 text-center">TINDAKAN</th>
              </tr>
            </thead>

            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-[11px] text-slate-400"
                  >
                    Belum ada sumber rujukan.
                  </td>
                </tr>
              )}

              {data.items.map((item) => {
                const status = SOURCE_STATUS[item.status] || SOURCE_STATUS.pending;
                const safeUrl = /^https?:\/\//i.test(item.url);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 align-middle last:border-b-0"
                  >
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                      {item.id}
                    </td>

                    <td className="px-3 py-4">
                      <p className="text-xs font-semibold leading-4 text-slate-800">
                        {item.layanan}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">
                        layanan_id: {item.layananId}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`inline-block rounded border px-2 py-1 font-mono text-[10px] ${
                          item.status === "expired"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {item.tipe}
                      </span>
                    </td>

                    <td className="max-w-[260px] px-3 py-4">
                      {safeUrl ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all font-mono text-[11px] leading-4 text-blue-600 hover:underline"
                        >
                          {item.url}
                          <ExternalLink size={11} className="ml-1 inline" />
                        </a>
                      ) : (
                        <span className="break-all font-mono text-[11px] text-slate-400">
                          {item.url}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <p className="text-[11px] text-slate-800">
                        {item.verifiedAt}
                      </p>
                      {item.status === "expired" ? (
                        <p className="mt-0.5 text-[10px] text-red-500">
                          {item.note || "Kedaluwarsa"}
                        </p>
                      ) : (
                        item.verifiedBy && (
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            oleh: {item.verifiedBy}
                          </p>
                        )
                      )}
                    </td>

                    <td className="px-3 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.className}`}
                      >
                        {item.status === "valid" && <Check size={10} />}
                        {item.status === "expired" && <CircleAlert size={10} />}
                        {status.label}
                      </span>
                      {item.requested && item.status === "expired" && (
                        <p className="mt-1 text-[9px] text-slate-400">
                          Permintaan dicatat
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {item.status === "expired" && !item.requested ? (
                        <button
                          type="button"
                          onClick={() => requestUpdate(item)}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-semibold leading-3 text-red-600 transition hover:bg-red-100"
                        >
                          Minta
                          <br />
                          Pembaruan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => verify(item)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          {item.status === "pending"
                            ? "Verifikasi"
                            : "Verifikasi Ulang"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ============================================================
// TAB: LAYANAN_EMBEDDING (QDRANT)
// ============================================================

function MetricCard({ label, labelClass, value, valueClass, suffix, sub, subClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-card">
      <p className={`text-[10px] font-bold tracking-wide ${labelClass}`}>
        {label}
      </p>
      <p className={`mt-3 text-lg font-bold ${valueClass}`}>
        {value}
        {suffix && (
          <span className="ml-1 text-sm font-normal text-slate-500">
            {suffix}
          </span>
        )}
      </p>
      <p className={`mt-1 text-[11px] ${subClass}`}>{sub}</p>
    </div>
  );
}

function PlainCheck({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400 ${
          checked
            ? "border-violet-600 bg-violet-600 text-white"
            : "border-slate-300 bg-white"
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      {children}
    </label>
  );
}

// pewarnaan sintaks JSON sederhana (tanpa dangerouslySetInnerHTML)
function highlightJson(json) {
  const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|([{}[\],:])/g;
  const parts = [];
  let last = 0;
  let key = 0;

  for (const match of json.matchAll(pattern)) {
    if (match.index > last) parts.push(json.slice(last, match.index));

    const [, str, colon, num, punct] = match;

    if (str !== undefined && colon) {
      parts.push(
        <span key={key++} className="text-sky-300">
          {str}
        </span>
      );
      parts.push(
        <span key={key++} className="text-slate-400">
          {colon}
        </span>
      );
    } else if (str !== undefined) {
      parts.push(
        <span key={key++} className="text-cyan-200">
          {str}
        </span>
      );
    } else if (num !== undefined) {
      parts.push(
        <span key={key++} className="text-amber-300">
          {num}
        </span>
      );
    } else if (punct !== undefined) {
      parts.push(
        <span key={key++} className="text-slate-400">
          {punct}
        </span>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < json.length) parts.push(json.slice(last));

  return parts;
}

const MONO_INPUT_CLASS = `${INPUT_CLASS} h-11 font-mono`;

function EmbeddingTab({ data, setData }) {
  const [showKey, setShowKey] = useState(false);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  const payloadJson = useMemo(() => JSON.stringify(SAMPLE_PAYLOAD, null, 2), []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="NAMA KOLEKSI (COLLECTION)"
          labelClass="text-violet-600"
          value={<span className="font-mono">ppid_layanan_prod</span>}
          valueClass="text-violet-700"
          sub="Status: Green (Connected)"
          subClass="text-slate-400"
        />
        <MetricCard
          label="TOTAL POINT VEKTOR"
          labelClass="text-violet-600"
          value="4,892 Vectors"
          valueClass="text-slate-900"
          sub="148 Layanan + Chunking"
          subClass="text-emerald-600"
        />
        <MetricCard
          label="DIMENSI & METRIK JARAK"
          labelClass="text-slate-500"
          value="1536 Dim"
          valueClass="text-slate-900"
          suffix="/ Cosine"
          sub="Model: text-embedding-3"
          subClass="text-slate-400"
        />
        <MetricCard
          label="LATENSI RERATA (QUERY)"
          labelClass="text-emerald-600"
          value="38.4 ms"
          valueClass="text-emerald-600"
          sub="Throughput: 142 req/sec"
          subClass="text-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* PARAMETER ENDPOINT */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="text-xs font-bold text-slate-800">
            PARAMETER ENDPOINT & TRIGGER RE-INDEX
          </h3>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="qdrant-host" className="mb-1.5 block text-xs text-slate-800">
                Qdrant Host URI & Port (gRPC / HTTP):
              </label>
              <input
                id="qdrant-host"
                value={data.host}
                onChange={(e) => update("host", e.target.value)}
                className={MONO_INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label htmlFor="qdrant-key" className="mb-1.5 block text-xs text-slate-800">
                  API Key / Bearer Token:
                </label>
                <div className="relative">
                  <input
                    id="qdrant-key"
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    value={data.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="qdrant_sk_live_..."
                    className={`${MONO_INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? "Sembunyikan token" : "Tampilkan token"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="sm:w-36">
                <label htmlFor="qdrant-chunk" className="mb-1.5 block text-xs text-slate-800">
                  Karakter per Chunk:
                </label>
                <input
                  id="qdrant-chunk"
                  type="number"
                  min={1}
                  value={data.chunk}
                  onChange={(e) =>
                    update("chunk", Math.max(1, Number(e.target.value) || 1))
                  }
                  className={MONO_INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-xs font-medium text-slate-800">
                Otomasi Perbaruan Kolom indexed_at
              </p>
              <div className="space-y-2.5">
                <PlainCheck
                  checked={data.autoReindex}
                  onChange={(v) => update("autoReindex", v)}
                >
                  Trigger otomatis re-index saat operator mengedit deskripsi /
                  prosedur
                </PlainCheck>
                <PlainCheck
                  checked={data.snapshot}
                  onChange={(v) => update("snapshot", v)}
                >
                  Simpan snapshot cadangan koleksi ke penyimpanan internal
                  harian
                </PlainCheck>
              </div>
            </div>
          </div>
        </section>

        {/* SAMPEL PAYLOAD */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800">
              SAMPEL PAYLOAD POINT VEKTOR (QDRANT_ID)
            </h3>
            <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 font-mono text-[10px] text-violet-600">
              Point #550e8400
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl bg-slate-900 px-5 py-4">
            <p className="font-mono text-[11px] text-slate-500">
              {"// Skema JSON Payload Qdrant Point"}
            </p>
            <pre className="mt-3 font-mono text-[11px] leading-5 text-slate-200">
              {highlightJson(payloadJson)}
            </pre>
          </div>
        </section>
      </div>
    </>
  );
}

// ============================================================
// TAB: MONITORING_LAYANAN
// ============================================================

function MonitoringTab({ data, setData, onAddKeyword, onNavigate }) {
  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function markDone(id) {
    setData((d) => ({
      ...d,
      failed: d.failed.map((f) => (f.id === id ? { ...f, done: true } : f)),
    }));
  }

  function handleAction(item) {
    if (item.action.type === "draft") {
      return onNavigate("/data-layanan/tambah");
    }

    if (item.action.type === "keyword") {
      onAddKeyword(item.action.value);
    }

    markDone(item.id);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TOTAL PERTANYAAN WARGA"
          value="18,420"
          valueClass="text-slate-900 text-2xl"
          helper="Kolom: jumlah_query"
          helperClass="font-mono text-slate-400"
          icon={MessageCircle}
          iconClass="bg-sky-50 text-sky-500"
          round
        />
        <StatCard
          label="JAWABAN SUKSES (DIJAWAB)"
          labelClass="text-emerald-700"
          value="17,915 (97.2%)"
          valueClass="text-emerald-600 text-2xl"
          helper="Kolom: jumlah_response"
          helperClass="font-mono text-slate-400"
          icon={Check}
          iconClass="bg-emerald-50 text-emerald-600"
          round
        />
        <StatCard
          label="GAGAL / TIDAK DITEMUKAN"
          labelClass="text-brand-600"
          value="505 (2.8%)"
          valueClass="text-brand-600 text-2xl"
          helper="Kolom: failed_response"
          helperClass="font-mono text-slate-400"
          cardClass="border-red-200"
          icon={CircleAlert}
          iconClass="bg-red-50 text-brand-600"
          round
        />
        <StatCard
          label="RERATA SKOR KEPERCAYAAN"
          labelClass="text-violet-600"
          value="0.88 / 1.00"
          valueClass="text-violet-600 text-2xl"
          helper="Kolom: confidence_score"
          helperClass="font-mono text-slate-400"
          icon={Percent}
          iconClass="bg-violet-50 text-violet-600"
          round
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* AMBANG BATAS AKURASI */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800">
              KONFIGURASI AMBANG BATAS AKURASI
              <br />
              (CONFIDENCE_SCORE)
            </h3>
            <span className="shrink-0 rounded-md bg-red-50 px-2 py-1 font-mono text-[10px] text-brand-600">
              Tipe data: float
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <label htmlFor="threshold" className="text-xs text-slate-800">
              Ambang Batas Minimal (Threshold):
            </label>
            <span className="rounded-md bg-red-50 px-2.5 py-1 font-mono text-[11px] font-bold text-brand-600">
              {data.threshold.toFixed(2)}
            </span>
          </div>

          <input
            id="threshold"
            type="range"
            min="0.5"
            max="0.95"
            step="0.01"
            value={data.threshold}
            onChange={(e) => update("threshold", Number(e.target.value))}
            style={{ accentColor: "#981611" }}
            className="mt-4 h-2 w-full cursor-pointer"
          />

          <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-400">
            <span>0.50 (Sangat Fleksibel)</span>
            <span className="font-semibold text-slate-700">
              0.75 (Rekomendasi)
            </span>
            <span>0.95 (Sangat Ketat)</span>
          </div>

          <p className="mt-5 text-[11px] leading-5 text-slate-500">
            Jika kemiripan pertanyaan pengguna terhadap teks di{" "}
            <code className="font-mono font-bold text-brand-600">
              LAYANAN_DETAIL
            </code>{" "}
            bernilai di bawah skor ini, sistem akan mencatatnya sebagai{" "}
            <code className="font-mono font-bold text-brand-600">
              failed_response
            </code>{" "}
            dan mengarahkan warga ke petugas loket pengaduan.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-slate-800">
                Agregasi Periode (periode):
              </p>
              <RedSelect
                value={data.periode}
                onChange={(v) => update("periode", v)}
                options={PERIODE_OPTIONS}
                idleBorder="border-slate-200"
                buttonClassName={SELECT_BUTTON_CLASS}
              />
            </div>

            <div>
              <p className="mb-2 text-xs text-slate-800">
                Top-K Chunk Konteks AI:
              </p>
              <RedSelect
                value={data.topK}
                onChange={(v) => update("topK", v)}
                options={TOPK_OPTIONS}
                idleBorder="border-slate-200"
                buttonClassName={SELECT_BUTTON_CLASS}
              />
            </div>
          </div>
        </section>

        {/* EVALUASI FAILED_RESPONSE */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-800">
              EVALUASI FAILED_RESPONSE TERBARU
            </h3>
            <span className="shrink-0 text-[11px] font-semibold text-brand-600">
              Perlu Penambahan Keyword
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {data.failed.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-slate-800">
                    &quot;{item.query}&quot;
                  </p>
                  <span className="shrink-0 rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] text-red-600">
                    Skor: {item.skor.toFixed(2)}
                  </span>
                </div>

                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  Penyebab: {item.cause}
                </p>

                {item.done ? (
                  <p className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <Check size={12} />
                    Sudah ditindaklanjuti
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(item)}
                    className="mt-2.5 text-[11px] font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                  >
                    + {item.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function Pengaturan() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("instansi");

  const [form, setForm] = useState(defaultForm);
  const [wilayahList, setWilayahList] = useState([]);

  const [config, setConfig] = useState(loadConfig);

  const [connection, setConnection] = useState("checking");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, text }

  const tab = TABS.find((t) => t.id === activeTab);
  const isInstansi = activeTab === "instansi";

  // ==========================================================
  // INITIAL
  // ==========================================================

  useEffect(() => {
    checkConnection();
    loadWilayah();
  }, []);

  async function checkConnection() {
    setConnection("checking");

    try {
      const result = await apiRequest("/layanan?page=1&limit=1");
      setConnection(result && result.success === true ? "connected" : "error");
    } catch (err) {
      console.error("Koneksi backend gagal:", err);
      setConnection("error");
    }
  }

  async function loadWilayah() {
    try {
      const result = await apiRequest("/wilayah");
      setWilayahList(result?.data || []);
    } catch (err) {
      console.error("Gagal mengambil wilayah:", err);
    }
  }

  // ==========================================================
  // OPSI DROPDOWN (tab Instansi)
  // ==========================================================

  const levelOptions = useMemo(() => {
    const levels = [
      ...new Set(wilayahList.map(getLevelFromWilayah).filter(Boolean)),
    ].sort((a, b) => {
      const ia = LEVEL_ORDER.indexOf(a);
      const ib = LEVEL_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return [
      { value: "", label: "Pilih level pemerintahan" },
      ...levels.map((l) => ({ value: l, label: l })),
    ];
  }, [wilayahList]);

  const wilayahOptions = useMemo(() => {
    const filtered = form.level
      ? wilayahList.filter((w) => getLevelFromWilayah(w) === form.level)
      : wilayahList;

    return [
      { value: "", label: "Pilih wilayah" },
      ...filtered.map((w) => ({ value: String(w.id), label: w.nama })),
    ];
  }, [wilayahList, form.level]);

  // ==========================================================
  // HANDLER (tab Instansi)
  // ==========================================================

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  function handleLevelChange(level) {
    setForm((current) => {
      const selected = wilayahList.find(
        (w) => String(w.id) === current.wilayah_id
      );
      const stillValid = selected && getLevelFromWilayah(selected) === level;

      return {
        ...current,
        level,
        wilayah_id: stillValid || !level ? current.wilayah_id : "",
      };
    });
    setFeedback(null);
  }

  function handleWilayahChange(wilayahId) {
    const selected = wilayahList.find((w) => String(w.id) === wilayahId);

    setForm((current) => ({
      ...current,
      wilayah_id: wilayahId,
      level: selected ? getLevelFromWilayah(selected) : current.level,
    }));
    setFeedback(null);
  }

  async function saveInstansi() {
    if (!form.wilayah_id) {
      return setFeedback({ type: "error", text: "Wilayah wajib dipilih." });
    }
    if (!form.level) {
      return setFeedback({
        type: "error",
        text: "Level pemerintahan tidak dapat ditentukan dari wilayah.",
      });
    }
    if (!form.kode_instansi.trim()) {
      return setFeedback({ type: "error", text: "kode_instansi wajib diisi." });
    }
    if (!form.nama_instansi.trim()) {
      return setFeedback({ type: "error", text: "nama_instansi wajib diisi." });
    }

    setSaving(true);

    // level_id tidak dikirim: backend menentukannya dari wilayah.tipe
    const payload = {
      wilayah_id: Number(form.wilayah_id),
      kode_instansi: form.kode_instansi.trim(),
      nama_instansi: form.nama_instansi.trim(),
      singkatan: form.singkatan.trim(),
      website: form.website.trim(),
      aktif: Boolean(form.aktif),
    };

    try {
      const result = await apiRequest("/instansi", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result && result.success === false) {
        throw new Error(result.message || "Gagal menyimpan instansi.");
      }

      setFeedback({ type: "success", text: "Instansi berhasil disimpan." });
      setForm(defaultForm);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal menyimpan instansi.",
      });
    } finally {
      setSaving(false);
    }
  }

  function notify(type, text) {
    setFeedback({ type, text });
  }

  // tab selain Instansi disimpan di browser (localStorage).
  // API key Qdrant sengaja tidak ikut disimpan.
  function saveLocalConfig(message) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...config,
          embedding: { ...config.embedding, apiKey: "" },
        })
      );
      notify("success", message);
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi:", err);
      notify("error", "Gagal menyimpan konfigurasi.");
    }
  }

  const SAVE_MESSAGES = {
    keyword: "Format isian detail & keyword disimpan.",
    kategori: "Konfigurasi kategori & status disimpan.",
    sumber: "Konfigurasi layanan sumber disimpan.",
    embedding:
      "Konfigurasi embedding disimpan (API key tidak disimpan di browser).",
    monitoring: "Konfigurasi monitoring disimpan.",
  };

  function handleSave() {
    setFeedback(null);

    if (activeTab === "instansi") return saveInstansi();

    saveLocalConfig(SAVE_MESSAGES[activeTab]);
  }

  const DEFAULT_CONFIG_BY_TAB = {
    keyword: ["detail", DEFAULT_DETAIL],
    kategori: ["kategori", DEFAULT_KATEGORI],
    sumber: ["sumber", DEFAULT_SUMBER],
    embedding: ["embedding", DEFAULT_EMBEDDING],
    monitoring: ["monitoring", DEFAULT_MONITORING],
  };

  function handleReset() {
    setFeedback(null);

    if (activeTab === "instansi") return setForm(defaultForm);

    const [key, defaults] = DEFAULT_CONFIG_BY_TAB[activeTab];
    setConfig((c) => ({ ...c, [key]: defaults }));
  }

  // updater untuk tab: menerima fungsi (d) => d baru
  const makeSetter = (key) => (updater) =>
    setConfig((c) => ({ ...c, [key]: updater(c[key]) }));

  const setDetail = makeSetter("detail");
  const setKategori = makeSetter("kategori");
  const setSumber = makeSetter("sumber");
  const setEmbedding = makeSetter("embedding");
  const setMonitoring = makeSetter("monitoring");

  // dipakai tab Monitoring: tambah kata kunci ke kamus Detail & Keyword
  function addKeywordToDictionary(text) {
    const keyword = String(text).trim().toLowerCase();
    if (!keyword) return;

    setConfig((c) => {
      if (c.detail.keywords.some((k) => k.text === keyword)) return c;

      return {
        ...c,
        detail: {
          ...c.detail,
          keywords: [...c.detail.keywords, { text: keyword, count: 0 }],
        },
      };
    });

    notify(
      "success",
      `Kata kunci "${keyword}" ditambahkan ke kamus. Klik Simpan di tab Detail & Keyword untuk menyimpannya.`
    );
  }

  // ==========================================================
  // STATUS KONEKSI (header)
  // ==========================================================

  const dbBadge =
    connection === "connected"
      ? { tone: "green", text: "Relational DB: Connected" }
      : connection === "checking"
      ? { tone: "gray", text: "Relational DB: Memeriksa..." }
      : { tone: "red", text: "Relational DB: Terputus" };

  const syncBadge =
    connection === "connected"
      ? { tone: "blue", text: "Sync Status: 200 OK" }
      : connection === "checking"
      ? { tone: "gray", text: "Sync Status: Memeriksa..." }
      : { tone: "red", text: "Sync Status: Error" };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Topbar
        title="Pengaturan"
        subtitle="Pusat konfigurasi kebijakan & sistem portal Layanan Informasi Publik"
      />

      <main className="flex-1 bg-slate-100 p-4 lg:p-6">
        <Breadcrumb
          items={[
            { label: "Beranda", to: "/dashboard" },
            { label: "Pengaturan" },
            { label: tab.crumb },
          ]}
        />

        <div className="mt-6 space-y-4">
          {/* ================= HEADER KONFIGURASI ================= */}

          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-brand-600">
                <SlidersHorizontal size={16} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-800">
                    Konfigurasi Skema Basis Data & AI Layanan
                  </h2>

                  <Badge tone={connection === "error" ? "red" : "green"}>
                    {connection === "error"
                      ? "PostgreSQL Offline"
                      : "PostgreSQL Live"}
                  </Badge>
                  <Badge tone="purple">Qdrant Cluster v12.2.0</Badge>
                </div>

                <p className="mt-1 max-w-md text-[11px] leading-4 text-slate-500">
                  Parameter operasional entitas relasi tabel: INSTANSI,
                  LAYANAN, SUMBER, KEYWORD, EMBEDDING & MONITORING
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:max-w-[420px] lg:justify-start">
              <Badge tone={dbBadge.tone}>
                {connection === "connected" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
                {dbBadge.text}
              </Badge>

              <Badge tone="purple">
                <Zap size={10} />
                Vector Latency: 38ms
              </Badge>

              <Badge tone={syncBadge.tone}>
                <span className="h-2.5 w-2.5 rounded-full border border-current" />
                {syncBadge.text}
              </Badge>
            </div>
          </section>

          {/* ================= TAB ================= */}

          <nav
            role="tablist"
            className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 shadow-card"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.id === activeTab;

              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveTab(t.id);
                    setFeedback(null);
                  }}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-xs transition ${
                    active
                      ? "border-brand-600 bg-brand-50/60 font-bold text-brand-600"
                      : "border-transparent font-medium text-slate-600 hover:text-brand-600"
                  }`}
                >
                  <Icon
                    size={14}
                    className={active ? "text-brand-600" : "text-slate-400"}
                  />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* ================= ISI TAB ================= */}

          {activeTab === "keyword" && (
            <DetailKeywordTab
              data={config.detail}
              setData={setDetail}
              onSave={() =>
                saveLocalConfig("Format isian detail & keyword disimpan.")
              }
            />
          )}

          {activeTab === "kategori" && (
            <KategoriStatusTab data={config.kategori} setData={setKategori} />
          )}

          {activeTab === "sumber" && (
            <SumberTab
              data={config.sumber}
              setData={setSumber}
              notify={notify}
            />
          )}

          {activeTab === "embedding" && (
            <EmbeddingTab data={config.embedding} setData={setEmbedding} />
          )}

          {activeTab === "monitoring" && (
            <MonitoringTab
              data={config.monitoring}
              setData={setMonitoring}
              onAddKeyword={addKeywordToDictionary}
              onNavigate={navigate}
            />
          )}

          {isInstansi && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-card">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Database size={16} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-800">
                      {tab.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {tab.desc}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 self-start rounded-md bg-slate-100 px-3 py-2 font-mono text-[11px] text-slate-500 sm:self-center">
                  Schema: {tab.schema}
                </span>
              </div>

              {(
                <div className="px-5 py-5">
                  <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-3">
                    <Field name="kode_instansi" type="varchar">
                      <input
                        value={form.kode_instansi}
                        onChange={(e) =>
                          setField("kode_instansi", e.target.value)
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>

                    <Field name="nama_instansi" type="varchar">
                      <input
                        value={form.nama_instansi}
                        onChange={(e) =>
                          setField("nama_instansi", e.target.value)
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>

                    <Field name="singkatan" type="varchar">
                      <input
                        value={form.singkatan}
                        onChange={(e) => setField("singkatan", e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </Field>

                    <Field
                      name="Relasi level_id"
                      type="FK: LEVEL_PEMERINTAHAN.id"
                    >
                      <RedSelect
                        value={form.level}
                        onChange={handleLevelChange}
                        options={levelOptions}
                        idleBorder="border-slate-200"
                        buttonClassName={SELECT_BUTTON_CLASS}
                      />
                    </Field>

                    <Field name="Relasi wilayah_id" type="FK: WILAYAH.id">
                      <RedSelect
                        value={form.wilayah_id}
                        onChange={handleWilayahChange}
                        options={wilayahOptions}
                        idleBorder="border-slate-200"
                        buttonClassName={SELECT_BUTTON_CLASS}
                      />
                    </Field>

                    <Field name="website" type="varchar">
                      <input
                        value={form.website}
                        onChange={(e) => setField("website", e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </Field>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-6 border-t border-slate-100 pt-5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        Kolom boolean: aktif
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        Jika bernilai false (nonaktif), seluruh entitas LAYANAN
                        yang merujuk instansi ini akan dinonaktifkan dari API
                        publik.
                      </p>
                    </div>

                    <Switch
                      checked={form.aktif}
                      onChange={(v) => setField("aktif", v)}
                      label="Kolom boolean aktif"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ================= FOOTER AKSI ================= */}

          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <p
              className={`flex items-center gap-2 text-[11px] ${
                feedback?.type === "success"
                  ? "text-emerald-700"
                  : feedback?.type === "error"
                  ? "text-red-600"
                  : "text-slate-500"
              }`}
            >
              {feedback?.type === "success" ? (
                <Check size={14} className="shrink-0" />
              ) : (
                <CircleAlert
                  size={14}
                  className={`shrink-0 ${
                    feedback?.type === "error"
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}
                />
              )}
              {feedback
                ? feedback.text
                : "Konfigurasi disinkronkan langsung dengan metadata skema ERD live."}
            </p>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset ke Default
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={14} />
                {saving ? "Menyimpan..." : "Simpan & Terapkan Skema ERD"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
