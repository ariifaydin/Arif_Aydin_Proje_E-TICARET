import React from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export default function Contact() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-3"><span className="brand-line" /><span className="label-mono">İletişim</span></div>
      <h1 className="font-heading text-5xl sm:text-6xl font-black uppercase tracking-tighter mb-12">Bize Ulaşın</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {[
          { icon: Phone, title: "Telefon", lines: ["+90 850 222 1453", "+90 532 444 0000 (Yol Yardım)"] },
          { icon: Mail, title: "E-posta", lines: ["servis@truckservis.com", "destek@truckservis.com"] },
          { icon: MapPin, title: "Adres", lines: ["Tuzla OSB 4. Cad. No: 14", "34953 Tuzla / İstanbul"] },
          { icon: Clock, title: "Çalışma Saatleri", lines: ["Hafta içi: 08:00 — 19:00", "Cumartesi: 09:00 — 17:00"] },
        ].map((c, i) => (
          <div key={c.title} className="border border-border bg-card p-8 hover:border-brand transition-colors" data-testid={`contact-card-${i}`}>
            <c.icon className="h-8 w-8 text-brand mb-4" strokeWidth={1.5} />
            <div className="font-heading text-xl font-bold uppercase mb-3">{c.title}</div>
            {c.lines.map((l) => <div key={l} className="text-sm text-muted-foreground">{l}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
