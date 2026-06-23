import React from "react";
import { Truck, Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-24">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center bg-brand text-white">
              <Truck className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-lg font-black">TRUCK SERVİS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Türkiye&apos;nin önde gelen ağır vasıta ve ticari araç servisi. 25 yılı aşkın deneyim.
          </p>
        </div>
        <div>
          <h4 className="label-mono mb-4">Hizmetler</h4>
          <ul className="space-y-2 text-sm">
            <li>Motor & Turbo Onarımı</li>
            <li>Şanzıman Revizyonu</li>
            <li>Fren Sistemleri</li>
            <li>Elektrik & Elektronik</li>
            <li>Periyodik Bakım</li>
          </ul>
        </div>
        <div>
          <h4 className="label-mono mb-4">Şirket</h4>
          <ul className="space-y-2 text-sm">
            <li>Hakkımızda</li>
            <li>Müşteri Portalı</li>
            <li>AI Diagnostik</li>
            <li>İletişim</li>
          </ul>
        </div>
        <div>
          <h4 className="label-mono mb-4">İletişim</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand"/>+90 850 222 1453</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand"/>servis@truckservis.com</li>
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-brand mt-0.5"/>OSB 4. Cad. No:14, Tuzla / İstanbul</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center label-mono">
        © {new Date().getFullYear()} TRUCK SERVİS — Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
