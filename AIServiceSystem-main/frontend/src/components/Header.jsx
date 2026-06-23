import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, ShoppingBag, Heart, Percent } from "lucide-react";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { to: "/", label: "Süper Fiyat, Süper Teklif", icon: <Percent className="h-4 w-4 text-[#FF6000]" /> },
  { to: "/siparislerim", label: "Siparişlerim", icon: <ShoppingBag className="h-4 w-4" /> },
  { to: "/beğendiklerim", label: "Beğendiklerim", icon: <Heart className="h-4 w-4" /> },
];

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { 
    logout(); 
    nav("/"); 
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E2E2] bg-white shadow-sm font-sans">
      
      {/* Üst İnce Hepsiburada Yardımcı Menüsü */}
      <div className="hidden lg:block bg-[#F4F4F6] border-b border-[#E2E2E2] py-1.5 px-8">
        <div className="mx-auto flex max-w-[1400px] justify-end gap-6 text-[11px] font-medium text-[#666666]">
          <Link to="/" className="hover:text-[#FF6000]">Kampanyalar</Link>
          <Link to="/" className="hover:text-[#FF6000]">Hepsiburada Premium</Link>
          <Link to="/" className="hover:text-[#FF6000]">Hepsiburada'da Satıcı Ol</Link>
          <Link to="/" className="hover:text-[#FF6000]">Müşteri Hizmetleri</Link>
        </div>
      </div>

      {/* Ana E-Ticaret Header Alanı */}
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 md:px-8 h-20 gap-4">
        
        {/* Hepsiburada Logosu */}
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-3xl font-black tracking-tight text-[#FF6000] lowercase">
            hepsiburada<span className="text-[#999999] text-[10px] font-bold tracking-wider uppercase ml-1 block lg:inline">Premium</span>
          </span>
        </Link>

        {/* Canlı Linkler Menüsü */}
        <nav className="hidden lg:flex items-center gap-4 mx-4">
          {NAV_ITEMS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-[#484848] hover:text-[#FF6000] transition-colors"
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Sağ Taraf: Profil ve Giriş İşlemleri */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#333333] bg-[#F4F4F6] px-3 py-2 rounded-md">
                <User className="h-4 w-4 text-[#FF6000]" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 border border-[#E2E2E2] px-3 py-2 rounded-md text-xs font-bold text-[#666666] hover:border-[#FF6000] hover:text-[#FF6000] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Çıkış
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/giris"
                className="flex items-center gap-2 border border-[#CCCCCC] bg-white text-[#333333] px-5 py-2.5 rounded-md text-xs font-extrabold hover:border-[#FF6000] hover:text-[#FF6000] transition-colors shadow-sm"
              >
                <User className="h-4 w-4 text-[#FF6000]" />
                Giriş Yap / Üye Ol
              </Link>
            </div>
          )}
        </div>

        {/* Mobil Menü Butonu */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center border border-[#E2E2E2] rounded-md text-[#333333]"
          aria-label="Menü"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobil Açılır Menü Düzeni */}
      {open && (
        <div className="lg:hidden border-t border-[#E2E2E2] bg-white shadow-inner animate-fade-in">
          <div className="px-4 py-4 flex flex-col gap-3">
            {NAV_ITEMS.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2.5 px-3 text-sm font-bold text-[#484848] border-b border-[#F4F4F6]"
              >
                {it.icon}
                {it.label}
              </NavLink>
            ))}
            <div className="pt-2">
              {user ? (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#333333] px-3">Hesabım: {user.name}</span>
                  <button onClick={handleLogout} className="w-full border border-[#E2E2E2] text-[#FF6000] font-bold py-2.5 rounded-md text-sm text-center">
                    Çıkış Yap
                  </button>
                </div>
              ) : (
                <Link to="/giris" onClick={() => setOpen(false)} className="block w-full bg-[#FF6000] text-white font-bold py-2.5 rounded-md text-sm text-center shadow-md">
                  Giriş Yap / Üye Ol
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}