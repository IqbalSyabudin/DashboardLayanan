import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  Search,
  Tags,
  Database,
  Layers,
  Hash,
  Eye,
  Pencil,
  Trash2,
  X,
  RefreshCcw,
} from "lucide-react";

import Topbar from "../components/Topbar";
import Breadcrumb from "../components/Breadcrumb";
import Pagination from "../components/Pagination";

import {
  apiRequest,
} from "../services/api";

// ============================================================
// PAGE
// ============================================================

export default function KataKunci() {

  const navigate =
    useNavigate();

  // ==========================================================
  // DATA
  // ==========================================================

  const [
    rows,
    setRows,
  ] = useState([]);

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const [
    summary,
    setSummary,
  ] = useState({
    total_keyword: 0,
    keyword_unik: 0,
    total_layanan: 0,
    layanan_punya_keyword: 0,
  });

  // ==========================================================
  // SEARCH
  // ==========================================================

  const [
    search,
    setSearch,
  ] = useState("");

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  // ==========================================================
  // DETAIL
  // ==========================================================

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [
    showDetail,
    setShowDetail,
  ] = useState(false);

  // ==========================================================
  // LOAD SUMMARY
  // ==========================================================

  async function loadSummary() {

    try {

      const result =
        await apiRequest(
          "/layanan-keyword/summary"
        );

      setSummary(
        result?.data || {
          total_keyword: 0,
          keyword_unik: 0,
          total_layanan: 0,
          layanan_punya_keyword: 0,
        }
      );

    } catch (err) {

      console.error(
        "Gagal mengambil summary keyword:",
        err
      );
    }
  }

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  async function loadData() {

    setLoading(true);
    setError("");

    try {

      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(
          pagination.page
        )
      );

      params.set(
        "limit",
        String(
          pagination.limit
        )
      );

      if (
        search.trim()
      ) {

        params.set(
          "search",
          search.trim()
        );
      }

      const result =
        await apiRequest(
          `/layanan-keyword?${params.toString()}`
        );

      setRows(
        result?.data || []
      );

      if (
        result?.pagination
      ) {

        setPagination(
          result.pagination
        );
      }

    } catch (err) {

      setError(
        err.message ||
        "Gagal mengambil data kata kunci."
      );

      setRows([]);

    } finally {

      setLoading(false);

    }
  }

  // ==========================================================
  // INITIAL
  // ==========================================================

  useEffect(() => {

    loadSummary();

  }, []);

  // ==========================================================
  // DATA
  // ==========================================================

  useEffect(() => {

    loadData();

  }, [
    pagination.page,
    pagination.limit,
    search,
  ]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  function handleSearch(
    e
  ) {

    setSearch(
      e.target.value
    );

    setPagination(
      (current) => ({
        ...current,
        page: 1,
      })
    );
  }

  // ==========================================================
  // VIEW
  // ==========================================================

  async function handleView(
    item
  ) {

    try {

      const result =
        await apiRequest(
          `/layanan-keyword/${item.id}`
        );

      setSelected(
        result?.data ||
        item
      );

    } catch {

      setSelected(
        item
      );

    }

    setShowDetail(
      true
    );
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async function handleDelete(
    item
  ) {

    const confirmed =
      window.confirm(
        `Hapus kata kunci "${item.keyword}"?`
      );

    if (!confirmed) {
      return;
    }

    try {

      await apiRequest(
        `/layanan-keyword/${item.id}`,
        {
          method: "DELETE",
        }
      );

      await loadSummary();

      if (
        rows.length === 1 &&
        pagination.page > 1
      ) {

        setPagination(
          (current) => ({
            ...current,
            page:
              current.page - 1,
          })
        );

      } else {

        await loadData();

      }

    } catch (err) {

      window.alert(
        err.message ||
        "Gagal menghapus kata kunci."
      );
    }
  }

  // ==========================================================
  // REFRESH
  // ==========================================================

  async function handleRefresh() {

    await Promise.all([
      loadSummary(),
      loadData(),
    ]);
  }

  // ==========================================================
  // CLOSE DETAIL
  // ==========================================================

  function closeDetail() {

    setShowDetail(
      false
    );

    setSelected(
      null
    );
  }

  return (
    <>
      {/* =====================================================
          TOPBAR
      ====================================================== */}

      <Topbar
        title="Kata Kunci"
        subtitle="
          Kelola kata kunci layanan informasi publik
        "
      />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        className="
          flex-1
          bg-slate-100
          p-6
        "
      >

        {/* BREADCRUMB */}

        <Breadcrumb
          items={[
            {
              label:
                "Beranda",
              to:
                "/dashboard",
            },

            {
              label:
                "Kata Kunci",
            },
          ]}
        />

        {/* ERROR */}

        {error && (

          <div
            className="
              mb-5
              rounded-lg
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-xs
              text-red-700
            "
          >
            {error}
          </div>

        )}

        {/* ===================================================
            SUMMARY
        ==================================================== */}

        <div
          className="
            mb-6
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <KeywordCard
            icon={Database}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            label="Total Kata Kunci"
            value={
              summary.total_keyword
            }
            description="
              Seluruh record keyword
            "
          />

          <KeywordCard
            icon={Hash}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Kata Kunci Unik"
            value={
              summary.keyword_unik
            }
            description="
              Keyword unik
            "
          />

          <KeywordCard
            icon={Layers}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Total Layanan"
            value={
              summary.total_layanan
            }
            description="
              Seluruh layanan
            "
          />

          <KeywordCard
            icon={Tags}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            label="Layanan Ber-keyword"
            value={
              summary.layanan_punya_keyword
            }
            description="
              Layanan memiliki keyword
            "
          />

        </div>

        {/* ===================================================
            TABLE
        ==================================================== */}

        <div
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
              flex-wrap
              items-center
              justify-between
              gap-3
              border-b
              border-slate-100
              px-6
              py-5
            "
          >

            <div>
              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Daftar Kata Kunci
              </h2>
            </div>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <button
                type="button"
                onClick={
                  handleRefresh
                }
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-medium
                  text-slate-600
                  hover:bg-slate-50
                "
              >

                <RefreshCcw
                  size={13}
                />

                Refresh

              </button>

              <Link
                to="/kata-kunci/tambah"
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-red-700
                  px-4
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  hover:bg-red-800
                "
              >

                <Tags
                  size={13}
                />

                Tambah Kata Kunci

              </Link>

            </div>

          </div>

          {/* =================================================
              SEARCH
          ================================================== */}

          <div
            className="
              px-6
              py-4
            "
          >

            <label
              className="
                relative
                block
                max-w-xl
              "
            >

              <Search
                size={14}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="text"
                value={
                  search
                }
                onChange={
                  handleSearch
                }
                placeholder="
                  Cari kata kunci, layanan, instansi, wilayah...
                "
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-slate-50
                  py-2.5
                  pl-9
                  pr-3
                  text-xs
                  text-slate-700
                  outline-none
                  focus:bg-white
                  focus:ring-2
                  focus:ring-red-400
                "
              />

            </label>

          </div>

          {/* LOADING */}

          {loading ? (

            <div
              className="flex items-center justify-center px-6 py-14"
              role="status"
              aria-label="Memuat data"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-200 border-t-red-600" />
            </div>

          ) : (

            <div
              className="
                overflow-x-auto
              "
            >

              <table
                className="
                  w-full
                  min-w-[1100px]
                  text-left
                  text-xs
                "
              >

                <thead>

                  <tr
                    className="
                      border-y
                      border-slate-100
                      bg-slate-50/70
                      text-slate-600
                    "
                  >

                    <th
                      className="
                        w-12
                        px-4
                        py-3
                        text-center
                        font-bold
                      "
                    >
                      No
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        font-bold
                      "
                    >
                      Kata Kunci
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        font-bold
                      "
                    >
                      Kode Layanan
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        font-bold
                      "
                    >
                      Nama Layanan
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        font-bold
                      "
                    >
                      Instansi
                    </th>

                    <th
                      className="
                        px-4
                        py-3
                        font-bold
                      "
                    >
                      Wilayah
                    </th>

                    <th
                      className="
                        w-24
                        px-4
                        py-3
                        text-center
                        font-bold
                      "
                    >
                      Aksi
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {rows.map(
                    (
                      item,
                      index
                    ) => {

                      const nomor =
                        (
                          pagination.page -
                          1
                        ) *
                          pagination.limit +
                        index +
                        1;

                      return (

                        <tr
                          key={
                            item.id
                          }
                          className="
                            border-b
                            border-slate-100
                            hover:bg-slate-50/60
                          "
                        >

                          {/* NO */}

                          <td
                            className="
                              px-4
                              py-4
                              text-center
                              text-slate-500
                            "
                          >
                            {nomor}
                          </td>

                          {/* KEYWORD */}

                          <td
                            className="
                              px-4
                              py-4
                            "
                          >

                            <span
                              className="
                                inline-flex
                                rounded-md
                                bg-blue-50
                                px-2.5
                                py-1
                                text-[10px]
                                font-semibold
                                text-blue-700
                              "
                            >
                              {
                                item.keyword ||
                                "-"
                              }
                            </span>

                          </td>

                          {/* KODE */}

                          <td
                            className="
                              px-4
                              py-4
                              font-mono
                              text-[10px]
                              text-slate-500
                            "
                          >
                            {
                              item.kode_layanan ||
                              "-"
                            }
                          </td>

                          {/* LAYANAN */}

                          <td
                            className="
                              px-4
                              py-4
                            "
                          >

                            <p
                              className="
                                max-w-[260px]
                                font-semibold
                                text-slate-800
                              "
                            >
                              {
                                item.nama_layanan ||
                                "-"
                              }
                            </p>

                          </td>

                          {/* INSTANSI */}

                          <td
                            className="
                              px-4
                              py-4
                              text-slate-600
                            "
                          >

                            <p
                              className="
                                max-w-[260px]
                              "
                            >
                              {
                                item.nama_instansi ||
                                "-"
                              }
                            </p>

                          </td>

                          {/* WILAYAH */}

                          <td
                            className="
                              px-4
                              py-4
                              text-slate-600
                            "
                          >
                            {
                              item.wilayah ||
                              "-"
                            }
                          </td>

                          {/* AKSI */}

                          <td
                            className="
                              px-4
                              py-3
                            "
                          >

                            <div
                              className="
                                flex
                                items-center
                                justify-center
                                gap-1.5
                              "
                            >

                              {/* VIEW */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleView(
                                    item
                                  )
                                }
                                title="Lihat"
                                className="
                                  flex
                                  h-7
                                  w-7
                                  items-center
                                  justify-center
                                  rounded
                                  border
                                  border-slate-300
                                  text-slate-500
                                  hover:bg-slate-50
                                "
                              >

                                <Eye
                                  size={12}
                                />

                              </button>

                              {/* EDIT */}

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/kata-kunci/tambah?id=${item.id}`
                                  )
                                }
                                title="Edit"
                                className="
                                  flex
                                  h-7
                                  w-7
                                  items-center
                                  justify-center
                                  rounded
                                  border
                                  border-slate-300
                                  text-slate-500
                                  hover:bg-slate-50
                                "
                              >

                                <Pencil
                                  size={12}
                                />

                              </button>

                              {/* DELETE */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    item
                                  )
                                }
                                title="Hapus"
                                className="
                                  flex
                                  h-7
                                  w-7
                                  items-center
                                  justify-center
                                  rounded
                                  border
                                  border-red-200
                                  text-red-500
                                  hover:bg-red-50
                                "
                              >

                                <Trash2
                                  size={12}
                                />

                              </button>

                            </div>

                          </td>

                        </tr>

                      );
                    }
                  )}

                  {/* EMPTY */}

                  {rows.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan={7}
                        className="
                          px-4
                          py-14
                          text-center
                          text-xs
                          text-slate-400
                        "
                      >
                        Tidak ada data kata kunci yang sesuai.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          )}

          {/* PAGINATION */}

          {!loading && (

            <div
              className="
                border-t
                border-slate-100
                px-6
                py-4
              "
            >

              <Pagination
                page={
                  pagination.page
                }

                totalPages={
                  pagination.total_pages
                }

                totalItems={
                  pagination.total
                }

                pageSize={
                  pagination.limit
                }

                onPageChange={
                  (nextPage) =>
                    setPagination(
                      (current) => ({
                        ...current,
                        page:
                          nextPage,
                      })
                    )
                }
              />

            </div>

          )}

        </div>

      </main>

      {/* =====================================================
          DETAIL MODAL
      ====================================================== */}

      {showDetail &&
        selected && (

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
          onMouseDown={
            closeDetail
          }
        >

          <div
            className="
              w-full
              max-w-xl
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
            "
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

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

                <h2
                  className="
                    text-sm
                    font-bold
                    text-slate-800
                  "
                >
                  Detail Kata Kunci
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  Data dari layanan_keyword
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeDetail
                }
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

                <X
                  size={16}
                />

              </button>

            </div>

            {/* BODY */}

            <div
              className="
                space-y-4
                p-6
              "
            >

              <DetailItem
                label="ID"
                value={
                  selected.id
                }
              />

              <DetailItem
                label="ID Layanan"
                value={
                  selected.layanan_id
                }
              />

              <DetailItem
                label="Kata Kunci"
                value={
                  selected.keyword
                }
              />

              <DetailItem
                label="Kode Layanan"
                value={
                  selected.kode_layanan
                }
              />

              <DetailItem
                label="Nama Layanan"
                value={
                  selected.nama_layanan
                }
              />

              <DetailItem
                label="Instansi"
                value={
                  selected.nama_instansi
                }
              />

              <DetailItem
                label="Wilayah"
                value={
                  selected.wilayah
                }
              />

            </div>

            {/* FOOTER */}

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
                onClick={
                  closeDetail
                }
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
// CARD
// ============================================================

function KeywordCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  description,
}) {

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-100
        bg-white
        p-5
        shadow-card
      "
    >

      <div
        className="
          flex
          items-center
          gap-3
        "
      >

        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${iconBg}
            ${iconColor}
          `}
        >

          <Icon
            size={21}
          />

        </div>

        <div>

          <p
            className="
              text-xs
              text-slate-500
            "
          >
            {label}
          </p>

          <p
            className="
              text-2xl
              font-bold
              text-slate-800
            "
          >
            {value}
          </p>

          <p
            className="
              text-[10px]
              text-slate-400
            "
          >
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

// ============================================================
// DETAIL
// ============================================================

function DetailItem({
  label,
  value,
}) {

  return (
    <div>

      <p
        className="
          mb-1
          text-[10px]
          font-bold
          uppercase
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className="
          text-xs
          font-medium
          text-slate-700
        "
      >
        {value || "-"}
      </p>

    </div>
  );
}