import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Truck, Calendar, ClipboardList, Plus, X, CheckCircle, Clock, Lock, ShoppingBag, Trash2 } from "lucide-react";
import { api } from "../lib/api";

const STATUS_COLORS = {
  "beklemede": "border-yellow-500/50 text-yellow-500",
  "onaylandı": "border-blue-500/50 text-blue-500",
  "tamamlandı": "border-green-500/50 text-green-500",
  "iptal": "border-red-500/50 text-red-500",
};
const STATUS_OPTIONS = ["beklemede", "onaylandı", "tamamlandı", "iptal"];

export default function Admin() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false); 
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]); 
  const [vehicles, setVehicles] = useState([]);
  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]); 

  const load = async () => {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    fetch("http://localhost:8001/api/products")
      .then(res => res.json())
      .then(p => {
        if (Array.isArray(p)) setProducts(p);
        else if (p && Array.isArray(p.products)) setProducts(p.products);
        else setProducts([]);
      })
      .catch(err => console.error("Ürünler yüklenirken hata:", err));

    fetch("http://localhost:8001/api/admin/customers", { headers })
      .then(res => {
        if (!res.ok) throw new Error("Rota veya yetki hatası");
        return res.json();
      })
      .then(data => {
        let customerList = [];
        if (Array.isArray(data)) {
          customerList = data;
        } else if (data && Array.isArray(data.customers)) {
          customerList = data.customers;
        } else if (data && typeof data === 'object') {
          const possibleArray = Object.values(data).find(val => Array.isArray(val));
          if (possibleArray) customerList = possibleArray;
        }
        setCustomers(customerList.filter(u => u.role !== "admin"));
      })
      .catch(err => console.error("Müşteri çekme hatası:", err));

    fetch("http://localhost:8001/api/admin/stats", { headers }).then(res => res.json()).then(d => setStats(d)).catch(() => {});
    
    fetch("http://localhost:8001/api/vehicles", { headers })
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) setVehicles(d);
        else if (d && Array.isArray(d.data)) setVehicles(d.data);
        else setVehicles([]);
      })
      .catch(() => setVehicles([]));

    fetch("http://localhost:8001/api/appointments", { headers })
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) setAppts(d);
        else if (d && Array.isArray(d.data)) setAppts(d.data);
        else setAppts([]);
      })
      .catch(() => setAppts([]));

    fetch("http://localhost:8001/api/service-records", { headers })
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) setRecords(d);
        else if (d && Array.isArray(d.data)) setRecords(d.data);
        else setRecords([]);
      })
      .catch(() => setRecords([]));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    
    if (token && userString) {
      const user = JSON.parse(userString);
      if (user.role === "admin") {
        setIsAdminLoggedIn(true);
        load();
      }
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || "Giriş başarısız.");
      if (data.user.role !== "admin") throw new Error("Bu panele erişim yetkiniz bulunmamaktadır!");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setIsAdminLoggedIn(true);
      toast.success("Yönetim paneline giriş yapıldı.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ÜRÜN SİLME - ALTERNATİF BACKEND KAPILARINI TARAYAN AKILLI YAPI
  const handleDeleteProduct = async (productId) => {
    if (!productId) return;
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    const urls = [
      `http://localhost:8001/api/products/${productId}`,
      `http://localhost:8001/api/admin/products/${productId}`,
      `http://localhost:8001/products/${productId}`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: "DELETE" });
        if (response.ok) {
          toast.success("Ürün başarıyla silindi.");
          load();
          return;
        }
      } catch (e) {}
    }
    toast.error("Ürün backend tarafında silinemedi. Lütfen backend rotalarını kontrol edin.");
  };

  // MÜŞTERİ SİLME - ESKİ PROJE KALINTILARINI VE YENİ KAPILARI TARAYAN SİSTEM
  const handleDeleteCustomer = async (customerId) => {
    if (!customerId) return;
    if (!window.confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;

    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    // Backend'de olması kesin muhtemel olan tüm yolların listesi
    const urls = [
      `http://localhost:8001/api/admin/customers/${customerId}`,
      `http://localhost:8001/api/customers/${customerId}`,
      `http://localhost:8001/api/users/${customerId}`,
      `http://localhost:8001/api/admin/users/${customerId}`,
      `http://localhost:8001/customers/${customerId}`
    ];

    // Sırayla hepsine vuruyoruz, hangisi 200 dönerse işlem bitiyor
    for (const url of urls) {
      try {
        const response = await fetch(url, { method: "DELETE", headers });
        if (response.ok) {
          toast.success("Müşteri başarıyla silindi.");
          load();
          return;
        }
      } catch (e) {}
    }

    toast.error("Müşteri silme isteği backend tarafından reddedildi.");
  };

  const updateApptStatus = async (id, status) => {
    try { await api.patch(`/appointments/${id}`, { status }); toast.success("Durum güncellendi"); load(); }
    catch (e) { toast.error("Hata"); }
  };

  const TABS = [
    { k: "dashboard", l: "Özet" },
    { k: "products", l: "📦 Ürün Yönetimi" }, 
    { k: "customers", l: "Müşteriler" },
    { k: "vehicles", l: "🛍️ Siparişler" },
    { k: "appointments", l: "🚚 Kargo Takibi" },
    { k: "records", l: "💳 Faturalar & Ödemeler" },
  ];

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F4F4F6] flex items-center justify-center font-sans antialiased p-4">
        <div className="bg-white border border-[#E2E2E2] p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FF6000]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-[#FF6000] h-8 w-8" />
          </div>
          <h2 className="text-[#FF6000] text-3xl font-black lowercase tracking-tight">
            hepsiburada<span className="text-[#333333] font-bold text-lg ml-1">Yönetim</span>
          </h2>
          <p className="text-sm text-[#666666] mt-1 mb-6">Lütfen yönetici bilgileriyle giriş yapın.</p>

          <form onSubmit={handleAdminLogin} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#666666] uppercase mb-1">Yönetici E-Posta</label>
              <input
                type="email" required value={loginEmail} placeholder="admin@truckservis.com"
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#F4F4F6] border border-[#E2E2E2] rounded-md px-4 py-2.5 text-sm text-[#000000] outline-none focus:border-[#FF6000]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#666666] uppercase mb-1">Şifre</label>
              <input
                type="password" required value={loginPassword} placeholder="••••••••"
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-[#F4F4F6] border border-[#E2E2E2] rounded-md px-4 py-2.5 text-sm text-[#000000] outline-none focus:border-[#FF6000]"
              />
            </div>
            <button type="submit" className="w-full bg-[#FF6000] hover:bg-[#e05500] text-white font-bold py-3 rounded-md text-sm transition-colors shadow-sm mt-2">
              Yönetim Paneline Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10 text-black">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">// admin kontrol paneli</div>
        <button 
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 'bold', fontSize: '12px', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
        >
          Güvenli Çıkış Yap
        </button>
      </div>
      
      <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-8 text-black">Yönetim Paneli</h1>

      <div className="flex flex-wrap gap-1 mb-8 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-3 font-bold uppercase tracking-wider text-sm border-b-2 transition-colors ${
              tab === t.k ? "border-[#FF6000] text-[#FF6000]" : "border-transparent text-gray-600 hover:text-[#FF6000]"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* PRODUCTS TAB */}
      {tab === "products" && (
        <div className="border border-gray-200 bg-white rounded-lg shadow-sm overflow-x-auto p-4">
          <h3 className="text-lg font-bold mb-4 text-[#333333]">Aktif Satıştaki Ürünler ({products.length})</h3>
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F4F4F6] text-gray-700">
              <tr>
                <th className="p-4 font-bold">Ürün Başlığı</th>
                <th className="p-4 font-bold">Marka</th>
                <th className="p-4 font-bold">Kategori</th>
                <th className="p-4 font-bold">Fiyat</th>
                <th className="p-4 font-bold text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500">Mağazada ürün bulunmamaktadır.</td></tr>
              ) : (
                products.map((p, index) => {
                  const ecommerceCategories = ["Elektronik", "Moda & Giyim", "Ev & Yaşam", "Oto Aksesuar"];
                  const displayCat = ecommerceCategories[index % ecommerceCategories.length];
                  const productId = p.product_id || p._id || p.id;
                  
                  return (
                    <tr key={productId || index} className="hover:bg-gray-50 text-black">
                      <td className="p-4 font-semibold">{p.title}</td>
                      <td className="p-4 font-mono text-xs uppercase text-gray-600">{p.brand}</td>
                      <td className="p-4"><span className="bg-orange-50 text-[#FF6000] px-2 py-1 rounded text-xs font-bold uppercase">{displayCat}</span></td>
                      <td className="p-4 font-bold text-[#FF6000]">{p.price?.toLocaleString('tr-TR')} TL</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleDeleteProduct(productId ? String(productId) : undefined)} 
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer border-none flex items-center gap-1 mx-auto"
                        >
                          <Trash2 size={13} /> Sil
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {tab === "customers" && (
        <div className="border border-gray-200 bg-white overflow-x-auto rounded-lg shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-bold text-gray-700">Müşteri Adı</th>
                <th className="p-4 font-bold text-gray-700">Kayıtlı E-posta</th>
                <th className="p-4 font-bold text-gray-700">Rol / Yetki</th>
                <th className="p-4 font-bold text-gray-700 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr><td colSpan="4" className="p-4 text-center text-gray-500">Kayıtlı müşteri bulunmamaktadır.</td></tr>
              ) : (
                customers.map((c, index) => {
                  const customerId = c.customer_id || c.user_id || c._id || c.id;
                  
                  return (
                    <tr key={customerId || index} className="hover:bg-gray-50 text-black">
                      <td className="p-4 font-bold">{c.name}</td>
                      <td className="p-4 font-mono text-xs">{c.email}</td>
                      <td className="p-4"><span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs font-bold uppercase">{c.role || "Müşteri"}</span></td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleDeleteCustomer(customerId ? String(customerId) : undefined)} 
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer border-none flex items-center gap-1 mx-auto"
                        >
                          <Trash2 size={13} /> Sil
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SIPARISLER */}
      {tab === "vehicles" && (
        <div className="border border-gray-200 bg-white overflow-x-auto rounded-lg shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{["Sipariş No", "Ürün Grubu", "Adet", "Durum", "Müşteri"].map(h => <th key={h} className="text-left p-4 font-bold text-gray-700">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.map((v, i) => (
                <tr key={v.id || i} className="hover:bg-gray-50">
                  <td className="p-4 font-mono font-bold text-gray-900">#SP-{1000 + i}</td>
                  <td className="p-4">{v.brand} Satışı</td>
                  <td className="p-4 font-mono text-xs">1 Adet</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold">Hazırlanıyor</span></td>
                  <td className="p-4 text-xs font-semibold">
                    {customers.find(c => String(c.customer_id || c._id || c.id) === String(v.customer_id))?.name || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KARGO TAKIBI */}
      {tab === "appointments" && (
        <div className="border border-gray-200 bg-white overflow-x-auto rounded-lg shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{["Gönderim Tarihi", "Alıcı Müşteri", "Kargo Firması", "Teslimat Tipi", "Kargo Durumu", "İşlem"].map(h => <th key={h} className="text-left p-4 font-bold text-gray-700">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appts.map((a, i) => {
                const c = customers.find(x => String(x.customer_id || x._id || x.id) === String(a.customer_id));
                return (
                  <tr key={a.id || i} className="hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs whitespace-nowrap text-gray-600">{a.date}</td>
                    <td className="p-4 text-xs font-semibold">{c?.name || "—"}</td>
                    <td className="p-4 text-xs">Hepsijet Kargo</td>
                    <td className="p-4 text-xs">Adrese Teslim</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold border ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                    <td className="p-4">
                      <select value={a.status} onChange={(e) => updateApptStatus(a.id, e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1 font-mono text-xs outline-none focus:border-[#FF6000]">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FATURALAR & ODEMELER */}
      {tab === "records" && (
        <div className="border border-gray-200 bg-white overflow-x-auto rounded-lg shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{["Fatura Tarihi", "Müşteri", "İşlem Tipi", "Ödeme Yöntemi", "Fatura Tutarı"].map(h => <th key={h} className="text-left p-4 font-bold text-gray-700">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((r, i) => {
                const c = customers.find(x => String(x.customer_id || x._id || x.id) === String(r.customer_id));
                return (
                  <tr key={r.id || i} className="hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs text-gray-600">{r.date}</td>
                    <td className="p-4 text-xs font-semibold">{c?.name || "—"}</td>
                    <td className="p-4 text-xs">Online Alışveriş Tahsilatı</td>
                    <td className="p-4 text-xs text-gray-600">Kredi Kartı</td>
                    <td className="p-4 font-mono font-black text-[#FF6000]">{r.cost.toLocaleString("tr-TR")} TL</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Users, v: customers.length, l: "Aktif Üye" },
            { icon: Truck, v: stats.vehicles || 0, l: "Toplam Sipariş" },
            { icon: Calendar, v: stats.appointments || 0, l: "Kargo Bekleyen" },
            { icon: Clock, v: stats.pending_appointments || 0, l: "İptal Talepleri" },
            { icon: ClipboardList, v: stats.service_records || 0, l: "Kesilen Fatura" },
          ].map((s) => (
            <div key={s.l} className="p-4 border border-gray-200 bg-white rounded-lg shadow-sm">
              <div className="flex items-start justify-between">
                <s.icon className="h-6 w-6 text-[#FF6000]" />
                <span className="text-4xl font-black">{s.v}</span>
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3">{s.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}