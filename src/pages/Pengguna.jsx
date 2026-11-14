
import { useMemo, useState } from "react";

import Topbar from "../components/Topbar";

import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Mail,
  Building2,
  User,
  Clock,
  Hash,
  RefreshCw,
} from "lucide-react";

// ============================================================
// DATA DUMMY PENGGUNA
// ============================================================

const DUMMY_USERS = [
  {
    id: 1,
    nama: "Andi Pratama",
    username: "andipratama",
    email: "andi.pratama@gmail.com",
    nip: "-",
    instansi: "Dinas Komunikasi dan Informatika DIY",
    tanggal_daftar: "2026-11-10",
    terakhir_login: "2026-11-14 09:30",
    status: "Aktif",
  },
  {
    id: 2,
    nama: "Siti Rahmawati",
    username: "siti.rahma",
    email: "siti.rahma@gmail.com",
    nip: "-",
    instansi: "Dinas Pendidikan, Pemuda dan Olahraga DIY",
    tanggal_daftar: "2026-11-09",
    terakhir_login: "2026-11-14 08:15",
    status: "Aktif",
  },
  {
    id: 3,
    nama: "Budi Santoso",
    username: "budisantoso",
    email: "budi.santoso@gmail.com",
    nip: "198705122010011001",
    instansi: "Dinas Kesehatan DIY",
    tanggal_daftar: "2026-11-08",
    terakhir_login: "2026-11-13 15:20",
    status: "Aktif",
  },
  {
    id: 4,
    nama: "Dewi Anggraini",
    username: "dewianggraini",
    email: "dewi.anggraini@gmail.com",
    nip: "-",
    instansi: "Dinas Sosial DIY",
    tanggal_daftar: "2026-11-07",
    terakhir_login: "2026-11-12 10:45",
    status: "Aktif",
  },
  {
    id: 5,
    nama: "Rizky Maulana",
    username: "rizkymaulana",
    email: "rizky.maulana@gmail.com",
    nip: "-",
    instansi: "Dinas Perhubungan DIY",
    tanggal_daftar: "2026-11-06",
    terakhir_login: "2026-11-05 14:10",
    status: "Nonaktif",
  },
  {
    id: 6,
    nama: "Nurul Hidayah",
    username: "nurulhidayah",
    email: "nurul.hidayah@gmail.com",
    nip: "199002152015032002",
    instansi: "Dinas Kependudukan dan Pencatatan Sipil DIY",
    tanggal_daftar: "2026-11-05",
    terakhir_login: "2026-11-14 11:00",
    status: "Aktif",
  },
  {
    id: 7,
    nama: "Agus Setiawan",
    username: "agussetiawan",
    email: "agus.setiawan@gmail.com",
    nip: "-",
    instansi: "Dinas Pertanian dan Ketahanan Pangan DIY",
    tanggal_daftar: "2026-10-28",
    terakhir_login: "2026-10-30 09:15",
    status: "Nonaktif",
  },
  {
    id: 8,
    nama: "Fitri Handayani",
    username: "fitrihandayani",
    email: "fitri.handayani@gmail.com",
    nip: "-",
    instansi: "Dinas Pariwisata DIY",
    tanggal_daftar: "2026-10-25",
    terakhir_login: "2026-11-13 16:30",
    status: "Aktif",
  },
  {
    id: 9,
    nama: "Dimas Saputra",
    username: "dimassaputra",
    email: "dimas.saputra@gmail.com",
    nip: "-",
    instansi: "Dinas Lingkungan Hidup dan Kehutanan DIY",
    tanggal_daftar: "2026-10-20",
    terakhir_login: "2026-10-21 13:00",
    status: "Nonaktif",
  },
  {
    id: 10,
    nama: "Maya Putri",
    username: "mayaputri",
    email: "maya.putri@gmail.com",
    nip: "-",
    instansi: "Dinas Perindustrian dan Perdagangan DIY",
    tanggal_daftar: "2026-10-15",
    terakhir_login: "2026-11-14 07:45",
    status: "Aktif",
  },
  {
    id: 11,
    nama: "Fajar Nugroho",
    username: "fajarnugroho",
    email: "fajar.nugroho@gmail.com",
    nip: "198812102012021003",
    instansi: "Badan Kepegawaian Daerah DIY",
    tanggal_daftar: "2026-09-15",
    terakhir_login: "2026-09-20 08:30",
    status: "Nonaktif",
  },
  {
    id: 12,
    nama: "Indah Permatasari",
    username: "indahpermata",
    email: "indah.permatasari@gmail.com",
    nip: "-",
    instansi: "Dinas Koperasi dan UKM DIY",
    tanggal_daftar: "2026-09-10",
    terakhir_login: "2026-11-12 12:15",
    status: "Aktif",
  },
];

// ============================================================
// FORMAT TANGGAL
// ============================================================

function formatTanggal(date) {
  if (!date) return "-";

  return new Date(date + "T00:00:00").toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

// ============================================================
// FORMAT WAKTU LOGIN
// ============================================================

function formatLogin(date) {
  if (!date) return "-";

  const [tanggal, waktu] = date.split(" ");

  return `${formatTanggal(tanggal)} ${waktu}`;
}

// ============================================================
// INITIAL NAMA
// ============================================================

function getInitials(nama) {
  return nama
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// ============================================================
// WARNA AVATAR
// ============================================================

const AVATAR_COLORS = [
  "bg-red-100 text-red-600",
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-purple-100 text-purple-600",
  "bg-amber-100 text-amber-600",
];

// ============================================================
// HALAMAN PENGGUNA
// ============================================================

export default function Pengguna() {

  // ==========================================================
  // STATE
  // ==========================================================

  const [users, setUsers] = useState(DUMMY_USERS);

  const [search, setSearch] = useState("");

  const [filterStatus, setFilterStatus] = useState("Semua");

  const [filterInstansi, setFilterInstansi] = useState("Semua");

  const [page, setPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);

  const pageSize = 8;

  // ==========================================================
  // DAFTAR INSTANSI
  // ==========================================================

  const instansiList = useMemo(() => {

    return [
      ...new Set(
        users.map((user) => user.instansi)
      ),
    ];

  }, [users]);

  // ==========================================================
  // STATISTIK
  // ==========================================================

  const totalPengguna = users.length;

  const penggunaAktif = users.filter(
    (user) => user.status === "Aktif"
  ).length;

  const penggunaNonaktif = users.filter(
    (user) => user.status === "Nonaktif"
  ).length;

  const penggunaBaru = users.filter(
    (user) => {

      const date = new Date(
        user.tanggal_daftar + "T00:00:00"
      );

      return (
        date.getMonth() === 10 &&
        date.getFullYear() === 2026
      );

    }
  ).length;

  // ==========================================================
  // FILTER DAN PENCARIAN
  // ==========================================================

  const filteredUsers = useMemo(() => {

    return users.filter((user) => {

      const keyword = search.toLowerCase();

      const cocokSearch =
        user.nama.toLowerCase().includes(keyword) ||
        user.username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.nip.toLowerCase().includes(keyword);

      const cocokStatus =
        filterStatus === "Semua" ||
        user.status === filterStatus;

      const cocokInstansi =
        filterInstansi === "Semua" ||
        user.instansi === filterInstansi;

      return (
        cocokSearch &&
        cocokStatus &&
        cocokInstansi
      );

    });

  }, [
    users,
    search,
    filterStatus,
    filterInstansi,
  ]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ==========================================================
  // RESET FILTER
  // ==========================================================

  function resetFilter() {

    setSearch("");
    setFilterStatus("Semua");
    setFilterInstansi("Semua");
    setPage(1);

  }

  // ==========================================================
  // EXPORT CSV
  // ==========================================================

  function exportCSV() {

    const headers = [
      "ID",
      "Nama",
      "Username",
      "Email",
      "NIP",
      "Instansi",
      "Tanggal Daftar",
      "Terakhir Login",
      "Status",
    ];

    const rows = filteredUsers.map((user) => [
      user.id,
      user.nama,
      user.username,
      user.email,
      user.nip,
      user.instansi,
      user.tanggal_daftar,
      user.terakhir_login,
      user.status,
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "data-pengguna-jogjaprov.csv";

    link.click();

    URL.revokeObjectURL(url);

  }

  // ==========================================================
  // UBAH STATUS PENGGUNA (SIMULASI)
  // ==========================================================

  function toggleStatus(id) {

    setUsers((previous) =>
      previous.map((user) =>
        user.id === id
          ? {
              ...user,
              status:
                user.status === "Aktif"
                  ? "Nonaktif"
                  : "Aktif",
            }
          : user
      )
    );

    setSelectedUser((previous) => {

      if (!previous || previous.id !== id) {
        return previous;
      }

      return {
        ...previous,
        status:
          previous.status === "Aktif"
            ? "Nonaktif"
            : "Aktif",
      };

    });

  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>

      <Topbar
        title="Pengguna"
        subtitle="Monitoring akun pengguna website JogjaProv"
      />

      <main
        className="
          flex-1
          min-h-[calc(100vh-104px)]
          bg-slate-100
          p-6
          space-y-6
        "
      >

        {/* ==================================================
            INFORMASI DATA DUMMY
        =================================================== */}

        <div
          className="
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-blue-200
            bg-blue-50
            px-4
            py-3
          "
        >

          <Users
            size={19}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>

            <p
              className="
                text-xs
                font-semibold
                text-blue-800
              "
            >
              Mode data simulasi
            </p>

            <p
              className="
                mt-0.5
                text-xs
                leading-relaxed
                text-blue-700
              "
            >
              Data pengguna yang ditampilkan merupakan data
              dummy untuk keperluan pengembangan dan pengujian
              halaman. Belum terhubung dengan akun asli JogjaProv.
            </p>

          </div>

        </div>

        {/* ==================================================
            STATISTIK
        =================================================== */}

        <section
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <StatCard
            icon={Users}
            label="Total Pengguna"
            value={totalPengguna}
            helper="Seluruh akun terdaftar"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />

          <StatCard
            icon={UserCheck}
            label="Pengguna Aktif"
            value={penggunaAktif}
            helper="Status akun aktif"
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />

          <StatCard
            icon={UserX}
            label="Pengguna Nonaktif"
            value={penggunaNonaktif}
            helper="Status akun nonaktif"
            iconBg="bg-red-50"
            iconColor="text-red-600"
          />

          <StatCard
            icon={UserPlus}
            label="Pengguna Baru"
            value={penggunaBaru}
            helper="Terdaftar bulan November 2026"
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />

        </section>

        {/* ==================================================
            DAFTAR PENGGUNA
        =================================================== */}

        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-slate-100
            bg-white
            shadow-card
          "
        >

          {/* HEADER */}

          <div
            className="
              flex
              flex-col
              gap-3
              border-b
              border-slate-100
              px-5
              py-5
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >

            <div>

              <h2
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Daftar Pengguna
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                Kelola dan pantau akun pengguna website JogjaProv
              </p>

            </div>

            <button
              type="button"
              onClick={exportCSV}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-[#981611]
                px-4
                py-2.5
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-[#7f1410]
              "
            >

              <Users size={15} />

              Export Data

            </button>

          </div>

          {/* =================================================
              FILTER
          ================================================== */}

          <div
            className="
              flex
              flex-col
              gap-3
              border-b
              border-slate-100
              p-5
              xl:flex-row
              xl:items-center
            "
          >

            {/* SEARCH */}

            <div
              className="
                relative
                w-full
                xl:max-w-sm
              "
            >

              <Search
                size={16}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, email, username, NIP..."
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  pl-9
                  pr-3
                  text-xs
                  text-slate-700
                  outline-none
                  transition
                  focus:border-red-400
                  focus:ring-2
                  focus:ring-red-100
                "
              />

            </div>

            {/* FILTER STATUS */}

            <div className="flex items-center gap-2">

              <Filter
                size={16}
                className="shrink-0 text-slate-400"
              />

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="
                  h-10
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  text-xs
                  text-slate-600
                  outline-none
                  focus:border-red-400
                "
              >

                <option value="Semua">
                  Semua Status
                </option>

                <option value="Aktif">
                  Aktif
                </option>

                <option value="Nonaktif">
                  Nonaktif
                </option>

              </select>

            </div>

            {/* FILTER INSTANSI */}

            <select
              value={filterInstansi}
              onChange={(e) => {
                setFilterInstansi(e.target.value);
                setPage(1);
              }}
              className="
                h-10
                w-full
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                text-slate-600
                outline-none
                focus:border-red-400
                xl:w-64
              "
            >

              <option value="Semua">
                Semua Instansi
              </option>

              {instansiList.map((instansi) => (

                <option
                  key={instansi}
                  value={instansi}
                >
                  {instansi}
                </option>

              ))}

            </select>

            {/* RESET */}

            <button
              type="button"
              onClick={resetFilter}
              className="
                inline-flex
                h-10
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-slate-200
                px-3
                text-xs
                font-medium
                text-slate-500
                transition
                hover:bg-slate-50
              "
            >

              <RefreshCw size={14} />

              Reset

            </button>

          </div>

          {/* =================================================
              TABLE
          ================================================== */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px]">

              <thead>

                <tr
                  className="
                    border-b
                    border-slate-100
                    bg-slate-50
                  "
                >

                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Pengguna
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Email
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Instansi
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Tanggal Daftar
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Aksi
                  </th>

                </tr>

              </thead>

              <tbody>

                {paginatedUsers.map((user) => (

                  <tr
                    key={user.id}
                    className="
                      border-b
                      border-slate-100
                      transition
                      hover:bg-slate-50
                    "
                  >

                    {/* USER */}

                    <td className="px-5 py-3.5">

                      <div className="flex items-center gap-3">

                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-xs
                            font-bold
                            ${
                              AVATAR_COLORS[
                                (user.id - 1) % AVATAR_COLORS.length
                              ]
                            }
                          `}
                        >

                          {getInitials(user.nama)}

                        </div>

                        <div className="min-w-0">

                          <p
                            className="
                              truncate
                              text-xs
                              font-semibold
                              text-slate-700
                            "
                          >
                            {user.nama}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[10px]
                              text-slate-400
                            "
                          >
                            @{user.username}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* EMAIL */}

                    <td className="px-4 py-3.5">

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >
                        {user.email}
                      </span>

                    </td>

                    {/* INSTANSI */}

                    <td className="px-4 py-3.5">

                      <span
                        className="
                          block
                          max-w-[230px]
                          text-xs
                          leading-relaxed
                          text-slate-600
                        "
                      >
                        {user.instansi}
                      </span>

                    </td>

                    {/* TANGGAL */}

                    <td className="px-4 py-3.5">

                      <span
                        className="
                          text-xs
                          text-slate-600
                        "
                      >
                        {formatTanggal(user.tanggal_daftar)}
                      </span>

                    </td>

                    {/* STATUS */}

                    <td className="px-4 py-3.5">

                      <StatusBadge status={user.status} />

                    </td>

                    {/* AKSI */}

                    <td className="px-5 py-3.5">

                      <div className="flex justify-center">

                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          title="Lihat detail pengguna"
                          className="
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-slate-200
                            text-slate-500
                            transition
                            hover:border-red-200
                            hover:bg-red-50
                            hover:text-red-600
                          "
                        >

                          <Eye size={15} />

                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

                {/* DATA KOSONG */}

                {paginatedUsers.length === 0 && (

                  <tr>

                    <td
                      colSpan={6}
                      className="
                        px-5
                        py-16
                        text-center
                      "
                    >

                      <Users
                        size={35}
                        className="
                          mx-auto
                          mb-3
                          text-slate-300
                        "
                      />

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-600
                        "
                      >
                        Pengguna tidak ditemukan
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-400
                        "
                      >
                        Coba ubah kata kunci atau filter pencarian.
                      </p>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              PAGINATION
          ================================================== */}

          <div
            className="
              flex
              flex-col
              gap-3
              border-t
              border-slate-100
              px-5
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <p className="text-xs text-slate-400">

              Menampilkan{" "}

              {filteredUsers.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}

              {" - "}

              {Math.min(
                currentPage * pageSize,
                filteredUsers.length
              )}

              {" dari "}

              {filteredUsers.length} pengguna

            </p>

            <div className="flex items-center justify-end gap-1">

              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setPage((previous) =>
                    Math.max(1, previous - 1)
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  text-slate-500
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >

                <ChevronLeft size={15} />

              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((number) => (

                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`
                    flex
                    h-8
                    min-w-8
                    items-center
                    justify-center
                    rounded-lg
                    border
                    px-2
                    text-xs
                    font-medium
                    transition
                    ${
                      currentPage === number
                        ? "border-[#981611] bg-[#981611] text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }
                  `}
                >

                  {number}

                </button>

              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((previous) =>
                    Math.min(totalPages, previous + 1)
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  text-slate-500
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >

                <ChevronRight size={15} />

              </button>

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          DETAIL MODAL
      ====================================================== */}

      {selectedUser && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/40
            p-4
          "
          onMouseDown={(e) => {

            if (e.target === e.currentTarget) {
              setSelectedUser(null);
            }

          }}
        >

          <div
            className="
              w-full
              max-w-lg
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
            "
          >

            {/* MODAL HEADER */}

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                px-6
                py-4
              "
            >

              <div>

                <h2 className="text-sm font-bold text-slate-800">
                  Detail Pengguna
                </h2>

                <p className="mt-1 text-[11px] text-slate-400">
                  Informasi profil akun pengguna
                </p>

              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  hover:bg-slate-100
                "
              >

                <X size={17} />

              </button>

            </div>

            {/* PROFILE */}

            <div className="p-6">

              <div
                className="
                  flex
                  flex-col
                  items-center
                  border-b
                  border-slate-100
                  pb-5
                "
              >

                <div
                  className={`
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-full
                    text-xl
                    font-bold
                    ${
                      AVATAR_COLORS[
                        (selectedUser.id - 1) % AVATAR_COLORS.length
                      ]
                    }
                  `}
                >

                  {getInitials(selectedUser.nama)}

                </div>

                <h3
                  className="
                    mt-3
                    text-base
                    font-bold
                    text-slate-800
                  "
                >
                  {selectedUser.nama}
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  @{selectedUser.username}
                </p>

                <div className="mt-3">

                  <StatusBadge status={selectedUser.status} />

                </div>

              </div>

              {/* DETAIL INFORMASI */}

              <div className="space-y-4 py-5">

                <DetailItem
                  icon={Mail}
                  label="Email"
                  value={selectedUser.email}
                />

                <DetailItem
                  icon={Hash}
                  label="NIP"
                  value={selectedUser.nip}
                />

                <DetailItem
                  icon={Building2}
                  label="Instansi"
                  value={selectedUser.instansi}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Tanggal Pendaftaran"
                  value={formatTanggal(selectedUser.tanggal_daftar)}
                />

                <DetailItem
                  icon={Clock}
                  label="Terakhir Login"
                  value={formatLogin(selectedUser.terakhir_login)}
                />

              </div>

              {/* UBAH STATUS SIMULASI */}

              <div
                className="
                  rounded-lg
                  bg-slate-50
                  p-4
                "
              >

                <p className="text-xs font-semibold text-slate-700">
                  Status Akun
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Perubahan status hanya berlaku selama simulasi.
                </p>

                <button
                  type="button"
                  onClick={() => toggleStatus(selectedUser.id)}
                  className={`
                    mt-3
                    w-full
                    rounded-lg
                    px-4
                    py-2.5
                    text-xs
                    font-semibold
                    transition
                    ${
                      selectedUser.status === "Aktif"
                        ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }
                  `}
                >

                  {selectedUser.status === "Aktif"
                    ? "Nonaktifkan Akun"
                    : "Aktifkan Akun"}

                </button>

              </div>

            </div>

            {/* MODAL FOOTER */}

            <div
              className="
                flex
                justify-end
                border-t
                border-slate-100
                px-6
                py-4
              "
            >

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="
                  rounded-lg
                  border
                  border-slate-200
                  px-4
                  py-2
                  text-xs
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >

                Tutup

              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );

}

// ============================================================
// KOMPONEN STATISTIK
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  iconBg,
  iconColor,
}) {

  return (

    <div
      className="
        flex
        min-w-0
        items-center
        gap-4
        rounded-xl
        border
        border-slate-100
        bg-white
        p-5
        shadow-card
      "
    >

      <div
        className={`
          flex
          h-12
          w-12
          shrink-0
          items-center
          justify-center
          rounded-xl
          ${iconBg}
        `}
      >

        <Icon
          size={21}
          className={iconColor}
        />

      </div>

      <div className="min-w-0">

        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-0.5 text-2xl font-bold text-slate-800">
          {value}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {helper}
        </p>

      </div>

    </div>

  );

}

// ============================================================
// KOMPONEN STATUS
// ============================================================

function StatusBadge({ status }) {

  const active = status === "Aktif";

  return (

    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-2.5
        py-1
        text-[10px]
        font-semibold
        ${
          active
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-600"
        }
      `}
    >

      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${
            active
              ? "bg-green-500"
              : "bg-red-500"
          }
        `}
      />

      {status}

    </span>

  );

}

// ============================================================
// KOMPONEN DETAIL
// ============================================================

function DetailItem({
  icon: Icon,
  label,
  value,
}) {

  return (

    <div className="flex items-start gap-3">

      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-slate-100
          text-slate-500
        "
      >

        <Icon size={16} />

      </div>

      <div className="min-w-0 flex-1">

        <p className="text-[10px] font-semibold uppercase text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-xs font-medium text-slate-700">
          {value || "-"}
        </p>

      </div>

    </div>

  );

}
