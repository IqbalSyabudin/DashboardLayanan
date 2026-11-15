import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  Search,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Bot,
  X,
} from "lucide-react";

import Topbar from "../components/Topbar";
import { apiRequest } from "../services/api";

// ============================================================
// STYLES & CONFIG
// ============================================================

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
  { value: "diproses_opd", label: "Diproses OPD" },
  { value: "selesai", label: "Selesai" },
  { value: "ditolak", label: "Ditolak" },
];

const STATUS_BADGE = {
  menunggu_verifikasi: {
    label: "Menunggu Verifikasi",
    bg: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  diproses_opd: {
    label: "Diproses OPD",
    bg: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  selesai: {
    label: "Selesai",
    bg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  ditolak: {
    label: "Ditolak",
    bg: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
};

const inputClass = `
  w-full rounded-lg border border-slate-300
  px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400
  outline-none focus:border-[#981611]
  focus:ring-2 focus:ring-red-100
  transition bg-white
`;

const inputReadOnly = `
  w-full rounded-lg border border-slate-200
  px-3 py-2 text-sm text-slate-600
  bg-slate-50
`;

// ============================================================
// MODAL COMPONENT (DEFINED OUTSIDE TO PREVENT LOST FOCUS)
// ============================================================

function Modal({ show, onClose, children, maxW = "max-w-2xl" }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />
      <div
        className={`
          relative bg-white rounded-2xl shadow-2xl
          w-full ${maxW} max-h-[92vh] overflow-y-auto
          p-6 z-10
        `}
      >
        <button
          type="button"
          onClick={onClose}
          className="
            absolute right-4 top-4
            text-slate-400 hover:text-slate-600
            transition
          "
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// FIELD ROW (DEFINED OUTSIDE TO PREVENT LOST FOCUS)
// ============================================================

function FieldRow({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.menunggu_verifikasi;
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full px-3 py-1
        text-[11px] font-semibold
        ${cfg.bg}
      `}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Pengaduan() {
  // State data & stats
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    menunggu_verifikasi: 0,
    diproses_opd: 0,
    selesai: 0,
    ditolak: 0,
  });

  const [wilayahList, setWilayahList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const [showTindakLanjutModal, setShowTindakLanjutModal] = useState(false);
  const [tindakLanjutData, setTindakLanjutData] = useState(null);

  const [showCatatModal, setShowCatatModal] = useState(false);
  const [catatForm, setCatatForm] = useState({
    nama_pelapor: "",
    kontak_pelapor: "",
    wilayah_id: "",
    opd_tujuan: "",
    judul_pengaduan: "",
    isi_laporan_warga: "",
    status: "menunggu_verifikasi",
    tanggapan_admin: "",
  });

  const [showSimulasiModal, setShowSimulasiModal] = useState(false);
  const [simulasiForm, setSimulasiForm] = useState({
    nama_pelapor: "",
    kontak_pelapor: "",
    wilayah_id: "",
    opd_tujuan: "",
    judul_pengaduan: "",
    isi_laporan_warga: "",
  });

  const [reloadKey, setReloadKey] = useState(0);

  // ==========================================================
  // LOAD WILAYAH
  // ==========================================================

  useEffect(() => {
    async function loadWilayah() {
      try {
        const result = await apiRequest("/wilayah");
        setWilayahList(result?.data || []);
      } catch (err) {
        console.error("Gagal mengambil wilayah:", err);
      }
    }
    loadWilayah();
  }, []);

  // ==========================================================
  // DEBOUNCE SEARCH
  // ==========================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ==========================================================
  // LOAD PENGADUAN
  // ==========================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const result = await apiRequest(`/pengaduan?${params.toString()}`);

      setData(result?.data || []);
      setPagination(
        result?.pagination || {
          page,
          limit,
          total: 0,
          total_pages: 1,
        }
      );
    } catch (err) {
      console.error("Gagal mengambil pengaduan:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, reloadKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================================
  // LOAD SUMMARY
  // ==========================================================

  const loadSummary = useCallback(async () => {
    try {
      const result = await apiRequest("/pengaduan/summary");
      if (result?.data) {
        setSummary(result.data);
      }
    } catch (err) {
      console.error("Gagal mengambil summary:", err);
    }
  }, [reloadKey]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // ==========================================================
  // HANDLERS
  // ==========================================================

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function handleStatusFilterChange(newStatus) {
    setStatusFilter(newStatus);
    setPage(1);
  }

  // DELETE
  function openDeleteModal(item) {
    setDeleteTarget(item);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/pengaduan/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      alert(err.message || "Gagal menghapus pengaduan.");
    }
  }

  // DETAIL
  async function openDetailModal(item) {
    try {
      const result = await apiRequest(`/pengaduan/${item.id}`);
      setDetailData(result?.data || item);
      setShowDetailModal(true);
    } catch {
      setDetailData(item);
      setShowDetailModal(true);
    }
  }

  // TINDAK LANJUT
  async function openTindakLanjutModal(item) {
    try {
      const result = await apiRequest(`/pengaduan/${item.id}`);
      setTindakLanjutData(result?.data || item);
      setShowTindakLanjutModal(true);
    } catch {
      setTindakLanjutData(item);
      setShowTindakLanjutModal(true);
    }
  }

  async function saveTindakLanjut() {
    if (!tindakLanjutData) return;
    try {
      await apiRequest(`/pengaduan/${tindakLanjutData.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nama_pelapor: tindakLanjutData.nama_pelapor,
          kontak_pelapor: tindakLanjutData.kontak_pelapor,
          wilayah_id: tindakLanjutData.wilayah_id ? Number(tindakLanjutData.wilayah_id) : null,
          opd_tujuan: tindakLanjutData.opd_tujuan,
          judul_pengaduan: tindakLanjutData.judul_pengaduan,
          isi_laporan_warga: tindakLanjutData.isi_laporan_warga,
          status: tindakLanjutData.status,
          tanggapan_admin: tindakLanjutData.tanggapan_admin,
        }),
      });
      setShowTindakLanjutModal(false);
      setTindakLanjutData(null);
      reload();
    } catch (err) {
      alert(err.message || "Gagal menyimpan tindak lanjut.");
    }
  }

  // CATAT MANUAL
  function openCatatModal() {
    // Cari wilayah pertama default jika ada
    const defaultWilayah = wilayahList.find((w) =>
      w.nama.toLowerCase().includes("diy") || w.nama.toLowerCase().includes("provinsi")
    );
    setCatatForm({
      nama_pelapor: "",
      kontak_pelapor: "",
      wilayah_id: defaultWilayah ? defaultWilayah.id : (wilayahList[0]?.id || ""),
      opd_tujuan: "Disdukcapil",
      judul_pengaduan: "",
      isi_laporan_warga: "",
      status: "menunggu_verifikasi",
      tanggapan_admin: "",
    });
    setShowCatatModal(true);
  }

  async function saveCatat() {
    if (!catatForm.nama_pelapor.trim() || !catatForm.judul_pengaduan.trim()) {
      alert("Nama Pelapor dan Judul Pengaduan wajib diisi.");
      return;
    }
    try {
      await apiRequest("/pengaduan", {
        method: "POST",
        body: JSON.stringify({
          ...catatForm,
          wilayah_id: catatForm.wilayah_id ? Number(catatForm.wilayah_id) : null,
          sumber: "Input Admin (Loket / 112)",
        }),
      });
      setShowCatatModal(false);
      reload();
    } catch (err) {
      alert(err.message || "Gagal mencatat pengaduan.");
    }
  }

  // SIMULASI
  function openSimulasiModal() {
    setSimulasiForm({
      nama_pelapor: "",
      kontak_pelapor: "",
      wilayah_id: wilayahList[0]?.id || "",
      opd_tujuan: "",
      judul_pengaduan: "",
      isi_laporan_warga: "",
    });
    setShowSimulasiModal(true);
  }

  async function saveSimulasi() {
    if (!simulasiForm.nama_pelapor.trim() || !simulasiForm.judul_pengaduan.trim()) {
      alert("Nama Pelapor dan Judul Pengaduan wajib diisi.");
      return;
    }
    try {
      await apiRequest("/pengaduan/simulasi", {
        method: "POST",
        body: JSON.stringify({
          ...simulasiForm,
          wilayah_id: simulasiForm.wilayah_id ? Number(simulasiForm.wilayah_id) : null,
        }),
      });
      setShowSimulasiModal(false);
      reload();
    } catch (err) {
      alert(err.message || "Gagal simulasi aduan.");
    }
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} • ${hours}:${mins} WIB`;
  }

  function getWilayahName(item) {
    if (item.wilayah?.nama) return item.wilayah.nama;
    return "-";
  }

  function truncate(str, max = 50) {
    if (!str) return "-";
    return str.length > max ? str.substring(0, max) + "..." : str;
  }

  // Auto-calculated next no aduan preview for catat modal
  const nextNoAduanPreview = useMemo(() => {
    const nextUrut = String((summary.total || 0) + 1).padStart(3, "0");
    return `PGD-DIY-2026-${nextUrut}`;
  }, [summary.total]);

  // Pagination calculation
  const totalPages = pagination.total_pages || 1;
  const totalItems = pagination.total || 0;
  const start = totalItems > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, totalItems);

  const paginationItems = useMemo(() => {
    const pages = new Set([1, totalPages, page, page - 1, page + 1]);
    const sorted = [...pages]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const items = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) items.push("...");
      items.push(p);
      prev = p;
    }
    return items;
  }, [page, totalPages]);

  return (
    <>
      {/* Topbar */}
      <Topbar
        title="Pengaduan"
        subtitle="Pantau pengaduan layanan informasi publik"
      />

      <main className="flex-1 p-6">
        {/* Main Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6">
          {/* Header Title & Action Buttons */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                Manajemen Pengaduan & Aspirasi Masyarakat (Semua Wilayah)
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sinkron Otomatis dari Chatbot Laras
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pengaduan warga dari Chatbot Laras masuk otomatis ke daftar ini. Admin dapat memverifikasi, menindaklanjuti, mengedit, atau menghapus aduan.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={openSimulasiModal}
                className="
                  flex items-center gap-1.5
                  rounded-lg bg-[#2563EB]
                  px-4 py-2.5 text-xs font-semibold
                  text-white hover:bg-blue-700 transition shadow-sm
                "
              >
                <Bot size={15} />
                Simulasi Aduan Masuk dari User
              </button>

              <button
                type="button"
                onClick={openCatatModal}
                className="
                  flex items-center gap-1.5
                  rounded-lg bg-[#7A1515]
                  px-4 py-2.5 text-xs font-semibold
                  text-white hover:bg-[#601010] transition shadow-sm
                "
              >
                <Plus size={15} />
                Catat Aduan Manual
              </button>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total */}
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                TOTAL PENGADUAN MASUK
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {summary.total} <span className="text-base font-semibold">Aduan</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Otomatis Chatbot & Loket PPID
              </p>
            </div>

            {/* Menunggu Verifikasi */}
            <div className="rounded-xl border-2 border-[#F59E0B] p-4 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] mb-1">
                MENUNGGU VERIFIKASI
              </p>
              <p className="text-2xl font-bold text-[#D97706]">
                {summary.menunggu_verifikasi} <span className="text-base font-semibold">Aduan</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Perlu ditinjau admin PPID
              </p>
            </div>

            {/* Sedang Diproses OPD */}
            <div className="rounded-xl border-2 border-[#3B82F6] p-4 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                SEDANG DIPROSES OPD
              </p>
              <p className="text-2xl font-bold text-[#2563EB]">
                {summary.diproses_opd} <span className="text-base font-semibold">Aduan</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Diteruskan ke dinas terkait
              </p>
            </div>

            {/* Selesai Ditindaklanjuti */}
            <div className="rounded-xl border-2 border-[#10B981] p-4 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#059669] mb-1">
                SELESAI DITINDAKLANJUTI
              </p>
              <p className="text-2xl font-bold text-[#059669]">
                {summary.selesai} <span className="text-base font-semibold">Aduan</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                SOP & jawaban bot diperbarui
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusFilterChange(opt.value)}
                    className={`
                      px-3.5 py-1.5 rounded-md
                      text-xs font-semibold
                      border transition
                      ${
                        isActive
                          ? "bg-[#7A1515] text-white border-[#7A1515]"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-[300px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari no. aduan, nama pelapor, atau OPD..."
                className="
                  w-full h-9 rounded-lg
                  border border-slate-300
                  bg-white pl-9 pr-4
                  text-xs text-slate-700
                  placeholder:text-slate-400
                  outline-none
                  focus:border-[#7A1515]
                  focus:ring-2 focus:ring-red-100
                  transition
                "
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-[190px]">
                    NO. ADUAN & SUMBER
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-[180px]">
                    PELAPOR
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 min-w-[240px]">
                    RINGKASAN PENGADUAN
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-[200px]">
                    WILAYAH & OPD TUJUAN
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-[150px]">
                    STATUS
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right w-[170px]">
                    AKSI CRUD ADMIN
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                      Memuat data pengaduan...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                      Tidak ada data pengaduan yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* No Aduan & Sumber */}
                      <td className="px-4 py-3 align-middle">
                        <p className="text-xs font-bold text-[#DC2626]">
                          {item.no_aduan}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.sumber || "Otomatis (Chatbot Laras)"}
                        </p>
                      </td>

                      {/* Pelapor */}
                      <td className="px-4 py-3 align-middle">
                        <p className="text-xs font-medium text-slate-800">
                          {item.nama_pelapor}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.kontak_pelapor || "-"}
                        </p>
                      </td>

                      {/* Ringkasan */}
                      <td className="px-4 py-3 align-middle">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {truncate(item.judul_pengaduan, 55)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatDate(item.created_at)}
                        </p>
                      </td>

                      {/* Wilayah & OPD */}
                      <td className="px-4 py-3 align-middle">
                        <p className="text-xs font-medium text-slate-800">
                          {item.opd_tujuan || "-"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {getWilayahName(item)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 align-middle text-center">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Aksi CRUD */}
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailModal(item)}
                            className="
                              inline-flex items-center gap-1
                              rounded-md border border-slate-300
                              px-2 py-1 text-[11px]
                              font-medium text-slate-600
                              hover:bg-slate-50 transition
                            "
                          >
                            <Eye size={12} />
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => openTindakLanjutModal(item)}
                            className="
                              inline-flex items-center gap-1
                              rounded-md bg-[#7A1515]
                              px-2 py-1 text-[11px]
                              font-medium text-white
                              hover:bg-[#601010] transition
                            "
                          >
                            <Edit3 size={12} />
                            Tindak Lanjut
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(item)}
                            className="
                              inline-flex items-center justify-center
                              rounded-md border border-slate-300
                              h-6 w-6 text-slate-400
                              hover:bg-red-50 hover:text-red-500
                              hover:border-red-300 transition
                            "
                            title="Hapus"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Tampilkan</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="
                  border border-slate-300 rounded-md
                  px-2 py-1 text-xs bg-white
                  focus:outline-none focus:border-[#7A1515]
                "
              >
                {[5, 10, 25, 50].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span>
                baris per halaman • Menampilkan{" "}
                <strong>{start} – {end}</strong> dari total{" "}
                <strong>{totalItems}</strong> data (Halaman {page} dari {totalPages})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="
                  px-3 py-1 rounded-md border border-slate-200
                  text-xs text-slate-600 hover:bg-slate-50
                  disabled:opacity-40
                "
              >
                Sebelumnya
              </button>

              {paginationItems.map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-2 py-1 text-xs text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`
                      flex h-7 min-w-7 items-center justify-center
                      rounded-md border px-2 text-xs font-semibold
                      ${
                        p === page
                          ? "border-[#7A1515] bg-[#7A1515] text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }
                    `}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="
                  px-3 py-1 rounded-md border border-slate-200
                  text-xs text-slate-600 hover:bg-slate-50
                  disabled:opacity-40
                "
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ====================================================
          MODAL: DELETE
      ===================================================== */}
      <Modal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxW="max-w-md"
      >
        <div className="text-center py-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-100">
            <Trash2 size={26} className="text-red-500" />
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Hapus Data Pengaduan?
          </h3>

          <p className="text-sm text-slate-600 mb-6">
            Apakah Anda yakin ingin menghapus pengaduan{" "}
            <strong className="text-[#DC2626]">
              {deleteTarget?.no_aduan}
            </strong>{" "}
            dari daftar?
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="
                px-6 py-2.5 rounded-lg
                border border-slate-300
                text-sm font-semibold text-slate-600
                hover:bg-slate-50 transition
              "
            >
              Batal
            </button>

            <button
              type="button"
              onClick={confirmDelete}
              className="
                px-6 py-2.5 rounded-lg
                bg-[#E11D48] text-sm font-semibold
                text-white hover:bg-red-600 transition shadow-sm
              "
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* ====================================================
          MODAL: DETAIL
      ===================================================== */}
      <Modal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      >
        {detailData && (
          <div>
            <p className="text-xs font-bold text-[#DC2626] mb-1">
              {detailData.no_aduan}
            </p>
            <h3 className="text-lg font-bold text-slate-800 mb-5">
              Detail Pengaduan & Riwayat Tanggapan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldRow label="Nama Pelapor" required>
                <div className={inputReadOnly}>
                  {detailData.nama_pelapor || "-"}
                </div>
              </FieldRow>
              <FieldRow label="Kontak / WhatsApp / Email">
                <div className={inputReadOnly}>
                  {detailData.kontak_pelapor || "-"}
                </div>
              </FieldRow>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldRow label="Wilayah DIY / Pusat">
                <div className={inputReadOnly}>
                  {getWilayahName(detailData)}
                </div>
              </FieldRow>
              <FieldRow label="OPD / Dinas Tujuan">
                <div className={inputReadOnly}>
                  {detailData.opd_tujuan || "-"}
                </div>
              </FieldRow>
            </div>

            <div className="mb-4">
              <FieldRow label="Judul / Subjek Pengaduan" required>
                <div className={inputReadOnly}>
                  {detailData.judul_pengaduan}
                </div>
              </FieldRow>
            </div>

            <div className="mb-4">
              <FieldRow label="Isi Laporan Warga">
                <div className={`${inputReadOnly} min-h-[80px] whitespace-pre-wrap`}>
                  {detailData.isi_laporan_warga || "-"}
                </div>
              </FieldRow>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Penanganan Admin PPID
              </label>
              <div className={inputReadOnly}>
                {STATUS_BADGE[detailData.status]?.label || detailData.status}
              </div>
            </div>

            <div className="mb-6">
              <FieldRow label="Tanggapan / Jawaban Resmi Admin (Dikirim ke Warga)">
                <div className={`${inputReadOnly} min-h-[60px] whitespace-pre-wrap`}>
                  {detailData.tanggapan_admin || "-"}
                </div>
              </FieldRow>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="
                  px-6 py-2 rounded-lg
                  border border-slate-300
                  text-sm font-semibold text-slate-600
                  hover:bg-slate-50 transition
                "
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ====================================================
          MODAL: TINDAK LANJUT & EDIT
      ===================================================== */}
      <Modal
        show={showTindakLanjutModal}
        onClose={() => setShowTindakLanjutModal(false)}
      >
        {tindakLanjutData && (
          <div>
            <p className="text-xs font-bold text-[#DC2626] mb-1">
              {tindakLanjutData.no_aduan}
            </p>
            <h3 className="text-lg font-bold text-slate-800 mb-5">
              Tindak Lanjut & Edit Pengaduan Warga
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldRow label="Nama Pelapor" required>
                <input
                  type="text"
                  value={tindakLanjutData.nama_pelapor || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      nama_pelapor: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FieldRow>

              <FieldRow label="Kontak / WhatsApp / Email">
                <input
                  type="text"
                  value={tindakLanjutData.kontak_pelapor || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      kontak_pelapor: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FieldRow>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FieldRow label="Wilayah DIY / Pusat">
                <select
                  value={tindakLanjutData.wilayah_id || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      wilayah_id: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Pilih Wilayah</option>
                  {wilayahList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="OPD / Dinas Tujuan">
                <input
                  type="text"
                  value={tindakLanjutData.opd_tujuan || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      opd_tujuan: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FieldRow>
            </div>

            <div className="mb-4">
              <FieldRow label="Judul / Subjek Pengaduan" required>
                <input
                  type="text"
                  value={tindakLanjutData.judul_pengaduan || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      judul_pengaduan: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FieldRow>
            </div>

            <div className="mb-4">
              <FieldRow label="Isi Laporan Warga">
                <textarea
                  rows={3}
                  value={tindakLanjutData.isi_laporan_warga || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      isi_laporan_warga: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FieldRow>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Penanganan Admin PPID
              </label>
              <select
                value={tindakLanjutData.status || "menunggu_verifikasi"}
                onChange={(e) =>
                  setTindakLanjutData((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
                <option value="diproses_opd">Diproses OPD</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>

            <div className="mb-6">
              <FieldRow label="Tanggapan / Jawaban Resmi Admin (Dikirim ke Warga)">
                <textarea
                  rows={3}
                  value={tindakLanjutData.tanggapan_admin || ""}
                  onChange={(e) =>
                    setTindakLanjutData((prev) => ({
                      ...prev,
                      tanggapan_admin: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FieldRow>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTindakLanjutModal(false)}
                className="
                  px-6 py-2.5 rounded-lg
                  border border-slate-300
                  text-sm font-semibold text-slate-600
                  hover:bg-slate-50 transition
                "
              >
                Batal
              </button>

              <button
                type="button"
                onClick={saveTindakLanjut}
                className="
                  flex items-center gap-1.5
                  px-5 py-2.5 rounded-lg
                  bg-[#7A1515] text-sm font-semibold
                  text-white hover:bg-[#601010] transition shadow-sm
                "
              >
                <Edit3 size={14} />
                Simpan & Perbarui
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ====================================================
          MODAL: CATAT MANUAL (LOKET / CALL CENTER)
      ===================================================== */}
      <Modal
        show={showCatatModal}
        onClose={() => setShowCatatModal(false)}
      >
        <div>
          <p className="text-xs font-bold text-[#DC2626] mb-1">
            {nextNoAduanPreview}
          </p>
          <h3 className="text-lg font-bold text-slate-800 mb-5">
            Catat Pengaduan Manual (Loket / Call Center)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FieldRow label="Nama Pelapor" required>
              <input
                type="text"
                placeholder="Nama warga pelapor..."
                value={catatForm.nama_pelapor}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    nama_pelapor: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>

            <FieldRow label="Kontak / WhatsApp / Email">
              <input
                type="text"
                placeholder="08xx / email..."
                value={catatForm.kontak_pelapor}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    kontak_pelapor: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FieldRow label="Wilayah DIY / Pusat">
              <select
                value={catatForm.wilayah_id}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    wilayah_id: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Pilih Wilayah</option>
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="OPD / Dinas Tujuan">
              <input
                type="text"
                placeholder="Disdukcapil"
                value={catatForm.opd_tujuan}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    opd_tujuan: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="mb-4">
            <FieldRow label="Judul / Subjek Pengaduan" required>
              <input
                type="text"
                placeholder="Ringkasan kendala layanan..."
                value={catatForm.judul_pengaduan}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    judul_pengaduan: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="mb-4">
            <FieldRow label="Isi Laporan Warga">
              <textarea
                rows={3}
                placeholder="Detail laporan dari warga..."
                value={catatForm.isi_laporan_warga}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    isi_laporan_warga: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Penanganan Admin PPID
            </label>
            <select
              value={catatForm.status}
              onChange={(e) =>
                setCatatForm((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
              <option value="diproses_opd">Diproses OPD</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>

          <div className="mb-6">
            <FieldRow label="Tanggapan / Jawaban Resmi Admin (Dikirim ke Warga)">
              <textarea
                rows={2}
                placeholder="Tulis balasan atau tindak lanjut penyelesaian..."
                value={catatForm.tanggapan_admin}
                onChange={(e) =>
                  setCatatForm((prev) => ({
                    ...prev,
                    tanggapan_admin: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCatatModal(false)}
              className="
                px-6 py-2.5 rounded-lg
                border border-slate-300
                text-sm font-semibold text-slate-600
                hover:bg-slate-50 transition
              "
            >
              Batal
            </button>

            <button
              type="button"
              onClick={saveCatat}
              className="
                flex items-center gap-1.5
                px-5 py-2.5 rounded-lg
                bg-[#7A1515] text-sm font-semibold
                text-white hover:bg-[#601010] transition shadow-sm
              "
            >
              <Edit3 size={14} />
              Simpan & Perbarui
            </button>
          </div>
        </div>
      </Modal>

      {/* ====================================================
          MODAL: SIMULASI ADUAN
      ===================================================== */}
      <Modal
        show={showSimulasiModal}
        onClose={() => setShowSimulasiModal(false)}
      >
        <div>
          <p className="text-xs font-bold text-emerald-600 mb-1">
            Simulasi Chatbot Laras
          </p>
          <h3 className="text-lg font-bold text-slate-800 mb-5">
            Simulasi Aduan Masuk dari User
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FieldRow label="Nama Pelapor" required>
              <input
                type="text"
                placeholder="Nama warga..."
                value={simulasiForm.nama_pelapor}
                onChange={(e) =>
                  setSimulasiForm((prev) => ({
                    ...prev,
                    nama_pelapor: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>

            <FieldRow label="Kontak / WhatsApp / Email">
              <input
                type="text"
                placeholder="08xx / email..."
                value={simulasiForm.kontak_pelapor}
                onChange={(e) =>
                  setSimulasiForm((prev) => ({
                    ...prev,
                    kontak_pelapor: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FieldRow label="Wilayah DIY / Pusat">
              <select
                value={simulasiForm.wilayah_id}
                onChange={(e) =>
                  setSimulasiForm((prev) => ({
                    ...prev,
                    wilayah_id: e.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Pilih Wilayah</option>
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="OPD / Dinas Tujuan">
              <input
                type="text"
                placeholder="OPD tujuan..."
                value={simulasiForm.opd_tujuan}
                onChange={(e) =>
                  setSimulasiForm((prev) => ({
                    ...prev,
                    opd_tujuan: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="mb-4">
            <FieldRow label="Judul / Subjek Pengaduan" required>
              <input
                type="text"
                placeholder="Ringkasan kendala layanan..."
                value={simulasiForm.judul_pengaduan}
                onChange={(e) =>
                  setSimulasiForm((prev) => ({
                    ...prev,
                    judul_pengaduan: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="mb-6">
            <FieldRow label="Isi Laporan Warga">
              <textarea
                rows={3}
                placeholder="Detail laporan dari warga..."
                value={simulasiForm.isi_laporan_warga}
                onChange={(e) =>
                  setSimulasiForm((prev) => ({
                    ...prev,
                    isi_laporan_warga: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FieldRow>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSimulasiModal(false)}
              className="
                px-6 py-2.5 rounded-lg
                border border-slate-300
                text-sm font-semibold text-slate-600
                hover:bg-slate-50 transition
              "
            >
              Batal
            </button>

            <button
              type="button"
              onClick={saveSimulasi}
              className="
                flex items-center gap-1.5
                px-5 py-2.5 rounded-lg
                bg-[#2563EB] text-sm font-semibold
                text-white hover:bg-blue-700 transition shadow-sm
              "
            >
              <Bot size={14} />
              Kirim Simulasi Aduan
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
