import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { api } from "../lib/api";

export default function ServiceHistory() {
  const [vehicles, setVehicles] = useState([]);
  const [records, setRecords] = useState([]);
  const [filterVehicle, setFilterVehicle] = useState("");

  useEffect(() => {
    (async () => {
      const [v, r] = await Promise.all([api.get("/vehicles"), api.get("/service-records")]);
      setVehicles(v.data); setRecords(r.data);
    })();
  }, []);

  const filtered = useMemo(() => filterVehicle ? records.filter(r => r.vehicle_id === filterVehicle) : records, [records, filterVehicle]);
  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      <div className="label-mono mb-2">// servis geçmişi</div>
      <h1 className="font-heading text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-8">Servis Kayıtları</h1>

      <div className="flex flex-wrap gap-4 mb-8 items-end">
        <div>
          <label className="label-mono block mb-2">Araç Filtresi</label>
          <select
            value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}
            data-testid="history-vehicle-filter"
            className="bg-card border border-border focus:border-brand outline-none px-3 py-2 font-mono text-sm min-w-[260px]"
          >
            <option value="">Tüm araçlar</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>)}
          </select>
        </div>
        <div className="stat-block min-w-[200px]">
          <div className="label-mono">Toplam Harcama</div>
          <div className="font-heading text-3xl font-black text-brand mt-2">{totalCost.toLocaleString("tr-TR")} ₺</div>
        </div>
        <div className="stat-block min-w-[160px]">
          <div className="label-mono">Toplam Kayıt</div>
          <div className="font-heading text-3xl font-black mt-2">{filtered.length}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-4 text-brand" />
          Bu kriterlerle servis kaydı bulunamadı.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const v = vehicles.find(x => x.id === r.vehicle_id);
            return (
              <article key={r.id} className="border border-border bg-card p-6" data-testid={`record-${r.id}`}>
                <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{r.date}</div>
                    <h3 className="font-heading text-xl font-bold uppercase">{v ? `${v.brand} ${v.model}` : "Araç"} <span className="text-brand">·</span> <span className="font-mono text-base">{v?.plate}</span></h3>
                  </div>
                  <div className="text-right">
                    <div className="label-mono">Maliyet</div>
                    <div className="font-heading text-2xl font-black text-brand">{r.cost.toLocaleString("tr-TR")} ₺</div>
                  </div>
                </header>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="label-mono mb-1">Onarım</div>
                    <p className="text-sm">{r.repairs}</p>
                  </div>
                  <div>
                    <div className="label-mono mb-1">Değiştirilen Parçalar</div>
                    <ul className="text-sm space-y-1">
                      {(r.parts_replaced || []).length ? r.parts_replaced.map((p, i) => (
                        <li key={i} className="font-mono text-xs">▸ {p}</li>
                      )) : <li className="text-muted-foreground text-xs">—</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="label-mono mb-1">Teknisyen</div>
                    <div className="text-sm font-bold">{r.technician_name}</div>
                    {r.technician_notes && <p className="text-xs text-muted-foreground mt-2 border-l-2 border-brand pl-2">{r.technician_notes}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
