// Module catalog — Turkish labels + icons + descriptions
import { Cog, Wind, Settings, ShieldCheck, Zap, Wrench, Bot } from "lucide-react";

export const MODULES = [
  { key: "engine", label: "Motor Sistemi", icon: Cog, code: "01",
    desc: "Rölanti, yağ basıncı, enjektör, segman ve genel motor durumu." },
  { key: "turbo", label: "Turbo Sistemi", icon: Wind, code: "02",
    desc: "Boost basıncı, intercooler, waste-gate ve turbo kartuşu." },
  { key: "transmission", label: "Şanzıman Sistemi", icon: Settings, code: "03",
    desc: "Vites geçişleri, debriyaj, senkromeç ve şanzıman yağı." },
  { key: "brake", label: "Fren Sistemi", icon: ShieldCheck, code: "04",
    desc: "ABS/EBS, balata, disk, hava sistemleri ve hortumlar." },
  { key: "electrical", label: "Elektrik Diagnostiği", icon: Zap, code: "05",
    desc: "Akü, alternatör, ECU hata kodları, kablo demeti." },
  { key: "periodic", label: "Periyodik Bakım", icon: Wrench, code: "06",
    desc: "Yağ-filtre, fren kontrolü, planlı bakım takvimi." },
  { key: "ai_diagnostic", label: "AI Diagnostik Asistanı", icon: Bot, code: "07",
    desc: "Tüm sistemler için yapay zeka destekli analiz ve tavsiye." },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.key, m]));

export const SEVERITY_COLORS = {
  "düşük": "bg-green-500/15 text-green-500 border-green-500/40",
  "orta": "bg-yellow-500/15 text-yellow-500 border-yellow-500/40",
  "yüksek": "bg-orange-500/15 text-orange-500 border-orange-500/40",
  "kritik": "bg-red-500/15 text-red-500 border-red-500/40",
};

export const STATUS_COLORS = {
  "açık": "bg-red-500/15 text-red-500 border-red-500/40",
  "devam ediyor": "bg-yellow-500/15 text-yellow-500 border-yellow-500/40",
  "çözüldü": "bg-green-500/15 text-green-500 border-green-500/40",
};
