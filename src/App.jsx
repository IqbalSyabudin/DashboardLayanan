import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ============================================================
// LAYOUT
// ============================================================

import Layout from "./components/Layout";

// ============================================================
// PAGES
// ============================================================

// AUTH
import Login from "./pages/Login";

// DASHBOARD
import Dashboard from "./pages/Dashboard";

// DATA LAYANAN
import DataLayanan from "./pages/DataLayanan";
import FormLayanan from "./pages/FormLayanan";

// DINAS / INSTANSI
import Dinas from "./pages/Instansi";
import FormInstansi from "./pages/FormInstansi";

// STATUS
import Status from "./pages/Status";

// KATA KUNCI
import KataKunci from "./pages/KataKunci";
import FormKataKunci from "./pages/FormKatakunci";

// PENGGUNA
import Pengguna from "./pages/Pengguna";

// LAPORAN
import Laporan from "./pages/Laporan";

// PENGADUAN
import Pengaduan from "./pages/Pengaduan";

// PENGATURAN
import Pengaturan from "./pages/Pengaturan";

// FITUR YANG BELUM DIBUAT
import ComingSoon from "./pages/ComingSoon";

// ============================================================
// PROTECTED ROUTE
// ============================================================

function RequireAuth({ children }) {

  const token =
    localStorage.getItem("token");

  if (!token) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }

  return children;
}

// ============================================================
// APP
// ============================================================

export default function App() {

  return (
    <Routes>

      {/* ================================================== */}
      {/* ROOT */}
      {/* ================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* ================================================== */}
      {/* LOGIN */}
      {/* ================================================== */}

      <Route
        path="/login"
        element={
          <Login />
        }
      />
      {/* ================================================== */}
      {/* PROTECTED AREA */}
      {/* ================================================== */}

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >

        {/* ================================================= */}
        {/* DASHBOARD */}
        {/* ================================================= */}

        <Route
          path="/dashboard"
          element={
            <Dashboard />
          }
        />

        {/* ================================================= */}
        {/* DATA LAYANAN */}
        {/* ================================================= */}

        <Route
          path="/data-layanan"
          element={
            <DataLayanan />
          }
        />

        {/* ================================================= */}
        {/* FORM LAYANAN */}
        {/* ================================================= */}

        <Route
          path="/data-layanan/tambah"
          element={
            <FormLayanan />
          }
        />

        {/* ================================================= */}
        {/* DINAS / INSTANSI */}
        {/* ================================================= */}

        <Route
          path="/dinas"
          element={
            <Dinas />
          }
        />

        <Route
          path="/dinas/tambah"
          element={
            <FormInstansi />
          }
        />

        {/* ================================================= */}
        {/* STATUS */}
        {/* ================================================= */}

        <Route
          path="/status"
          element={
            <Status />
          }
        />

        {/* ================================================= */}
        {/* KATA KUNCI */}
        {/* ================================================= */}

        <Route
          path="/kata-kunci"
          element={
            <KataKunci />
          }
        />

        <Route
          path="/kata-kunci/tambah"
          element={
            <FormKataKunci />
          }
        />

        {/* ================================================= */}
        {/* PENGGUNA */}
        {/* ================================================= */}

        <Route
          path="/pengguna"
          element={
            <Pengguna />
          }
        />
        {/* ================================================= */}
        {/* LAPORAN */}
        {/* ================================================= */}

        <Route
          path="/laporan"
          element={
            <Laporan />
          }
        />

        {/* ================================================= */}
        {/* PENGADUAN */}
        {/* ================================================= */}

        <Route
          path="/pengaduan"
          element={
            <Pengaduan />
          }
        />

        {/* ================================================= */}
        {/* PENGATURAN */}
        {/* ================================================= */}

        <Route
          path="/pengaturan"
          element={
            <Pengaturan />
          }
        />

      </Route>

      {/* ================================================== */}
      {/* FALLBACK */}
      {/* ================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}
