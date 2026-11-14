
import {
  FilePlus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const getStatusType = (status = "") => {
  const value = status.toLowerCase().trim();

  if (["aktif", "active"].includes(value)) return "aktif";
  if (value.includes("perlu update") ||
      value.includes("perlu pembaruan") ||
      value === "need_review") return "update";

  return "kendala";
};

export const percentage = (value, total) =>
  total ? `${((value / total) * 100).toFixed(1).replace(".", ",")}%` : "0%";

export const formatDate = (value) => {
  const date = new Date(value);
  return !value || isNaN(date) ? "-" : new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
};

export const mapLayanan = (item) => ({
  id: item.id,
  wilayah: item.instansi?.wilayah?.nama || "-",
  wilayahId: item.instansi?.wilayah?.id ?? null,
  dinas: item.instansi?.nama_instansi || "-",
  layanan: item.nama_layanan || "-",
  kataKunci: (item.keywords || []).map(k =>
    typeof k === "string" ? k : k.keyword
  ),
  status: item.status || "-",
  kategori: item.kategori?.nama_kategori || "Tanpa Kategori",
  createdAt: item.created_at,
  monitoring: item.monitoring || [],
  statuses: item.statuses || [],
  sumber: item.sumber || [],
});

export const getRegionCode = (region) => {
  const name = `${region.nama} ${region.tipe}`.toLowerCase();
  const codes = [
    ["provinsi", "DIY"], ["kota yogyakarta", "YK"],
    ["sleman", "SLM"], ["bantul", "BTL"],
    ["kulon progo", "KLP"], ["gunungkidul", "GNK"],
    ["pusat", "PST"], ["nasional", "PST"],
  ];

  return codes.find(([key]) => name.includes(key))?.[1] ||
    region.nama.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
};

export const getRegionLabel = (name = "") =>
  name.replace(/^Kabupaten\s+/i, "Kab. ")
      .replace(/^Kab\.\s*/i, "Kab. ");

export const buildRegionStats = (regions, services) => {
  const order = ["DIY", "YK", "SLM", "BTL", "KLP", "GNK", "PST"];

  return regions.map(region => {
    const items = services.filter(item =>
      String(item.instansi?.wilayah?.id ?? "") === String(region.id)
    );

    const aktif = items.filter(item =>
      getStatusType(item.status) === "aktif"
    ).length;

    const update = items.filter(item =>
      getStatusType(item.status) === "update"
    ).length;

    const code = getRegionCode(region);

    return {
      id: region.id,
      nama: region.nama,
      code,
      label: getRegionLabel(region.nama),
      total: items.length,
      aktif,
      update,
      kendala: items.length - aktif,
      nonaktif: items.length - aktif - update,
    };
  }).sort((a, b) =>
    (order.indexOf(a.code) < 0 ? 99 : order.indexOf(a.code)) -
    (order.indexOf(b.code) < 0 ? 99 : order.indexOf(b.code))
  );
};

export const buildMonitoringData = (services) => {
  const grouped = new Map();

  services.forEach(service =>
    (service.monitoring || []).forEach(record => {
      if (!record.periode) return;

      const date = new Date(record.periode);
      if (isNaN(date)) return;

      const key = date.toISOString().slice(0, 10);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          day: date.toLocaleDateString("id-ID", {
            day: "2-digit", month: "short",
          }),
          queries: 0,
          berhasil: 0,
          gagal: 0,
        });
      }

      const item = grouped.get(key);
      const response = Number(record.jumlah_response) || 0;
      const failed = Number(record.failed_response) || 0;

      item.queries += Number(record.jumlah_query) || 0;
      item.gagal += failed;
      item.berhasil += Math.max(response - failed, 0);
    })
  );

  return [...grouped.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-7);
};

export const buildActivities = (services) => {
  const activities = [];

  services.forEach(service => {
    const name = service.nama_layanan;
    const instansi = service.instansi?.nama_instansi || "instansi";

    if (service.created_at) activities.push({
      type: "created",
      date: service.created_at,
      icon: FilePlus,
      color: "bg-blue-600",
      text: `Layanan "${name}" terdaftar di ${instansi}`,
    });

    (service.statuses || []).forEach(item => {
      if (item.checked_at) activities.push({
        type: "status",
        date: item.checked_at,
        icon: ShieldCheck,
        color: "bg-violet-600",
        text: `Status ${item.status} pada layanan "${name}" diperiksa`,
      });
    });

    (service.sumber || []).forEach(item => {
      if (item.verified_at) activities.push({
        type: "verified",
        date: item.verified_at,
        icon: CheckCircle2,
        color: "bg-green-600",
        text: `Sumber layanan "${name}" berhasil diverifikasi`,
      });
    });
  });

  return activities
    .filter(item => !isNaN(new Date(item.date)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
};

export const buildCategoryData = (services) => {
  const colors = [
    "#0d9488", "#2563eb", "#f59e0b", "#8b5cf6",
    "#64748b", "#ea580c", "#0891b2",
  ];

  const groups = {};

  services.forEach(item => {
    const name = item.kategori?.nama_kategori || "Tanpa Kategori";
    groups[name] = (groups[name] || 0) + 1;
  });

  return Object.entries(groups)
    .map(([name, value], index) => ({
      name, value, color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);
};

export const getConfidenceAverage = (services) => {
  const values = services.flatMap(s => s.monitoring || [])
    .map(item => Number(item.confidence_score))
    .filter(Number.isFinite);

  if (!values.length) return null;

  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return average <= 1 ? average * 100 : average;
};
