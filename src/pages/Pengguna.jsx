import Topbar from "../components/Topbar";

// Halaman Pengguna sengaja dikosongkan karena sistem hanya memiliki
// satu akun admin yang dikelola melalui konfigurasi backend.
export default function Pengguna() {
  return (
    <>
      <Topbar title="Pengguna" subtitle="" />
      <main className="flex-1 min-h-full" aria-label="Halaman Pengguna kosong" />
    </>
  );
}
