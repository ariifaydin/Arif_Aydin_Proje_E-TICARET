import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Truck, AlertTriangle, ChevronRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { MODULES } from "../lib/modules";

export default function VehicleDetail() {
  const { vehicleId } = useParams();
  const nav = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [counts, setCounts] = useState({}); // { engine: { issues: 3, openCount: 2, recurring: null }, ... }

  useEffect(() => {
    (async () => {
      try {
        const { data: vehicles } = await api.get("/vehicles");
        const v = vehicles.find((x) => x.id === vehicleId);
        if (!v) { toast.error("Araç bulunamadı"); nav("/panel"); return; }
        setVehicle(v);

        // Fetch each module summary in parallel
        const realModules = MODULES.filter((m) => m.key !== "ai_diagnostic");
        const results = await Promise.all(
          realModules.map((m) =>
            api.get(`/vehicles/${vehicleId}/modules/${m.key}`).then((r) => [m.key, r.data]).catch(() => [m.key, null])
          )
        );
        const map = {};
        for (const [key, d] of results) {
          if (d) {
            const openIssues = (d.issues || []).filter((i) => i.status !== "çözüldü").length;
            map[key] = {
              total: (d.issues || []).length,
              open: openIssues,
              records: (d.service_records || []).length,
              recurring: d.recurring,
            };
          }
        }
        setCounts(map);
      } catch (e) {
        toast.error("Yüklenemedi");
      }
    })();
  }, [vehicleId, nav]);

  if (!vehicle) return <div className="p-10 text-center text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      <Link to="/panel" data-testid="back-to-dashboard" className="inline-flex items-center gap-2 label-mono mb-6 hover:text-brand">
        <ArrowLeft className="h-3 w-3" /> Panele Dön
      </Link>

      {/* Vehicle header */}
      <div className="border border-border bg-card p-6 md:p-8 mb-8 flex flex-wrap items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center bg-brand text-white">
          <Truck className="h-8 w-8" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="label-mono mb-1">// araç detay</div>
          <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter">
            {vehicle.brand} {vehicle.model}
          </h1>
          <div className="font-mono text-sm text-muted-foreground mt-1">
            {vehicle.plate} · {vehicle.year} · {vehicle.km.toLocaleString("tr-TR")} km{vehicle.vin && ` · VIN ${vehicle.vin}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="brand-line" />
        <span className="label-mono">Servis Modülleri — tıklayın</span>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border">
        {MODULES.map((m) => {
          const c = counts[m.key];
          const isAi = m.key === "ai_diagnostic";
          const hasCritical = c?.recurring && c.recurring.severity === "yüksek";
          const hasWarn = c?.recurring && c.recurring.severity === "orta";
          const accentColor = hasCritical ? "text-red-500" : hasWarn ? "text-yellow-500" : "text-green-500";
          const Icon = m.icon;

          return (
            <Link
              key={m.key}
              to={isAi ? `/ai-asistan?vehicleId=${vehicleId}` : `/arac/${vehicleId}/modul/${m.key}`}
              data-testid={`module-card-${m.key}`}
              className="bg-card p-6 hover:bg-secondary transition-all group relative block"
            >
              <div className="flex items-start justify-between mb-5">
                <Icon className="h-10 w-10 text-brand" strokeWidth={1.5} />
                <span className="font-mono text-xs text-muted-foreground">// {m.code}</span>
              </div>
              <h3 className="font-heading text-xl font-bold uppercase mb-1">{m.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{m.desc}</p>

              {!isAi && c && (
                <div className="flex items-center gap-3 pt-3 border-t border-border text-xs">
                  <span className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${c.open > 0 ? "bg-red-500" : "bg-green-500"}`} />
                    <span className="font-mono">{c.open} açık</span>
                  </span>
                  <span className="font-mono text-muted-foreground">{c.records} servis</span>
                  {c.recurring && (
                    <span className={`pill ${hasCritical ? "border-red-500/50 text-red-500" : "border-yellow-500/50 text-yellow-500"} ml-auto flex items-center gap-1`}>
                      <AlertTriangle className="h-3 w-3" /> Tekrar
                    </span>
                  )}
                </div>
              )}

              {isAi && (
                <div className="flex items-center gap-2 text-xs text-brand font-bold uppercase tracking-wider pt-3 border-t border-border">
                  <Sparkles className="h-3 w-3" /> Aracı analiz et
                </div>
              )}

              <ChevronRight className={`absolute top-6 right-6 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${accentColor}`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
