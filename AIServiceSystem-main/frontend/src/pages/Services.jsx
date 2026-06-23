import React, { useState } from "react";
import ServiceSectionPanel from "../components/ServiceSectionPanel";
import { SERVICES_FULL } from "../lib/serviceSections";
import { ChevronRight } from "lucide-react";

export default function Services() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-3"><span className="brand-line" /><span className="label-mono">Hizmet Kataloğu</span></div>
      <h1 className="font-heading text-5xl sm:text-6xl font-black uppercase tracking-tighter mb-6">Tüm Hizmetler</h1>
      <p className="text-muted-foreground max-w-2xl mb-12">
        Atölye kapasitesi, orijinal parça stoğu ve sertifikalı teknisyen kadrosu ile aşağıdaki tüm hizmetleri tek noktada sunuyoruz. Detayları görmek için bir karta tıklayın.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        {SERVICES_FULL.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSelected(s)}
            data-testid={`services-item-${i}`}
            className="bg-card p-8 hover:bg-secondary transition-colors group text-left focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset"
          >
            <div className="flex items-start justify-between mb-6">
              <s.icon className="h-10 w-10 text-brand" strokeWidth={1.5} />
              <span className="font-mono text-xs text-muted-foreground">// {s.code}</span>
            </div>
            <h3 className="font-heading text-2xl font-bold uppercase mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.short}</p>
            <div className="mt-6 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              Detay <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>

      <ServiceSectionPanel section={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
