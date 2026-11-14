import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Layers,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Search,
  FilePlus,
} from "lucide-react";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import LayananTable from "../components/LayananTable";
import { LAYANAN } from "../data/layanan";
import ServiceRegionChart from "../components/ServiceRegionChart";
import RedSelect from "../components/RedSelect";

const STATS = [
  { icon: Building2, iconBg: "bg-blue-100", iconColor: "text-blue-600", label: "Total Dinas", value: 132, helper: "Dinas terdaftar" },
  { icon: Layers, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", label: "Total Layanan", value: 428, helper: "Semua layanan" },
  { icon: CheckCircle2, iconBg: "bg-green-100", iconColor: "text-green-600", label: "Layanan Aktif", value: 312, helper: { stat: "72,9%", text: "dari total" }, helperColor: "text-green-700" },
  { icon: RefreshCw, iconBg: "bg-orange-100", iconColor: "text-orange-600", label: "Perlu Pembaruan", value: 78, helper: { stat: "18,2%", text: "dari total" }, helperColor: "text-orange-600" },
  { icon: ShieldCheck, iconBg: "bg-violet-100", iconColor: "text-violet-600", label: "Status Terverifikasi", value: 286, helper: { stat: "66,8%", text: "dari total" }, helperColor: "text-violet-600" },
];

const ACTIVITIES = [
  { color: "bg-green-600", icon: CheckCircle2, text: 'Layanan "PPID" di Dinas Kominfo DIY diperbarui', time: "20 Mei 2025, 09:15 WIB" },
  { color: "bg-orange-600", icon: RefreshCw, text: 'Layanan "Permohonan Informasi" di Dinas DIY perlu pembaruan', time: "20 Mei 2025, 08:40 WIB" },
  { color: "bg-blue-600", icon: FilePlus, text: 'Layanan baru "Statistik Pariwisata" ditambahkan di Dinas Pariwisata DIY', time: "19 Mei 2025, 13:22 WIB" },
  { color: "bg-violet-600", icon: ShieldCheck, text: 'Verifikasi layanan "Data Pokok Pendidikan" berhasil', time: "19 Mei 2025, 14:41 WIB" },
  { color: "bg-red-600", icon: CheckCircle2, text: 'Layanan "Informasi Lingkungan" tidak aktif', time: "18 Mei 2025, 11:20 WIB" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "Aktif", label: "Aktif" },
  { value: "Perlu Update", label: "Perlu Update" },
  { value: "Non aktif", label: "Non aktif" },
];

const WILAYAH_OPTIONS = [
  { value: "", label: "Semua Wilayah" },
  ...[...new Set(LAYANAN.map((l) => l.wilayah))].map((w) => ({ value: w, label: w })),
];

export default function Dashboard() {
  const [wilayah, setWilayah] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(
    () =>
      LAYANAN.filter(
        (l) => (!wilayah || l.wilayah === wilayah) && (!status || l.status === status)
      ),
    [wilayah, status]
  );

  return (
    <>
      <Topbar title="Dashboard" subtitle="Layanan Informasi Publik" />

      <main className="flex-1 p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Main grid: table + side panels */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Service list */}
          <div className="rounded-xl bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-600">Daftar Layanan Informasi Publik</h2>
              <Link
                to="/data-layanan"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <RedSelect value={wilayah} onChange={setWilayah} options={WILAYAH_OPTIONS} />
              <RedSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
              <label className="relative flex-1 min-w-[180px]">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama dinas, layanan..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </label>
            </div>

            <LayananTable key={`${wilayah}|${status}`} data={filtered} pageSize={6} />
          </div>

          {/* Side panels */}
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-800">Statistik Layanan per Wilayah</h3>
                <button className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600">
                  Tahun 2025 <ChevronDown size={10} />
                </button>
              </div>
              <ServiceRegionChart />
            </div>

            <div className="rounded-xl bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Aktivitas Terbaru</h3>
                <button className="text-[11.5px] font-semibold text-red-600 hover:underline">Lihat Semua</button>
              </div>
              <ul className="space-y-4">
                {ACTIVITIES.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${a.color}`}>
                      <a.icon size={13} className="text-white" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 leading-snug">{a.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
