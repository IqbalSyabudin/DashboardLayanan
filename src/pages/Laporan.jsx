
import { useEffect, useMemo, useState } from "react";
import {
  FileText, CheckCircle2, RefreshCw, AlertTriangle,
  Download, Search, ChevronLeft, ChevronRight,
  CalendarDays, Building2, Layers,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
  Cell, Legend,
} from "recharts";

import Topbar from "../components/Topbar";
import { apiRequest } from "../services/api";

// ============================================================
// KONFIGURASI
// ============================================================

const PAGE_SIZE = 10;

const STATUS_COLORS = {
  aktif: "#10b981",
  update: "#3b82f6",
  kendala: "#ef4444",
};

const getStatus = (status = "") => {
  const value = status.toLowerCase().trim();

  if (["aktif", "active"].includes(value)) return "aktif";

  if (
    value.includes("perlu update") ||
    value.includes("perlu pembaruan") ||
    value === "need_review"
  ) return "update";

  return "kendala";
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("id-ID");

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date)) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonth = (date) =>
  date.toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });

// ============================================================
// KOMPONEN STATISTIK
// ============================================================

function StatCard({ icon: Icon, label, value, color, bg, helper }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={20} className={color} />
      </span>

      <div className="min-w-0">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900">
          {formatNumber(value)}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>
      </div>
    </div>
  );
}

// ============================================================
// KOMPONEN PANEL
// ============================================================

function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <FileText size={26} className="text-slate-300" />
      <p className="text-xs text-slate-400">{message}</p>
    </div>
  );
}

// ============================================================
// DASHBOARD LAPORAN
// ============================================================

export default function Laporan() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [instansi, setInstansi] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ==========================================================
  // AMBIL SELURUH DATA DARI API
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const first = await apiRequest("/layanan?page=1&limit=100");

        if (!Array.isArray(first?.data)) {
          throw new Error("Format data layanan dari API tidak valid.");
        }

        const totalPages = Math.max(
          1,
          Number(first.pagination?.total_pages || 1)
        );

        const remaining = await Promise.all(
          Array.from(
            { length: totalPages - 1 },
            (_, index) =>
              apiRequest(`/layanan?page=${index + 2}&limit=100`)
          )
        );

        const allData = [
          ...first.data,
          ...remaining.flatMap(result => result?.data || []),
        ];

        if (!cancelled) setServices(allData);
      } catch (err) {
        console.error("Gagal mengambil laporan:", err);
        if (!cancelled) {
          setError(err.message || "Gagal mengambil data laporan.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // DATA FILTER DROPDOWN
  // ==========================================================

  const categories = useMemo(() =>
    [...new Set(
      services.map(item => item.kategori?.nama_kategori).filter(Boolean)
    )].sort(),
  [services]);

  const instansiList = useMemo(() =>
    [...new Set(
      services.map(item => item.instansi?.nama_instansi).filter(Boolean)
    )].sort(),
  [services]);

  // ==========================================================
  // FILTER DATA
  // ==========================================================

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return services.filter(item => {
      const date = item.created_at
        ? new Date(item.created_at)
        : null;

      const matchStart =
        !startDate ||
        (date && !isNaN(date) && date >= new Date(`${startDate}T00:00:00`));

      const matchEnd =
        !endDate ||
        (date && !isNaN(date) && date <= new Date(`${endDate}T23:59:59`));

      const matchCategory =
        !category ||
        item.kategori?.nama_kategori === category;

      const matchInstansi =
        !instansi ||
        item.instansi?.nama_instansi === instansi;

      const matchSearch =
        !keyword ||
        [
          item.nama_layanan,
          item.kode_layanan,
          item.instansi?.nama_instansi,
          item.kategori?.nama_kategori,
        ].some(value => value?.toLowerCase().includes(keyword));

      return (
        matchStart &&
        matchEnd &&
        matchCategory &&
        matchInstansi &&
        matchSearch
      );
    });
  }, [services, startDate, endDate, category, instansi, search]);

  // ==========================================================
  // STATISTIK
  // ==========================================================

  const stats = useMemo(() => {
    const result = {
      total: filtered.length,
      aktif: 0,
      update: 0,
      kendala: 0,
    };

    filtered.forEach(item => {
      result[getStatus(item.status)]++;
    });

    return result;
  }, [filtered]);

  const statCards = [
    {
      icon: Layers,
      label: "Total Layanan",
      value: stats.total,
      color: "text-blue-600",
      bg: "bg-blue-50",
      helper: "Total data layanan",
    },
    {
      icon: CheckCircle2,
      label: "Layanan Aktif",
      value: stats.aktif,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      helper: "Layanan berstatus aktif",
    },
    {
      icon: RefreshCw,
      label: "Perlu Pembaruan",
      value: stats.update,
      color: "text-blue-600",
      bg: "bg-blue-50",
      helper: "Layanan perlu diperbarui",
    },
    {
      icon: AlertTriangle,
      label: "Layanan Bermasalah",
      value: stats.kendala,
      color: "text-red-600",
      bg: "bg-red-50",
      helper: "Selain status aktif",
    },
  ];

  // ==========================================================
  // DATA GRAFIK STATUS
  // ==========================================================

  const statusData = [
    {
      name: "Aktif",
      value: stats.aktif,
      color: STATUS_COLORS.aktif,
    },
    {
      name: "Perlu Update",
      value: stats.update,
      color: STATUS_COLORS.update,
    },
    {
      name: "Kendala",
      value: stats.kendala - stats.update,
      color: STATUS_COLORS.kendala,
    },
  ].filter(item => item.value > 0);

  // ==========================================================
  // DATA GRAFIK TREN
  // ==========================================================

  const trendData = useMemo(() => {
    const groups = {};

    filtered.forEach(item => {
      if (!item.created_at) return;

      const date = new Date(item.created_at);
      if (isNaN(date)) return;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!groups[key]) {
        groups[key] = {
          key,
          bulan: formatMonth(date),
          total: 0,
          aktif: 0,
          update: 0,
          kendala: 0,
        };
      }

      groups[key].total++;
      groups[key][getStatus(item.status)]++;
    });

    return Object.values(groups)
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  // ==========================================================
  // REKAPITULASI PER INSTANSI
  // ==========================================================

  const instansiStats = useMemo(() => {
    const groups = {};

    filtered.forEach(item => {
      const name = item.instansi?.nama_instansi || "Tanpa Instansi";

      if (!groups[name]) {
        groups[name] = {
          id: name,
          dinas: name,
          jumlah: 0,
          aktif: 0,
          update: 0,
          kendala: 0,
        };
      }

      groups[name].jumlah++;
      groups[name][getStatus(item.status)]++;
    });

    return Object.values(groups).sort(
      (a, b) => b.jumlah - a.jumlah
    );
  }, [filtered]);

  // ==========================================================
  // LAYANAN TERBARU
  // ==========================================================

  const latestServices = useMemo(() =>
    [...filtered]
      .sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )
      .slice(0, 6),
  [filtered]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.max(1, Math.ceil(instansiStats.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedInstansi = instansiStats.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ==========================================================
  // EXPORT CSV
  // ==========================================================

  function downloadReport() {
    const rows = [
      ["Kode Layanan", "Nama Layanan", "Instansi", "Wilayah", "Kategori", "Status", "Tanggal Dibuat"],
      ...filtered.map(item => [
        item.kode_layanan || "",
        item.nama_layanan || "",
        item.instansi?.nama_instansi || "",
        item.instansi?.wilayah?.nama || "",
        item.kategori?.nama_kategori || "",
        item.status || "",
        formatDate(item.created_at),
      ]),
    ];

    const csv = rows.map(row =>
      row.map(value =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(";")
    ).join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-layanan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // ==========================================================
  // RESET FILTER
  // ==========================================================

  function resetFilters() {
    setStartDate("");
    setEndDate("");
    setCategory("");
    setInstansi("");
    setSearch("");
    setPage(1);
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Topbar
        title="Laporan"
        subtitle="Rekapitulasi data layanan informasi publik"
      />

      <main className="flex-1 min-h-screen space-y-6 bg-slate-100 p-4 lg:p-6">

        {/* FILTER */}

        <Panel>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">

            <label>
              <span className="mb-1.5 block text-[11px] text-slate-500">
                Tanggal Mulai
              </span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] text-slate-500">
                Tanggal Akhir
              </span>
              <input
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] text-slate-500">
                Kategori
              </span>
              <select
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"
              >
                <option value="">Semua Kategori</option>
                {categories.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] text-slate-500">
                Dinas / Instansi
              </span>
              <select
                value={instansi}
                onChange={e => {
                  setInstansi(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"
              >
                <option value="">Semua Instansi</option>
                {instansiList.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <button
              onClick={downloadReport}
              disabled={loading || !!error}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#8B1816] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#781412] disabled:opacity-50"
            >
              <Download size={14} />
              Unduh Laporan CSV
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400">
              Filter diterapkan langsung pada data layanan dari API.
            </p>
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-red-600 hover:underline"
            >
              Reset Filter
            </button>
          </div>
        </Panel>

        {/* ERROR */}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={16} />
              Gagal memuat laporan
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <span className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
          </div>
        ) : !error && (
          <>
            {/* STATISTIK */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(item => (
                <StatCard key={item.label} {...item} />
              ))}
            </section>

            {/* GRAFIK */}

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">

              <Panel>
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-800">
                    Tren Penambahan Layanan
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Jumlah layanan berdasarkan tanggal pembuatan
                  </p>
                </div>

                {trendData.length ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#981611" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#981611" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total Layanan"
                          stroke="#981611"
                          strokeWidth={2}
                          fill="url(#reportGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="Belum ada data tren pada periode ini." />
                )}
              </Panel>

              <Panel>
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-slate-800">
                    Perbandingan Status Layanan
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Distribusi status layanan berdasarkan filter
                  </p>
                </div>

                {stats.total > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <div className="h-[190px] w-[190px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={82}
                            paddingAngle={3}
                          >
                            {statusData.map(item => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="min-w-[130px] flex-1 space-y-4">
                      {statusData.map(item => (
                        <div key={item.name}>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-2 font-semibold text-slate-700">
                              <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </span>
                            <strong style={{ color: item.color }}>
                              {((item.value / stats.total) * 100).toFixed(1)}%
                            </strong>
                          </div>
                          <p className="mt-1 text-right text-[10px] text-slate-400">
                            {formatNumber(item.value)} layanan
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState message="Tidak ada data status." />
                )}
              </Panel>
            </section>

            {/* REKAP INSTANSI */}

            <Panel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Rekapitulasi Layanan per Dinas / Instansi
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Jumlah layanan dan distribusi status setiap instansi
                  </p>
                </div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-[10px] text-slate-600">
                  {instansiStats.length} Instansi
                </span>
              </div>

              <div className="mb-4">
                <label className="relative block">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari instansi atau layanan..."
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="px-3 py-3">No</th>
                      <th className="px-3 py-3">Dinas / Instansi</th>
                      <th className="px-3 py-3">Jumlah Layanan</th>
                      <th className="px-3 py-3">Aktif</th>
                      <th className="px-3 py-3">Perlu Update</th>
                      <th className="px-3 py-3">Kendala</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedInstansi.map((item, index) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-3 py-3 text-slate-500">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-700">
                          {item.dinas}
                        </td>
                        <td className="px-3 py-3 font-bold text-blue-600">
                          {formatNumber(item.jumlah)}
                        </td>
                        <td className="px-3 py-3 font-semibold text-emerald-600">
                          {formatNumber(item.aktif)}
                        </td>
                        <td className="px-3 py-3 font-semibold text-blue-600">
                          {formatNumber(item.update)}
                        </td>
                        <td className="px-3 py-3 font-semibold text-red-600">
                          {formatNumber(item.kendala - item.update)}
                        </td>
                      </tr>
                    ))}

                    {!paginatedInstansi.length && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          Tidak ada data instansi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] text-slate-500">
                  Menampilkan {instansiStats.length
                    ? (currentPage - 1) * PAGE_SIZE + 1
                    : 0} - {Math.min(currentPage * PAGE_SIZE, instansiStats.length)}
                  {" "}dari {instansiStats.length} instansi
                </p>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                          p === currentPage
                            ? "bg-[#981611] text-white"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </Panel>

            {/* LAYANAN TERBARU */}

            <Panel>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Data Layanan Terbaru
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Berdasarkan tanggal pembuatan data
                  </p>
                </div>
                <FileText size={18} className="text-slate-400" />
              </div>

              <div className="divide-y divide-slate-100">
                {latestServices.map(item => {
                  const type = getStatus(item.status);

                  const badge = {
                    aktif: "bg-green-50 text-green-700",
                    update: "bg-blue-50 text-blue-700",
                    kendala: "bg-red-50 text-red-700",
                  }[type];

                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {item.kode_layanan || `LAY-${item.id}`} · {item.nama_layanan}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {item.instansi?.nama_instansi || "Tanpa Instansi"}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatDate(item.created_at)}
                        </p>
                      </div>

                      <span className={`rounded px-2 py-1 text-[10px] font-semibold ${badge}`}>
                        {item.status || "Tidak diketahui"}
                      </span>
                    </div>
                  );
                })}

                {!latestServices.length && (
                  <EmptyState message="Belum ada layanan pada filter ini." />
                )}
              </div>
            </Panel>
          </>
        )}
      </main>
    </>
  );
}
