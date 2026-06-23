import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Truck, Calendar, ClipboardList, Sparkles, Plus, Trash2, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const STATUS_COLORS = {
  "beklemede": "border-yellow-500/50 text-yellow-500",
  "onaylandı": "border-blue-500/50 text-blue-500",
  "tamamlandı": "border-green-500/50 text-green-500",
  "iptal": "border-red-500/50 text-red-500",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ plate: "", brand: "", model: "", year: new Date().getFullYear(), vin: "", km: 0 });

  const load = async () => {
    try {
      const [v, a, r] = await Promise.all([
        api.get("/vehicles"), api.get("/appointments"), api.get("/service-records")
      ]);
      setVehicles(v.data); setAppts(a.data); setRecords(r.data);
    } catch (e) { toast.error("Veriler yüklenemedi"); }
  };

  useEffect(() => { load(); }, []);

  const addVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", { ...form, year: Number(form.year), km: Number(form.km) });
      toast.success("Araç eklendi");
      setShowAdd(false);
      setForm({ plate: "", brand: "", model: "", year: new Date().getFullYear(), vin: "", km: 0 });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  const removeVehicle = async (id) => {
    if (!window.confirm("Aracı silmek istediğinize emin misiniz?")) return;
    try { await api.delete(`/vehicles/${id}`); toast.success("Silindi"); load(); }
    catch (e) { toast.error("Silinemedi"); }
  };

  const upcoming = appts.filter(a => a.status !== "tamamlandı" && a.status !== "iptal").slice(0, 5);
  const recentRecords = records.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      <div className="mb-10">
        <div className="label-mono mb-2">// kontrol odası</div>
        <h1 className="font-heading text-4xl sm:text-5xl font-black uppercase tracking-tighter">
          Hoş geldin, <span className="text-brand">{user?.name?.split(" ")[0]}</span>
        </h1>
      </div>

      {/* Stat blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Truck, v: vehicles.length, l: "Araç" },
          { icon: Calendar, v: appts.length, l: "Randevu" },
          { icon: ClipboardList, v: records.length, l: "Servis Kaydı" },
          { icon: Sparkles, v: upcoming.length, l: "Bekleyen" },
        ].map((s) => (
          <div key={s.l} className="stat-block">
            <div className="flex items-start justify-between">
              <s.icon className="h-6 w-6 text-brand" />
              <span className="font-heading text-4xl font-black">{s.v}</span>
            </div>
            <div className="label-mono mt-3">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Vehicles */}
        <section className="lg:col-span-2 border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <div className="label-mono">Filo</div>
              <h2 className="font-heading text-2xl font-bold uppercase">Araçlarım</h2>
            </div>
            <button
              data-testid="add-vehicle-btn"
              onClick={() => setShowAdd(!showAdd)}
              className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors"
            >
              <Plus className="h-4 w-4" /> Araç Ekle
            </button>
          </div>

          {showAdd && (
            <form onSubmit={addVehicle} className="p-5 border-b border-border grid grid-cols-2 md:grid-cols-3 gap-3 bg-background">
              {[
                ["plate", "Plaka", "text"], ["brand", "Marka", "text"], ["model", "Model", "text"],
                ["year", "Yıl", "number"], ["vin", "Şasi (VIN)", "text"], ["km", "Kilometre", "number"],
              ].map(([k, label, type]) => (
                <input
                  key={k} type={type}
                  required={k !== "vin"}
                  value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  data-testid={`vehicle-${k}-input`}
                  placeholder={label}
                  className="bg-card border border-border focus:border-brand outline-none px-3 py-2 font-mono text-xs"
                />
              ))}
              <button type="submit" data-testid="vehicle-save-btn" className="col-span-2 md:col-span-3 bg-brand text-white py-2 text-xs font-bold uppercase tracking-wider hover:bg-brand-dark">
                Kaydet
              </button>
            </form>
          )}

          {vehicles.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Henüz aracınız yok. &quot;Araç Ekle&quot; ile başlayın.</div>
          ) : (
            <div className="divide-y divide-border">
              {vehicles.map((v) => (
                <div key={v.id} className="p-5 hover:bg-secondary/50 transition-colors flex items-center justify-between gap-4" data-testid={`vehicle-row-${v.id}`}>
                  <Link to={`/arac/${v.id}`} data-testid={`vehicle-open-${v.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                    <div className="flex h-12 w-12 items-center justify-center border border-brand text-brand group-hover:bg-brand group-hover:text-white transition-colors"><Truck className="h-6 w-6" /></div>
                    <div className="min-w-0">
                      <div className="font-heading text-lg font-bold uppercase truncate group-hover:text-brand transition-colors">{v.brand} {v.model}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {v.plate} · {v.year} · {v.km.toLocaleString("tr-TR")} km
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/arac/${v.id}`}
                      data-testid={`open-modules-${v.id}`}
                      className="inline-flex items-center gap-1 border border-brand text-brand px-3 py-2 text-xs font-bold uppercase hover:bg-brand hover:text-white transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Modüller <ChevronRight className="h-3 w-3" />
                    </Link>
                    <button onClick={() => removeVehicle(v.id)} data-testid={`del-vehicle-${v.id}`} className="border border-border p-2 hover:border-red-500 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming appointments */}
        <section className="border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <div className="label-mono">Yaklaşan</div>
              <h2 className="font-heading text-2xl font-bold uppercase">Randevular</h2>
            </div>
            <Link to="/randevular" data-testid="goto-appts" className="text-xs font-bold uppercase tracking-wider text-brand hover:underline">Tümü →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Bekleyen randevu yok.</div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((a) => {
                const v = vehicles.find(x => x.id === a.vehicle_id);
                return (
                  <li key={a.id} className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading text-base font-bold uppercase">{v ? `${v.brand} ${v.model}` : "Araç"}</span>
                      <span className={`pill ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{a.date} · {a.time}</div>
                    <div className="text-sm mt-2 line-clamp-2">{a.issue}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Recent records */}
      <section className="border border-border bg-card mt-6">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="label-mono">Son Servisler</div>
            <h2 className="font-heading text-2xl font-bold uppercase">Servis Kayıtları</h2>
          </div>
          <Link to="/servis-gecmisi" className="text-xs font-bold uppercase tracking-wider text-brand hover:underline">Tümü →</Link>
        </div>
        {recentRecords.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Henüz servis kaydınız yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  {["Tarih", "Araç", "Onarım", "Teknisyen", "Maliyet"].map((h) => (
                    <th key={h} className="label-mono text-left p-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRecords.map((r) => {
                  const v = vehicles.find(x => x.id === r.vehicle_id);
                  return (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="p-4 font-mono text-xs">{r.date}</td>
                      <td className="p-4">{v ? `${v.brand} ${v.model}` : "—"}</td>
                      <td className="p-4 max-w-md">{r.repairs}</td>
                      <td className="p-4">{r.technician_name}</td>
                      <td className="p-4 font-mono font-bold text-brand">{r.cost.toLocaleString("tr-TR")} ₺</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
