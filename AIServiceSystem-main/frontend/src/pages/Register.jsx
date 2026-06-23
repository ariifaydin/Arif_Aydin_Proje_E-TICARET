import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Truck, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Register() {
  const { register, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Şifre en az 6 karakter olmalı"); return; }
    try {
      await register(form);
      toast.success("Kayıt başarılı! Müşteri paneline yönlendiriliyorsunuz...");
      nav("/panel", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Kayıt başarısız");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 md:px-8 py-16">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center bg-brand text-white"><Truck className="h-5 w-5" /></div>
        <span className="label-mono">Yeni Hesap Oluştur</span>
      </div>
      <h1 className="font-heading text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-2">Aramıza Katıl</h1>
      <p className="text-sm text-muted-foreground mb-8">Zaten kayıtlıysan <Link to="/giris" className="text-brand font-bold underline">giriş yap</Link>.</p>

      <form onSubmit={submit} className="space-y-5">
        {[
          { k: "name", label: "Ad Soyad / Firma", type: "text", placeholder: "Ahmet Yılmaz", testid: "reg-name" },
          { k: "email", label: "E-posta", type: "email", placeholder: "ornek@firma.com", testid: "reg-email" },
          { k: "phone", label: "Telefon", type: "tel", placeholder: "+90 5XX XXX XX XX", testid: "reg-phone" },
          { k: "password", label: "Şifre (min 6 karakter)", type: "password", placeholder: "••••••••", testid: "reg-password" },
        ].map((f) => (
          <div key={f.k}>
            <label className="label-mono block mb-2">{f.label}</label>
            <input
              type={f.type} required={f.k !== "phone"} value={form[f.k]} onChange={update(f.k)}
              data-testid={`${f.testid}-input`}
              className="w-full bg-card border border-border focus:border-brand outline-none px-4 py-3 font-mono text-sm"
              placeholder={f.placeholder}
            />
          </div>
        ))}
        <button
          type="submit" disabled={loading}
          data-testid="register-submit-btn"
          className="w-full bg-brand text-white py-4 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading ? "Kayıt yapılıyor..." : (<>Hesabı Oluştur <ArrowRight className="h-4 w-4" /></>)}
        </button>
      </form>
    </div>
  );
}
