import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Sparkles, Loader2, Plus, X, Wrench, Clock, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { MODULE_MAP, SEVERITY_COLORS, STATUS_COLORS } from "../lib/modules";

const SEVERITIES = ["düşük", "orta", "yüksek", "kritik"];
const STATUSES = ["açık", "devam ediyor", "çözüldü"];

export default function ModuleDetail() {
  const { vehicleId, moduleKey } = useParams();
  const mod = MODULE_MAP[moduleKey];
  const [data, setData] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [issueModal, setIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ description: "", severity: "orta", status: "açık", date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    try {
      const { data: d } = await api.get(`/vehicles/${vehicleId}/modules/${moduleKey}`);
      setData(d);
    } catch (e) { toast.error("Modül verisi yüklenemedi"); }
  };

  useEffect(() => { setData(null); load(); /* eslint-disable-next-line */ }, [vehicleId, moduleKey]);

  const askAI = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiText("");
    try {
      const { data: r } = await api.post(`/ai/module-analyze/${vehicleId}/${moduleKey}`);
      setAiText(r.analysis);
    } catch (e) {
      setAiText("⚠️ " + (e?.response?.data?.detail || "AI analizi başarısız"));
    } finally { setAiLoading(false); }
  };

  const submitIssue = async (e) => {
    e.preventDefault();
    try {
      await api.post("/issues", { ...issueForm, vehicle_id: vehicleId, module: moduleKey });
      toast.success("Sorun eklendi");
      setIssueModal(false);
      setIssueForm({ description: "", severity: "orta", status: "açık", date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Hata"); }
  };

  const updateIssueStatus = async (id, status) => {
    try { await api.patch(`/issues/${id}`, { status }); toast.success("Durum güncellendi"); load(); }
    catch (e) { toast.error("Hata"); }
  };

  if (!mod) return <div className="p-10 text-center">Modül bulunamadı</div>;
  if (!data) return <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Yükleniyor...</div>;

  const Icon = mod.icon;
  const v = data.vehicle;

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      <Link to={`/arac/${vehicleId}`} data-testid="back-to-vehicle" className="inline-flex items-center gap-2 label-mono mb-6 hover:text-brand">
        <ArrowLeft className="h-3 w-3" /> Modüllere Dön
      </Link>

      {/* Module header */}
      <div className="flex flex-wrap items-center gap-6 mb-8">
        <div className="flex h-16 w-16 items-center justify-center bg-brand text-white">
          <Icon className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="label-mono mb-1">// {v.brand} {v.model} · {v.plate}</div>
          <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter">{mod.label}</h1>
        </div>
        <button
          onClick={askAI}
          data-testid="module-ask-ai-btn"
          className="inline-flex items-center gap-2 bg-brand text-white px-5 py-3 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors"
        >
          <Sparkles className="h-4 w-4" /> AI ile Analiz Et
        </button>
      </div>

      {/* Recurring banner */}
      {data.recurring && (
        <div className={`border-2 ${data.recurring.severity === "yüksek" ? "border-red-500/60 bg-red-500/5" : "border-yellow-500/60 bg-yellow-500/5"} p-4 mb-6 flex items-center gap-3`} data-testid="recurring-banner">
          <AlertTriangle className={`h-6 w-6 ${data.recurring.severity === "yüksek" ? "text-red-500" : "text-yellow-500"}`} />
          <div>
            <div className="font-heading font-bold uppercase text-sm">Tekrarlayan Arıza Uyarısı</div>
            <div className="text-sm text-muted-foreground">{data.recurring.message}</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Issues */}
        <section className="border border-border bg-card">
          <header className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <div className="label-mono">Sorunlar</div>
              <h2 className="font-heading text-xl font-bold uppercase">Açık & Geçmiş Sorunlar</h2>
            </div>
            <button onClick={() => setIssueModal(true)} data-testid="new-issue-btn" className="inline-flex items-center gap-1 bg-brand text-white px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-brand-dark">
              <Plus className="h-3 w-3" /> Sorun Ekle
            </button>
          </header>
          {data.issues.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-3" />
              Bu sistem için kayıtlı sorun yok.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.issues.map((i) => (
                <li key={i.id} className="p-5" data-testid={`issue-${i.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`pill ${SEVERITY_COLORS[i.severity]}`}>{i.severity}</span>
                      <span className={`pill ${STATUS_COLORS[i.status]}`}>{i.status}</span>
                      <span className="font-mono text-xs text-muted-foreground">{i.date}</span>
                    </div>
                    <select
                      value={i.status}
                      onChange={(e) => updateIssueStatus(i.id, e.target.value)}
                      data-testid={`issue-status-${i.id}`}
                      className="bg-background border border-border focus:border-brand outline-none px-2 py-1 font-mono text-[10px] uppercase"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <p className="text-sm">{i.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Repair History */}
        <section className="border border-border bg-card">
          <header className="p-5 border-b border-border">
            <div className="label-mono">Onarım Geçmişi</div>
            <h2 className="font-heading text-xl font-bold uppercase">Tamamlanan Servisler</h2>
          </header>
          {data.service_records.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Wrench className="h-8 w-8 text-brand mx-auto mb-3 opacity-50" />
              Bu sistem için onarım kaydı yok.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.service_records.map((r) => (
                <li key={r.id} className="p-5 space-y-2" data-testid={`repair-${r.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{r.date} · {r.mileage?.toLocaleString("tr-TR")} km</span>
                    <span className="font-mono font-bold text-brand">{r.cost.toLocaleString("tr-TR")} ₺</span>
                  </div>
                  <div className="font-bold text-sm">{r.repairs}</div>
                  {(r.parts_replaced || []).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="label-mono mr-2">Parça:</span>
                      {r.parts_replaced.join(" · ")}
                    </div>
                  )}
                  {r.technician_notes && (
                    <div className="text-xs border-l-2 border-brand pl-2 text-muted-foreground">
                      <span className="label-mono">Not</span><br />{r.technician_notes}
                    </div>
                  )}
                  <div className="label-mono">Teknisyen: {r.technician_name}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Periodic maintenance schedule */}
      {moduleKey === "periodic" && data.maintenance_tasks && data.maintenance_tasks.length > 0 && (
        <section className="border border-border bg-card mt-6" data-testid="maintenance-schedule">
          <header className="p-5 border-b border-border">
            <div className="label-mono">Bakım Takvimi</div>
            <h2 className="font-heading text-xl font-bold uppercase">Planlı Bakım & Yaklaşan Uyarılar</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>{["Görev", "Aralık (km)", "Son Yapım", "Sonraki", "Kalan", "Durum"].map(h => <th key={h} className="label-mono text-left p-4 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.maintenance_tasks.map((m) => {
                  const color = m.status === "gecikmiş" ? "text-red-500" : m.status === "yaklaşıyor" ? "text-yellow-500" : "text-green-500";
                  return (
                    <tr key={m.id}>
                      <td className="p-4 font-bold">{m.task_name}</td>
                      <td className="p-4 font-mono text-xs">{m.interval_km.toLocaleString("tr-TR")}</td>
                      <td className="p-4 font-mono text-xs">{m.last_done_date || "—"}</td>
                      <td className="p-4 font-mono text-xs">{m.next_due_km.toLocaleString("tr-TR")} km</td>
                      <td className={`p-4 font-mono text-xs font-bold ${color}`}>{m.remaining_km >= 0 ? `+${m.remaining_km.toLocaleString("tr-TR")}` : m.remaining_km.toLocaleString("tr-TR")}</td>
                      <td className="p-4"><span className={`pill ${m.status === "gecikmiş" ? "border-red-500/50 text-red-500" : m.status === "yaklaşıyor" ? "border-yellow-500/50 text-yellow-500" : "border-green-500/50 text-green-500"}`}><Clock className="h-3 w-3 inline mr-1" />{m.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* AI panel */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !aiLoading && setAiOpen(false)}>
          <div className="bg-background border-2 border-brand max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-brand" />
                <div>
                  <div className="label-mono">// modül analizi</div>
                  <h3 className="font-heading text-xl font-bold uppercase">{mod.label} — AI Tanı</h3>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} data-testid="ai-modal-close" className="label-mono hover:text-brand">Kapat ×</button>
            </div>
            <div className="p-6">
              {aiLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> {mod.label} verileri analiz ediliyor...
                </div>
              ) : (
                <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">{aiText}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New issue modal */}
      {issueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIssueModal(false)}>
          <div className="bg-background border border-brand max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold uppercase">Yeni Sorun — {mod.label}</h3>
              <button onClick={() => setIssueModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitIssue} className="p-6 space-y-4">
              <div>
                <label className="label-mono block mb-2">Tarih</label>
                <input type="date" required value={issueForm.date} onChange={(e) => setIssueForm({ ...issueForm, date: e.target.value })} data-testid="issue-date-input" className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-2 font-mono text-sm" />
              </div>
              <div>
                <label className="label-mono block mb-2">Açıklama</label>
                <textarea required rows={3} value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} data-testid="issue-desc-input" placeholder="Örn: Yük altında çekiş kaybı, gösterge ışığı yanıyor..." className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-2 font-mono text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono block mb-2">Şiddet</label>
                  <select value={issueForm.severity} onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value })} data-testid="issue-sev-select" className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-2 font-mono text-sm">
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-mono block mb-2">Durum</label>
                  <select value={issueForm.status} onChange={(e) => setIssueForm({ ...issueForm, status: e.target.value })} data-testid="issue-status-select" className="w-full bg-card border border-border focus:border-brand outline-none px-3 py-2 font-mono text-sm">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" data-testid="issue-submit-btn" className="w-full bg-brand text-white py-3 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark">
                Sorun Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
