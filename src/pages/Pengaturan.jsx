import { useEffect, useMemo, useRef, useState } from "react";

import {
  SlidersHorizontal,
  IdCard,
  Globe,
  Settings,
  Shield,
  Activity,
  Mail,
  Phone,
  MapPin,
  KeyRound,
  Check,
} from "lucide-react";

import Topbar from "../components/Topbar";
import RedSelect from "../components/RedSelect";
import logoJogja from "../assets/logo_jogja.png";

import { apiRequest } from "../services/api";

// ============================================================
// MENU PENGATURAN
// ============================================================

const SECTIONS = [
  {
    id: "profil",
    title: "Profil Admin PPID",
    desc: "Data diri, jabatan & tanda tangan",
    icon: IdCard,
  },
  {
    id: "identitas",
    title: "Identitas Umum Portal",
    desc: "Nama aplikasi, logo & kontak resmi",
    icon: Globe,
  },
  {
    id: "integrasi",
    title: "Integrasi AI & Qdrant",
    desc: "Vector DB, model LLM & threshold",
    icon: Settings,
  },
  {
    id: "keamanan",
    title: "Keamanan & Log Akses",
    desc: "Password, 2FA OTP & riwayat sesi",
    icon: Shield,
  },
];

// ============================================================
// DATA AWAL
// ============================================================

const EMBEDDING_OPTIONS = [
  {
    value: "text-embedding-3-large",
    label: "text-embedding-3-large (1536 dims)",
  },
  {
    value: "text-embedding-3-small",
    label: "text-embedding-3-small (1536 dims)",
  },
  {
    value: "multilingual-e5-large",
    label: "multilingual-e5-large (1024 dims)",
  },
];

const LLM_OPTIONS = [
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro / RAG IndoGov" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Low Latency)" },
  { value: "llama-3.3-70b", label: "Llama-3.3-70B-Instruct-DIY" },
];

const TOPK_OPTIONS = [
  { value: "3", label: "3 Chunks" },
  { value: "5", label: "5 Chunks" },
  { value: "7", label: "7 Chunks" },
  { value: "10", label: "10 Chunks" },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function buildDefaults() {
  const user = getStoredUser();

  return {
    profil: {
      nama: user?.username || "",
      nip: "",
      email: "",
      whatsapp: "",
      jabatan: "",
      wilayah: "Semua Wilayah",
      foto: "",
      updatedAt: "",
    },
    identitas: {
      namaSistem: "Layanan Informasi Publik • Direktori AI Pemda DIY",
      namaAsisten: "Laras — Layanan Aspirasi & Informasi Digital Terpadu",
      email: "ppid@jogjaprov.go.id",
      telepon: "(0274) 512709 / 112",
      alamat:
        "Kompleks Kepatihan, Danurejan, Jl. Malioboro, Kota Yogyakarta, Daerah Istimewa Yogyakarta 55213",
      maklumat:
        "Dengan ini kami menyatakan sanggup menyelenggarakan pelayanan informasi publik sesuai standar yang telah ditetapkan secara cepat, tepat, biaya ringan, dan transparan bagi seluruh masyarakat Daerah Istimewa Yogyakarta.",
      logo: "",
    },
    integrasi: {
      host: "https://qdrant-cluster-diy.jogjaprov.go.id:6333",
      collection: "diy_layanan_publik_v2",
      embedding: "text-embedding-3-large",
      llm: "gemini-2.5-flash",
      threshold: 76,
      autoReindex: true,
      topK: "5",
    },
    keamanan: {
      twoFA: true,
    },
  };
}

// ============================================================
// PENYIMPANAN LOKAL (per bagian)
// ============================================================

const STORAGE_KEY = "pengaturan_sistem";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function loadConfig() {
  const defaults = buildDefaults();
  const saved = readStore();

  return {
    profil: { ...defaults.profil, ...(saved.profil || {}) },
    identitas: { ...defaults.identitas, ...(saved.identitas || {}) },
    integrasi: { ...defaults.integrasi, ...(saved.integrasi || {}) },
    keamanan: { ...defaults.keamanan, ...(saved.keamanan || {}) },
  };
}

// menyimpan satu bagian saja, tanpa ikut menyimpan draf bagian lain
function writeSection(key, value) {
  const store = readStore();
  store[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatWaktuWIB(date = new Date()) {
  const tanggal = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const jam = date
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    })
    .replace(".", ":");

  return { tanggal, jam };
}

function describeDevice() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
    ? "Opera"
    : /Firefox\//.test(ua)
    ? "Firefox"
    : /Chrome\//.test(ua)
    ? "Chrome"
    : /Safari\//.test(ua)
    ? "Safari"
    : "Browser";

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Mac OS X/.test(ua)
    ? "macOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "OS tidak dikenal";

  return `${browser} • ${os}`;
}

function getInitials(nama) {
  const words = String(nama || "")
    .replace(/,.*$/, "")
    .split(/\s+/)
    .filter((w) => w && !/\.$/.test(w));

  const source = words.length ? words : String(nama || "").split(/\s+/);

  return (
    source
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "A"
  );
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_IMAGE_KB = 300;

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      return reject(new Error("Format harus PNG, JPG, WEBP, atau SVG."));
    }
    if (file.size > MAX_IMAGE_KB * 1024) {
      return reject(new Error(`Ukuran gambar maksimal ${MAX_IMAGE_KB} KB.`));
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

// ============================================================
// KOMPONEN KECIL
// ============================================================

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/30";

const SELECT_BUTTON_CLASS = "h-10 bg-slate-50 px-3 text-[13px] text-slate-800";

function Label({ children, required, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-slate-800"
    >
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

function IconInput({ icon, children }) {
  const Icon = icon;

  return (
    <div className="relative">
      <Icon
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      {children}
    </div>
  );
}

function BrandCheck({ checked, onChange, label }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 ${
          checked
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-slate-300 bg-white"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({ title, desc, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{desc}</p>
      </div>
      {action}
    </div>
  );
}

const NOTICE_STYLES = {
  success: "text-emerald-700",
  error: "text-red-600",
  info: "text-slate-600",
};

function SaveBar({ hint, notice, label, onSave }) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p
        role="status"
        className={`text-[11px] ${
          notice ? NOTICE_STYLES[notice.type] : "text-slate-400"
        }`}
      >
        {notice ? notice.text : hint}
      </p>

      <button
        type="button"
        onClick={onSave}
        className="shrink-0 rounded-lg bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700"
      >
        {label}
      </button>
    </div>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s()/-]{6,}$/;

// ============================================================
// BAGIAN: PROFIL ADMIN PPID
// ============================================================

function ProfilSection({ data, setData, wilayahList, notice, notify, onSave }) {
  const fileRef = useRef(null);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
    notify(null);
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      update("foto", await readImageFile(file));
    } catch (err) {
      notify({ type: "error", text: err.message });
    }
  }

  const wilayahOptions = useMemo(
    () => [
      { value: "Semua Wilayah", label: "Semua Wilayah" },
      ...wilayahList.map((w) => ({ value: w.nama, label: w.nama })),
    ],
    [wilayahList]
  );

  const subtitle = [
    data.nip ? `NIP. ${data.nip}` : "NIP belum diisi",
    data.jabatan,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {data.foto ? (
            <img
              src={data.foto}
              alt="Foto profil"
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              {getInitials(data.nama)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {data.nama || "Nama belum diisi"}
              </h2>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                Super Admin
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={handlePhoto}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ubah Foto Profil
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        <div>
          <Label required htmlFor="p-nama">
            Nama Lengkap & Gelar
          </Label>
          <input
            id="p-nama"
            value={data.nama}
            onChange={(e) => update("nama", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <Label required htmlFor="p-nip">
            NIP (Nomor Induk Pegawai)
          </Label>
          <input
            id="p-nip"
            inputMode="numeric"
            value={data.nip}
            onChange={(e) => update("nip", e.target.value)}
            placeholder="18 digit, contoh: 19680412 199303 1 008"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <Label required htmlFor="p-email">
            Email Kedinasan (@jogjaprov.go.id)
          </Label>
          <IconInput icon={Mail}>
            <input
              id="p-email"
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="nama@jogjaprov.go.id"
              className={`${INPUT_CLASS} pl-9`}
            />
          </IconInput>
        </div>

        <div>
          <Label required htmlFor="p-wa">
            Nomor WhatsApp Kedinasan
          </Label>
          <IconInput icon={Phone}>
            <input
              id="p-wa"
              type="tel"
              value={data.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="+62 811-0000-0000"
              className={`${INPUT_CLASS} pl-9`}
            />
          </IconInput>
        </div>

        <div>
          <Label htmlFor="p-jabatan">Jabatan Struktural</Label>
          <input
            id="p-jabatan"
            value={data.jabatan}
            onChange={(e) => update("jabatan", e.target.value)}
            placeholder="Contoh: Ketua PPID Utama Provinsi D.I. Yogyakarta"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <Label>Cakupan Wilayah Otoritas</Label>
          <RedSelect
            value={data.wilayah}
            onChange={(v) => update("wilayah", v)}
            options={wilayahOptions}
            idleBorder="border-slate-200"
            buttonClassName={SELECT_BUTTON_CLASS}
          />
        </div>
      </div>

      <SaveBar
        hint={
          data.updatedAt
            ? `Terakhir diperbarui: ${data.updatedAt}`
            : "Belum ada perubahan yang disimpan."
        }
        notice={notice}
        label="Simpan Profil"
        onSave={onSave}
      />
    </Card>
  );
}

// ============================================================
// BAGIAN: IDENTITAS UMUM PORTAL
// ============================================================

function IdentitasSection({ data, setData, notice, notify, onSave }) {
  const fileRef = useRef(null);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
    notify(null);
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      update("logo", await readImageFile(file));
    } catch (err) {
      notify({ type: "error", text: err.message });
    }
  }

  return (
    <Card>
      <SectionHeading
        title="Identitas Aplikasi & Kontak Resmi Layanan Informasi Publik"
        desc="Informasi ini ditampilkan pada header dashboard, cetakan laporan resmi PPID, serta footer Chatbot Laras"
      />

      <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <img
            src={data.logo || logoJogja}
            alt="Logo aplikasi"
            className="h-14 w-14 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">
              Logo Resmi Pemerintah Daerah D.I. Yogyakarta
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Digunakan pada Sidebar Admin, Chatbot Laras, dan Kop Surat Laporan
              PDF (Format SVG/PNG Transparan)
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={handleLogo}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ganti Logo
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        <div>
          <Label required htmlFor="i-sistem">
            Nama Sistem / Aplikasi
          </Label>
          <input
            id="i-sistem"
            value={data.namaSistem}
            onChange={(e) => update("namaSistem", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <Label required htmlFor="i-asisten">
            Nama Asisten AI Publik (Chatbot)
          </Label>
          <input
            id="i-asisten"
            value={data.namaAsisten}
            onChange={(e) => update("namaAsisten", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <Label required htmlFor="i-email">
            Email Pusat Bantuan PPID
          </Label>
          <input
            id="i-email"
            type="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <Label required htmlFor="i-telp">
            Telepon / Call Center Layanan
          </Label>
          <input
            id="i-telp"
            value={data.telepon}
            onChange={(e) => update("telepon", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="md:col-span-2">
          <Label required htmlFor="i-alamat">
            Alamat Sekretariat PPID Utama
          </Label>
          <IconInput icon={MapPin}>
            <input
              id="i-alamat"
              value={data.alamat}
              onChange={(e) => update("alamat", e.target.value)}
              className={`${INPUT_CLASS} pl-9`}
            />
          </IconInput>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="i-maklumat">Maklumat Pelayanan Informasi Publik</Label>
          <textarea
            id="i-maklumat"
            rows={4}
            value={data.maklumat}
            onChange={(e) => update("maklumat", e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-800 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/30"
          />
        </div>
      </div>

      <SaveBar
        hint="Perubahan disimpan di browser ini."
        notice={notice}
        label="Simpan Identitas"
        onSave={onSave}
      />
    </Card>
  );
}

// ============================================================
// BAGIAN: INTEGRASI AI & QDRANT
// ============================================================

function IntegrasiSection({ data, setData, notice, notify, onSave }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
    notify(null);
  }

  // tes dijalankan dari browser, jadi bisa gagal karena CORS / jaringan
  async function testConnection() {
    setTestResult(null);

    let base;
    try {
      base = new URL(data.host.trim());
      if (!/^https?:$/.test(base.protocol)) throw new Error("protocol");
    } catch {
      return setTestResult({
        type: "error",
        text: "Endpoint harus berupa URL http:// atau https:// yang valid.",
      });
    }

    const collection = data.collection.trim();
    if (!collection) {
      return setTestResult({
        type: "error",
        text: "Nama collection wajib diisi.",
      });
    }

    setTesting(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `${base.origin}/collections/${encodeURIComponent(collection)}`;
      const res = await fetch(url, { signal: controller.signal });

      if (res.ok) {
        setTestResult({
          type: "success",
          text: `Koneksi berhasil, collection "${collection}" ditemukan.`,
        });
      } else if (res.status === 404) {
        setTestResult({
          type: "error",
          text: `Server terjangkau, tetapi collection "${collection}" tidak ditemukan.`,
        });
      } else if (res.status === 401 || res.status === 403) {
        setTestResult({
          type: "info",
          text: `Server terjangkau, tetapi menolak akses (HTTP ${res.status}). Kemungkinan butuh API key.`,
        });
      } else {
        setTestResult({
          type: "error",
          text: `Server menjawab dengan HTTP ${res.status}.`,
        });
      }
    } catch (err) {
      setTestResult({
        type: "error",
        text:
          err?.name === "AbortError"
            ? "Waktu tunggu habis (6 detik)."
            : "Tidak dapat terhubung. Penyebab umum: server mati, jaringan internal, sertifikat, atau CORS dari browser.",
      });
    } finally {
      clearTimeout(timer);
      setTesting(false);
    }
  }

  return (
    <Card>
      <SectionHeading
        title="Konfigurasi Vector Database (Qdrant) & Parameter RAG Chatbot"
        desc="Pengaturan koneksi ke koleksi vektor `LAYANAN_EMBEDDING` dan batas ambang `confidence_score`"
        action={
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            <Activity size={13} />
            {testing ? "Menguji..." : "Tes Koneksi Qdrant"}
          </button>
        }
      />

      {testResult && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${
            testResult.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : testResult.type === "info"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {testResult.text}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        <div>
          <Label required htmlFor="q-host">
            Endpoint Host Qdrant Vector DB
          </Label>
          <input
            id="q-host"
            value={data.host}
            onChange={(e) => update("host", e.target.value)}
            className={`${INPUT_CLASS} font-mono text-xs`}
          />
        </div>

        <div>
          <Label required htmlFor="q-collection">
            Nama Collection (`collection`)
          </Label>
          <input
            id="q-collection"
            value={data.collection}
            onChange={(e) => update("collection", e.target.value)}
            className={`${INPUT_CLASS} font-mono text-xs`}
          />
        </div>

        <div>
          <Label required>Model Embedding Teks</Label>
          <RedSelect
            value={data.embedding}
            onChange={(v) => update("embedding", v)}
            options={EMBEDDING_OPTIONS}
            idleBorder="border-slate-200"
            buttonClassName={SELECT_BUTTON_CLASS}
          />
        </div>

        <div>
          <Label required>Model LLM Generatif (Chatbot Laras)</Label>
          <RedSelect
            value={data.llm}
            onChange={(v) => update("llm", v)}
            options={LLM_OPTIONS}
            idleBorder="border-slate-200"
            buttonClassName={SELECT_BUTTON_CLASS}
          />
        </div>
      </div>

      {/* AMBANG BATAS */}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <label
              htmlFor="q-threshold"
              className="text-xs font-bold text-slate-900"
            >
              Ambang Batas Minimum Confidence Score (`confidence_score`)
            </label>
            <p className="mt-1 text-[11px] text-slate-500">
              Jika kemiripan vektor di bawah angka ini, Chatbot Laras akan
              meminta klarifikasi atau mengarahkan ke kontak PPID
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold text-white">
            {data.threshold}%
          </span>
        </div>

        <input
          id="q-threshold"
          type="range"
          min={50}
          max={95}
          step={1}
          value={data.threshold}
          onChange={(e) => update("threshold", Number(e.target.value))}
          style={{ accentColor: "#981611" }}
          className="mt-4 h-2 w-full cursor-pointer"
        />

        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
          <span>50% (Longgar)</span>
          <span className="font-semibold text-slate-700">
            75% (Rekomendasi Optimal)
          </span>
          <span>95% (Sangat Ketat)</span>
        </div>
      </div>

      {/* AUTO RE-INDEX & TOP-K */}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">
              Auto Re-Index Saat SOP Disimpan
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Otomatis perbarui vektor di Qdrant setiap kali admin
              menambah/mengubah layanan
            </p>
          </div>
          <BrandCheck
            checked={data.autoReindex}
            onChange={(v) => update("autoReindex", v)}
            label={<span className="sr-only">Auto re-index</span>}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">
              Jumlah Dokumen Konteks (Top-K)
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Jumlah potongan SOP yang dikirim ke prompt AI per pertanyaan
            </p>
          </div>
          <RedSelect
            value={data.topK}
            onChange={(v) => update("topK", v)}
            options={TOPK_OPTIONS}
            className="w-28 shrink-0"
            idleBorder="border-slate-200"
            buttonClassName="h-9 bg-white px-3 text-[13px] text-slate-800"
          />
        </div>
      </div>

      <SaveBar
        hint="Perubahan disimpan di browser ini."
        notice={notice}
        label="Simpan Integrasi"
        onSave={onSave}
      />
    </Card>
  );
}

// ============================================================
// BAGIAN: KEAMANAN & LOG AKSES
// ============================================================

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

function KeamananSection({
  data,
  setData,
  profil,
  notice,
  notify,
  onSave,
  onOtherDevices,
}) {
  const [pw, setPw] = useState(EMPTY_PASSWORDS);

  // satu baris log nyata: sesi yang sedang dipakai
  const session = useMemo(() => {
    const { tanggal, jam } = formatWaktuWIB();
    return { tanggal, jam, device: describeDevice() };
  }, []);

  function updatePw(field, value) {
    setPw((p) => ({ ...p, [field]: value }));
    notify(null);
  }

  function handleSave() {
    const filled = pw.current || pw.next || pw.confirm;

    if (filled) {
      let error = "";

      if (!pw.current) error = "Kata sandi saat ini wajib diisi.";
      else if (pw.next.length < 8)
        error = "Kata sandi baru minimal 8 karakter.";
      else if (!/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next))
        error = "Kata sandi baru harus kombinasi huruf dan angka.";
      else if (pw.next === pw.current)
        error = "Kata sandi baru tidak boleh sama dengan yang lama.";
      else if (pw.next !== pw.confirm)
        error = "Konfirmasi kata sandi baru tidak cocok.";

      if (error) return notify({ type: "error", text: error });
    }

    onSave(Boolean(filled));
    setPw(EMPTY_PASSWORDS);
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeading
          title="Pembaruan Kata Sandi & Autentikasi Dua Faktor (2FA)"
          desc="Standar keamanan akses informasi publik Pemerintah Daerah D.I. Yogyakarta"
        />

        <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-3">
          <div>
            <Label required htmlFor="k-now">
              Kata Sandi Saat Ini
            </Label>
            <input
              id="k-now"
              type="password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => updatePw("current", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <Label required htmlFor="k-new">
              Kata Sandi Baru
            </Label>
            <input
              id="k-new"
              type="password"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => updatePw("next", e.target.value)}
              placeholder="Minimal 8 karakter kombinasi..."
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <Label required htmlFor="k-confirm">
              Konfirmasi Kata Sandi Baru
            </Label>
            <input
              id="k-confirm"
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => updatePw("confirm", e.target.value)}
              placeholder="Ulangi kata sandi baru..."
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <KeyRound size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">
                Autentikasi Dua Faktor (2FA) via SSO JogjaPass / Google
                Authenticator
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Wajibkan verifikasi kode OTP setiap kali login dari perangkat
                baru
              </p>
            </div>
          </div>

          <BrandCheck
            checked={data.twoFA}
            onChange={(v) => {
              setData((d) => ({ ...d, twoFA: v }));
              notify(null);
            }}
            label="Aktifkan 2FA"
          />
        </div>

        <SaveBar
          hint="Preferensi 2FA disimpan di browser ini."
          notice={notice}
          label="Simpan Keamanan"
          onSave={handleSave}
        />
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-wide text-slate-900">
              LOG AKTIVITAS & RIWAYAT SESI LOGIN ADMIN
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Pemantauan jejak audit akses dashboard dalam 7 hari terakhir
            </p>
          </div>

          <button
            type="button"
            onClick={onOtherDevices}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            Keluarkan Perangkat Lain
          </button>
        </div>

        <div className="mt-5 overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[10px] font-semibold tracking-wide text-slate-400">
                <th className="px-4 py-4">WAKTU AKSES</th>
                <th className="px-4 py-4">PENGGUNA / ROLE</th>
                <th className="px-4 py-4">AKTIVITAS AUDIT</th>
                <th className="px-4 py-4">ALAMAT IP & PERANGKAT</th>
                <th className="px-4 py-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 align-middle">
                <td className="px-4 py-5 font-mono text-[11px] text-slate-500">
                  {session.tanggal} • {session.jam} WIB
                </td>
                <td className="px-4 py-5 text-xs font-bold text-slate-900">
                  {profil.nama || "Admin PPID"} (Super Admin)
                </td>
                <td className="px-4 py-5 text-xs text-slate-700">
                  Sesi dashboard aktif
                </td>
                <td className="px-4 py-5 font-mono text-[11px] leading-4 text-slate-500">
                  IP tidak tersedia di sisi klien
                  <br />
                  {session.device}
                </td>
                <td className="px-4 py-5 text-center">
                  <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    Sesi Aktif
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function Pengaturan() {
  const [activeSection, setActiveSection] = useState("profil");
  const [config, setConfig] = useState(loadConfig);
  const [wilayahList, setWilayahList] = useState([]);
  const [notices, setNotices] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadWilayah() {
      try {
        const result = await apiRequest("/wilayah");
        if (!cancelled) setWilayahList(result?.data || []);
      } catch (err) {
        console.error("Gagal mengambil wilayah:", err);
      }
    }

    loadWilayah();

    return () => {
      cancelled = true;
    };
  }, []);

  const notify = (section) => (notice) =>
    setNotices((n) => ({ ...n, [section]: notice }));

  const makeSetter = (key) => (updater) =>
    setConfig((c) => ({ ...c, [key]: updater(c[key]) }));

  function persist(key, value, successText) {
    try {
      writeSection(key, value);
      notify(key)({ type: "success", text: successText });
      return true;
    } catch (err) {
      console.error("Gagal menyimpan pengaturan:", err);
      notify(key)({
        type: "error",
        text: "Gagal menyimpan. Penyimpanan browser penuh atau tidak tersedia.",
      });
      return false;
    }
  }

  // ----- simpan: profil -----

  function saveProfil() {
    const d = config.profil;
    const nipDigits = d.nip.replace(/\D/g, "");

    let error = "";
    if (!d.nama.trim()) error = "Nama lengkap wajib diisi.";
    else if (nipDigits.length !== 18) error = "NIP harus terdiri dari 18 digit.";
    else if (!EMAIL_PATTERN.test(d.email.trim()))
      error = "Format email kedinasan tidak valid.";
    else if (!PHONE_PATTERN.test(d.whatsapp.trim()))
      error = "Format nomor WhatsApp tidak valid.";

    if (error) return notify("profil")({ type: "error", text: error });

    const { tanggal, jam } = formatWaktuWIB();
    const next = { ...d, updatedAt: `${tanggal} pukul ${jam} WIB` };

    if (persist("profil", next, "Profil berhasil disimpan.")) {
      setConfig((c) => ({ ...c, profil: next }));
    }
  }

  // ----- simpan: identitas -----

  function saveIdentitas() {
    const d = config.identitas;

    let error = "";
    if (!d.namaSistem.trim()) error = "Nama sistem wajib diisi.";
    else if (!d.namaAsisten.trim()) error = "Nama asisten AI wajib diisi.";
    else if (!EMAIL_PATTERN.test(d.email.trim()))
      error = "Format email pusat bantuan tidak valid.";
    else if (!d.telepon.trim()) error = "Telepon / call center wajib diisi.";
    else if (!d.alamat.trim()) error = "Alamat sekretariat wajib diisi.";

    if (error) return notify("identitas")({ type: "error", text: error });

    persist("identitas", d, "Identitas portal berhasil disimpan.");
  }

  // ----- simpan: integrasi -----

  function saveIntegrasi() {
    const d = config.integrasi;

    let error = "";
    try {
      const url = new URL(d.host.trim());
      if (!/^https?:$/.test(url.protocol)) error = "invalid";
    } catch {
      error = "invalid";
    }

    if (error) error = "Endpoint harus berupa URL http:// atau https:// yang valid.";
    else if (!/^[A-Za-z0-9_-]+$/.test(d.collection.trim()))
      error = "Nama collection hanya boleh huruf, angka, garis bawah, atau tanda hubung.";

    if (error) return notify("integrasi")({ type: "error", text: error });

    persist("integrasi", d, "Konfigurasi integrasi berhasil disimpan.");
  }

  // ----- simpan: keamanan -----

  function saveKeamanan(passwordFilled) {
    persist(
      "keamanan",
      config.keamanan,
      passwordFilled
        ? "Preferensi 2FA disimpan. Kata sandi belum diperbarui: endpoint ubah kata sandi belum terhubung ke backend."
        : "Preferensi 2FA disimpan di browser ini."
    );
  }

  function otherDevices() {
    notify("keamanan")({
      type: "info",
      text: "Mengeluarkan perangkat lain belum terhubung ke backend, jadi belum ada sesi yang diakhiri.",
    });
  }

  const section = SECTIONS.find((s) => s.id === activeSection);

  return (
    <>
      <Topbar
        title="Pengaturan"
        subtitle="Pusat konfigurasi kebijakan & sistem portal Layanan Informasi Publik"
      />

      <main className="flex-1 bg-slate-100 p-4 lg:p-6">
        <div className="mx-auto max-w-[1200px] space-y-5">
          {/* HEADER */}

          <section className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-card">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-brand-600">
              <SlidersHorizontal size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900">
                Pengaturan Sistem & Konfigurasi Direktori AI
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Kelola profil akun PPID, identitas portal publik DIY, parameter
                RAG Vector Search Qdrant, serta keamanan 2FA
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
            {/* MENU KIRI */}

            <aside className="space-y-4">
              <nav
                aria-label="Menu pengaturan"
                className="rounded-2xl border border-slate-100 bg-white p-2 shadow-card"
              >
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === activeSection;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => setActiveSection(s.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-brand-600 text-white"
                          : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold">
                          {s.title}
                        </span>
                        <span
                          className={`mt-0.5 block text-[10px] ${
                            active ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          {s.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 text-[11px] shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Versi Core Sistem:</span>
                  <span className="font-semibold text-slate-900">
                    v2.4.0-DIY
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Engine Vector:</span>
                  <span className="font-semibold text-emerald-600">
                    Qdrant v1.11
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status Chatbot Laras:</span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
              </div>
            </aside>

            {/* ISI */}

            <div aria-label={section.title} className="min-w-0">
              {activeSection === "profil" && (
                <ProfilSection
                  data={config.profil}
                  setData={makeSetter("profil")}
                  wilayahList={wilayahList}
                  notice={notices.profil}
                  notify={notify("profil")}
                  onSave={saveProfil}
                />
              )}

              {activeSection === "identitas" && (
                <IdentitasSection
                  data={config.identitas}
                  setData={makeSetter("identitas")}
                  notice={notices.identitas}
                  notify={notify("identitas")}
                  onSave={saveIdentitas}
                />
              )}

              {activeSection === "integrasi" && (
                <IntegrasiSection
                  data={config.integrasi}
                  setData={makeSetter("integrasi")}
                  notice={notices.integrasi}
                  notify={notify("integrasi")}
                  onSave={saveIntegrasi}
                />
              )}

              {activeSection === "keamanan" && (
                <KeamananSection
                  data={config.keamanan}
                  setData={makeSetter("keamanan")}
                  profil={config.profil}
                  notice={notices.keamanan}
                  notify={notify("keamanan")}
                  onSave={saveKeamanan}
                  onOtherDevices={otherDevices}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
