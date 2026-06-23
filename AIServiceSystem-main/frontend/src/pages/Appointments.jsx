import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Plus, X } from "lucide-react";
import { api } from "../lib/api";

const STATUS_COLORS = {
  "beklemede": "border-yellow-500/50 text-yellow-500",
  "onaylandı": "border-blue-500/50 text-blue-500",
  "tamamlandı": "border-green-500/50 text-green-500",
  "iptal": "border-red-500/50 text-red-500",
};

export default function Appointments() {
  const [vehicles, setVehicles] = useState([]);
  const [appts, setAppts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", date: "", time: "", issue: "" });

  const load = async () => {
    const [v, a] = await Promise.all([api.get("/vehicles"), api.get("/appointments")]);
    setVehicles(v.data); setAppts(a.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/appointments", form);
      toast.success("Randevu talebi oluşturuldu");
      setOpen(false);
      setForm({ vehicle_id: "", date: "", time: "", issue: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  const cancel = async (id) => {
    if (!window.confirm("Randevuyu iptal etmek istediğinize emin misiniz?")) return;
    try { await api.patch(`/appointments/${id}`, { status: "iptal" }); toast.success("İptal edildi"); load(); }
    catch (e) { toast.error("İptal edilemedi"); }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
        <div>
          <div className="label-mono mb-2">// randevu yönetimi</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black uppercase tracking-tighter">Randevularım</h1>
        </div>
        <button
          data-testid="new-appointment-btn"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-brand text-white px-5 py-3 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors"
        >
          <Plus className="h-4 w-4" /> Yeni Randevu
        </button>
      </div>

      {appts.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-4 text-brand" />
          Henüz randevunuz yok. Yeni Randevu butonuna tıklayarak başlayın.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appts.map((a) => {
            const v = vehicles.find(x => x.id === a.vehicle_id);
            return (
              <div key={a.id} className="border border-border bg-card p-5 hover:border-brand transition-colors" data-testid={`appt-card-${a.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`pill ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  <span className="font-mono text-xs text-muted-foreground">{a.date} · {a.time}</span>
                </div>
                <div className="font-heading text-lg font-bold uppercase mb-1">{v ? `${v.brand} ${v.model}` : "Araç"}</div>
                <div className="font-mono text-xs text-muted-foreground mb-3">{v?.plate}</div>
                <p className="text-sm mb-4 line-clamp-3">{a.issue}</p>
                {a.notes && <div className="border-l-2 border-brand pl-3 text-xs text-muted-foreground mb-3"><span className="label-mono">Not</span><br />{a.notes}</div>}
                {(a.status === "beklemede" || a.status === "onaylandı") && (
                  <button onClick={() => cancel(a.id)} data-testid={`cancel-appt-${a.id}`} className="w-full border border-border py-2 text-xs font-bold uppercase tracking-wider hover:border-red-500 hover:text-red-500 transition-colors">
                    İptal Et
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background border border-brand max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold uppercase">Yeni Randevu</h3>
              <button onClick={() => setOpen(false)} data-testid="close-appt-modal" className="hover:text-brand"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              <div>
                <label className="label-mono block mb-2">Araç Seç</label>
                <select
                  required value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  data-testid="appt-vehicle-select"
                  className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-3 font-mono text-sm"
                >
                  <option value="">— Seçin —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>)}
                </select>
                {vehicles.length === 0 && <p className="text-xs text-red-500 mt-2">Önce müşteri panelinden araç ekleyin.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono block mb-2">Tarih</label>
                  <input
                    type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    data-testid="appt-date-input"
                    className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Saat</label>
                  <input
                    type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                    data-testid="appt-time-input"
                    className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-3 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="label-mono block mb-2">Şikayet / Arıza Tanımı</label>
                <textarea
                  required rows={4} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })}
                  data-testid="appt-issue-input"
                  placeholder="Örn: Motor uyarı lambası yanıyor, çekiş azaldı..."
                  className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-3 font-mono text-sm resize-none"
                />
              </div>
              <button
                type="submit" disabled={vehicles.length === 0}
                data-testid="appt-submit-btn"
                className="w-full bg-brand text-white py-3 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark disabled:opacity-50"
              >
                Randevu Talebi Oluştur
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
