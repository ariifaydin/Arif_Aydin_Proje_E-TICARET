import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Check, Clock, ShieldCheck, ArrowRight, AlertCircle, Sparkles, Truck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

/**
 * Slide-over panel showing detailed info about a service section.
 * On a vehicle/module CTA, it deep-links into the user's first vehicle if logged in.
 */
export default function ServiceSectionPanel({ section, onClose }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);

  // load user's vehicles for the "open module" deep-link
  useEffect(() => {
    if (user) {
      api.get("/vehicles").then((r) => setVehicles(r.data)).catch(() => {});
    }
  }, [user]);

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!section) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [section, onClose]);

  if (!section) return null;
  const Icon = section.icon;
  const firstVehicle = vehicles[0];
  const canOpenModule = user && firstVehicle && section.moduleKey && section.moduleKey !== "ai_diagnostic";

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      onClick={onClose}
      data-testid="service-section-panel"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-up" />

      {/* Panel */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative h-full w-full max-w-2xl bg-background border-l-2 border-brand overflow-y-auto"
        style={{ animation: "slideIn 280ms ease-out" }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>

        {/* Header */}
        <header className="sticky top-0 z-10 bg-background border-b border-border p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center bg-brand text-white flex-shrink-0">
              <Icon className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div>
              <div className="label-mono mb-1">// servis bölümü {section.code}</div>
              <h2 className="font-heading text-3xl font-black uppercase tracking-tighter leading-none">{section.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="service-panel-close"
            className="flex h-9 w-9 items-center justify-center border border-border hover:border-brand hover:text-brand transition-colors"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6 space-y-8">
          {/* Long description */}
          <p className="text-base text-foreground leading-relaxed">{section.long}</p>

          {/* Meta strip */}
          <div className="grid grid-cols-2 gap-px bg-border border border-border">
            <div className="bg-card p-4">
              <div className="flex items-center gap-2 label-mono mb-1"><Clock className="h-3 w-3" /> Tahmini Süre</div>
              <div className="font-heading text-lg font-bold">{section.duration}</div>
            </div>
            <div className="bg-card p-4">
              <div className="flex items-center gap-2 label-mono mb-1"><ShieldCheck className="h-3 w-3" /> Garanti</div>
              <div className="font-heading text-lg font-bold">{section.warranty}</div>
            </div>
          </div>

          {/* Scope */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="brand-line" />
              <span className="label-mono">Kapsam</span>
            </div>
            <ul className="space-y-3" data-testid="service-scope-list">
              {section.scope.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common issues */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="brand-line" />
              <span className="label-mono">Sık Karşılaşılan Sorunlar</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="service-issues-list">
              {section.commonIssues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm border-l-2 border-yellow-500/50 pl-3 py-1">
                  <AlertCircle className="h-3.5 w-3.5 text-yellow-500 mt-1 flex-shrink-0" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="pt-6 border-t border-border space-y-3">
            {canOpenModule && (
              <Link
                to={`/arac/${firstVehicle.id}/modul/${section.moduleKey}`}
                onClick={onClose}
                data-testid="cta-open-module"
                className="flex items-center justify-between gap-3 bg-brand text-white px-5 py-4 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <Truck className="h-5 w-5" />
                  <span>{firstVehicle.brand} {firstVehicle.model} için bu modülü aç</span>
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}

            {user && section.moduleKey === "ai_diagnostic" && (
              <Link
                to="/ai-asistan"
                onClick={onClose}
                data-testid="cta-open-ai"
                className="flex items-center justify-between gap-3 bg-brand text-white px-5 py-4 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors group"
              >
                <span className="flex items-center gap-3"><Sparkles className="h-5 w-5" /> AI Asistanı Aç</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}

            <Link
              to={user ? "/randevular" : "/kayit"}
              onClick={onClose}
              data-testid="cta-book-appointment"
              className={`flex items-center justify-between gap-3 px-5 py-4 font-heading font-bold uppercase tracking-wider transition-colors group ${
                canOpenModule || (user && section.moduleKey === "ai_diagnostic")
                  ? "border border-border hover:border-brand hover:text-brand"
                  : "bg-brand text-white hover:bg-brand-dark"
              }`}
            >
              <span>{user ? "Bu Hizmet için Randevu Al" : "Ücretsiz Kayıt Ol & Randevu Aç"}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {!user && (
              <Link
                to="/giris"
                onClick={onClose}
                className="block text-center text-sm text-muted-foreground hover:text-brand transition-colors"
              >
                Zaten kayıtlıyım — Giriş yap
              </Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
