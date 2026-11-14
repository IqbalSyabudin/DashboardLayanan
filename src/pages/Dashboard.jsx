
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Layers, CheckCircle2, RefreshCw, ShieldCheck,
  FilePlus, Search, Activity, AlertTriangle, Database, ChevronRight,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import LayananTable from "../components/LayananTable";
import ServiceRegionChart from "../components/ServiceRegionChart";
import RedSelect from "../components/RedSelect";
import { apiRequest } from "../services/api";

import {
  getStatusType,
  percentage,
  formatDate,
  mapLayanan,
  buildRegionStats,
  buildMonitoringData,
  buildActivities,
  buildCategoryData,
  getConfidenceAverage,
} from "../utils/dashboardUtils";

// ============================================================
// KOMPONEN BANTUAN
// ============================================================

const Panel = ({ children, className = "" }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
    {children}
  </section>
);

const PanelHeader = ({ title, subtitle, right }) => (
  <div className="mb-4 flex items-start justify-between gap-2">
    <div>
      <h3 className="text-xs font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const EmptyChart = ({ message }) => (
  <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
    <Database size={25} className="text-slate-300" />
    <p className="max-w-[240px] text-[10px] text-slate-400">{message}</p>
  </div>
);

// ============================================================
// KARTU WILAYAH
// ============================================================

function RegionCards({ data, onSelect, selected }) {
  return (
    <Panel>
      <PanelHeader
        title="Total Layanan per Daerah (Hierarki Pemerintahan & Wilayah)"
        subtitle="Klik kartu daerah untuk melihat layanan berdasarkan wilayah"
        right={
          <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-700">
            {data.length} Daerah Terdata
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        {data.map(region => (
          <button
            key={region.id}
            onClick={() => onSelect(region.nama)}
            className={`min-w-0 rounded-lg border p-2.5 text-left transition hover:border-red-300 hover:shadow-sm ${
              selected === region.nama ? "border-red-400 bg-red-50" : "border-slate-200"
            }`}
          >
            <div className="flex justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-600">{region.code}</span>
              <span className="flex items-center text-[8px] text-slate-400">
                Detail <ChevronRight size={10} />
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <strong className="text-xl leading-none text-slate-800">{region.total}</strong>
              <span className="text-[9px] text-slate-400">Layanan</span>
            </div>

            <p className="mt-2 truncate text-[9px] font-semibold text-slate-600">
              {region.label}
            </p>

            <div className="mt-2 flex justify-between gap-1 border-t border-slate-100 pt-2">
              <span className="whitespace-nowrap text-[8px] font-semibold text-emerald-600">
                {region.aktif} Aktif
              </span>
              <span className="whitespace-nowrap text-[8px] font-semibold text-red-600">
                {region.kendala} Kendala
              </span>
            </div>
          </button>
        ))}

        {!data.length && (
          <p className="col-span-full py-8 text-center text-xs text-slate-400">
            Data wilayah belum tersedia.
          </p>
        )}
      </div>
    </Panel>
  );
}

// ============================================================
// GRAFIK MONITORING
// ============================================================

function MonitoringCharts({ data, totalQueries, success, failed }) {
  const total = success + failed;

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel>
        <PanelHeader
          title="JUMLAH QUERY PER PERIODE"
          subtitle="Berdasarkan monitoring_layanan dari database"
          right={
            <div className="text-right">
              <p className="text-lg font-bold text-slate-800">
                {totalQueries.toLocaleString("id-ID")}
              </p>
              <p className="text-[9px] text-slate-400">Total query</p>
            </div>
          }
        />

        {data.length ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#981611" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#981611" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="queries"
                  stroke="#981611"
                  strokeWidth={2}
                  fill="url(#queryGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart message="Belum ada data monitoring query." />}
      </Panel>

      <Panel>
        <PanelHeader
          title="RESPONS BERHASIL VS GAGAL"
          subtitle="Berdasarkan data monitoring_layanan"
          right={
            <div className="flex gap-2 text-[9px]">
              <span className="text-green-600">● Berhasil</span>
              <span className="text-red-500">● Gagal</span>
            </div>
          }
        />

        {data.length ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={15}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="berhasil" name="Berhasil" stackId="response" fill="#10b981" />
                <Bar dataKey="gagal" name="Gagal" stackId="response" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart message="Belum ada data respons pada monitoring." />}

        <div className="mt-3 border-t border-slate-100 pt-3 text-right">
          <span className="text-[10px] text-slate-400">Tingkat keberhasilan:</span>
          <strong className="ml-2 text-xs text-green-600">
            {percentage(success, total)}
          </strong>
        </div>
      </Panel>
    </section>
  );
}

// ============================================================
// KATEGORI, CONFIDENCE, AKTIVITAS
// ============================================================

function CategoryPanel({ data }) {
  return (
    <Panel>
      <PanelHeader title="LAYANAN PER KATEGORI" subtitle="Distribusi berdasarkan kategori database" />

      {data.length ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2}>
                  {data.map(item => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-[115px] flex-1 space-y-2">
            {data.slice(0, 6).map(item => (
              <div key={item.name} className="flex justify-between gap-2 text-[10px]">
                <span className="flex min-w-0 items-center gap-1.5 text-slate-500">
                  <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : <EmptyChart message="Belum ada kategori layanan." />}
    </Panel>
  );
}

function ConfidencePanel({ value, count }) {
  const score = value === null ? null : Math.max(0, Math.min(100, value));

  return (
    <Panel>
      <PanelHeader title="RATA-RATA CONFIDENCE SCORE" subtitle="Berdasarkan data monitoring API" />

      {score !== null ? (
        <div className="flex flex-col items-center py-3">
          <div
            className="flex h-36 w-36 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#10b981 0% ${score}%, #e2e8f0 ${score}% 100%)` }}
          >
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
              <strong className="text-2xl text-emerald-600">{score.toFixed(1)}%</strong>
              <span className="text-[9px] text-slate-400">Confidence Score</span>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-slate-400">
            Rata-rata dari {count} data monitoring
          </p>
        </div>
      ) : <EmptyChart message="Belum ada data confidence score." />}
    </Panel>
  );
}

function ActivityPanel({ data }) {
  return (
    <Panel>
      <PanelHeader title="AKTIVITAS TERBARU" subtitle="Riwayat berdasarkan data API" />

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={`${item.type}-${index}`} className="flex gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.color}`}>
              <item.icon size={14} className="text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] leading-relaxed text-slate-700">{item.text}</p>
              <p className="mt-1 text-[9px] text-slate-400">{formatDate(item.date)}</p>
            </div>
          </div>
        ))}

        {!data.length && (
          <p className="py-8 text-center text-xs text-slate-400">
            Belum ada riwayat aktivitas.
          </p>
        )}
      </div>
    </Panel>
  );
}

// ============================================================
// DASHBOARD UTAMA
// ============================================================

export default function Dashboard() {
  const [wilayah, setWilayah] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [rawServices, setRawServices] = useState([]);
  const [wilayahList, setWilayahList] = useState([]);
  const [instansiSummary, setInstansiSummary] = useState({});
  const [statusSummary, setStatusSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AMBIL DATA API
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [first, regions, instansi, statusData] = await Promise.all([
          apiRequest("/layanan?page=1&limit=100"),
          apiRequest("/wilayah"),
          apiRequest("/instansi/summary"),
          apiRequest("/layanan-status/summary"),
        ]);

        if (!Array.isArray(first?.data)) {
          throw new Error("Format data layanan dari API tidak valid.");
        }

        const pages = Number(first?.pagination?.total_pages || 1);

        const remaining = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
            apiRequest(`/layanan?page=${i + 2}&limit=100`)
          )
        );

        if (cancelled) return;

        setRawServices([
          ...first.data,
          ...remaining.flatMap(result => result?.data || []),
        ]);
        setWilayahList(regions?.data || []);
        setInstansiSummary(instansi?.data || {});
        setStatusSummary(statusData?.data || {});
      } catch (err) {
        console.error("Gagal memuat Dashboard:", err);
        if (!cancelled) setError(err.message || "Gagal mengambil data API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  // OLAH DATA
  const layananData = useMemo(() => rawServices.map(mapLayanan), [rawServices]);

  const stats = useMemo(() => {
    const total = layananData.length;
    const aktif = layananData.filter(x => getStatusType(x.status) === "aktif").length;
    const update = layananData.filter(x => getStatusType(x.status) === "update").length;

    return [
      { icon: Building2, iconBg: "bg-blue-100", iconColor: "text-blue-600", label: "Total Dinas", value: Number(instansiSummary.total) || 0, helper: "Instansi dari database" },
      { icon: Layers, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", label: "Total Layanan", value: total, helper: "Seluruh layanan dari API" },
      { icon: CheckCircle2, iconBg: "bg-green-100", iconColor: "text-green-600", label: "Layanan Aktif", value: aktif, helper: { stat: percentage(aktif, total), text: "dari total layanan" }, helperColor: "text-green-700" },
      { icon: RefreshCw, iconBg: "bg-orange-100", iconColor: "text-orange-600", label: "Perlu Pembaruan", value: update, helper: { stat: percentage(update, total), text: "dari total layanan" }, helperColor: "text-orange-600" },
      { icon: ShieldCheck, iconBg: "bg-violet-100", iconColor: "text-violet-600", label: "Status Terverifikasi", value: Number(statusSummary.verified) || 0, helper: "Data status VERIFIED", helperColor: "text-violet-600" },
    ];
  }, [layananData, instansiSummary, statusSummary]);

  const regionStats = useMemo(
    () => buildRegionStats(wilayahList, rawServices),
    [wilayahList, rawServices]
  );

  const monitoringData = useMemo(
    () => buildMonitoringData(rawServices),
    [rawServices]
  );

  const monitoringRecords = useMemo(
    () => rawServices.flatMap(item => item.monitoring || []),
    [rawServices]
  );

  const totalQueries = monitoringData.reduce((sum, x) => sum + x.queries, 0);
  const success = monitoringData.reduce((sum, x) => sum + x.berhasil, 0);
  const failed = monitoringData.reduce((sum, x) => sum + x.gagal, 0);

  const categoryData = useMemo(
    () => buildCategoryData(rawServices),
    [rawServices]
  );

  const confidence = useMemo(
    () => getConfidenceAverage(rawServices),
    [rawServices]
  );

  const activities = useMemo(
    () => buildActivities(rawServices),
    [rawServices]
  );

  const wilayahOptions = useMemo(() => [
    { value: "", label: "Semua Wilayah" },
    ...wilayahList.map(x => ({ value: x.nama, label: x.nama })),
  ], [wilayahList]);

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "Aktif", label: "Aktif" },
    { value: "Perlu Update", label: "Perlu Update" },
    { value: "Non aktif", label: "Non aktif" },
  ];

  // FILTER TABEL
  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return layananData.filter(item => {
      const matchWilayah = !wilayah || item.wilayah === wilayah;
      const matchStatus = !status || item.status.toLowerCase() === status.toLowerCase();
      const matchSearch = !keyword || [item.layanan, item.dinas, item.wilayah]
        .some(value => value.toLowerCase().includes(keyword));

      return matchWilayah && matchStatus && matchSearch;
    });
  }, [layananData, wilayah, status, search]);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Layanan Informasi Publik" />

      <main className="min-h-screen flex-1 space-y-5 bg-slate-100 p-4 lg:p-6">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-brand-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Ringkasan Eksekutif Direktori Layanan — Semua Wilayah
                </h2>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Informasi statistik yang diambil langsung dari database melalui API
              </p>
            </div>
            <span className="rounded-md bg-green-50 px-3 py-1.5 text-[10px] font-semibold text-green-700">
              <CheckCircle2 size={11} className="mr-1 inline" />
              Terhubung dengan API
            </span>
          </div>
        </Panel>

        {error && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertTriangle size={18} className="shrink-0 text-red-600" />
            <div>
              <p className="text-xs font-bold text-red-700">Gagal memuat Dashboard</p>
              <p className="mt-1 text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center" role="status">
            <span className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
          </div>
        ) : !error && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              {stats.map(item => <StatCard key={item.label} {...item} />)}
            </section>

            <RegionCards
              data={regionStats}
              selected={wilayah}
              onSelect={value => { setWilayah(value); setSearch(""); }}
            />

            <MonitoringCharts
              data={monitoringData}
              totalQueries={totalQueries}
              success={success}
              failed={failed}
            />

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CategoryPanel data={categoryData} />
              <ConfidencePanel value={confidence} count={monitoringRecords.length} />
              <ActivityPanel data={activities} />
            </section>

            <Panel>
              <PanelHeader
                title="STATISTIK LAYANAN PER WILAYAH"
                subtitle="Perbandingan layanan aktif dan layanan yang mengalami kendala"
              />
              <ServiceRegionChart data={regionStats} />
            </Panel>

            <Panel className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">
                    Daftar Layanan Informasi Publik
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Data layanan yang tersimpan pada database
                  </p>
                </div>
                <Link to="/data-layanan" className="text-xs font-semibold text-brand-600 hover:underline">
                  Kelola Semua →
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
                <RedSelect value={wilayah} onChange={setWilayah} options={wilayahOptions} />
                <RedSelect value={status} onChange={setStatus} options={statusOptions} />

                <label className="relative min-w-[180px] flex-1">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama dinas, layanan..."
                    className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </label>

                {(wilayah || status || search) && (
                  <button
                    onClick={() => { setWilayah(""); setStatus(""); setSearch(""); }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <div className="p-4">
                <p className="mb-3 text-[10px] text-slate-400">
                  Menampilkan {filtered.length} layanan
                  {wilayah && ` — ${wilayah}`}
                </p>
                <LayananTable
                  key={`${wilayah}|${status}|${search}`}
                  data={filtered}
                  pageSize={6}
                />
              </div>
            </Panel>
          </>
        )}
      </main>
    </>
  );
}
