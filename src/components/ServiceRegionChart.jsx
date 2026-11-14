
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ============================================================
// CHART STATISTIK WILAYAH
// ============================================================

export default function ServiceRegionChart({
  data = [],
}) {

  if (!data.length) {

    return (
      <div className="
        flex
        h-[190px]
        items-center
        justify-center
        text-xs
        text-slate-400
      ">
        Data wilayah belum tersedia.
      </div>
    );

  }

  const chartData = data.map((item) => ({
    wilayah: item.code,
    Aktif: item.aktif,
    "Perlu Update": item.update,
    "Kendala Lainnya": item.nonaktif,
  }));

  return (

    <div>

      {/* LEGEND */}

      <div className="
        mb-3
        flex
        flex-wrap
        items-center
        gap-3
      ">

        <span className="
          flex items-center gap-1
          text-[10px] text-slate-500
        ">
          <i className="h-2 w-2 rounded-full bg-green-600" />
          Aktif
        </span>

        <span className="
          flex items-center gap-1
          text-[10px] text-slate-500
        ">
          <i className="h-2 w-2 rounded-full bg-orange-500" />
          Perlu Update
        </span>

        <span className="
          flex items-center gap-1
          text-[10px] text-slate-500
        ">
          <i className="h-2 w-2 rounded-full bg-red-600" />
          Kendala Lainnya
        </span>

      </div>

      {/* CHART */}

      <div className="h-[190px] w-full">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              bottom: 5,
              left: -15,
            }}
          >

            <CartesianGrid
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="wilayah"
              tick={{
                fontSize: 9,
                fill: "#94a3b8",
              }}
              axisLine={{
                stroke: "#e2e8f0",
              }}
              tickLine={false}
            />

            <YAxis
              tick={{
                fontSize: 9,
                fill: "#94a3b8",
              }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />

            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            />

            <Legend
              wrapperStyle={{
                fontSize: 10,
              }}
            />

            <Line
              type="monotone"
              dataKey="Aktif"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "#16a34a",
              }}
            />

            <Line
              type="monotone"
              dataKey="Perlu Update"
              stroke="#f97316"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "#f97316",
              }}
            />

            <Line
              type="monotone"
              dataKey="Kendala Lainnya"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "#dc2626",
              }}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>

  );

}
