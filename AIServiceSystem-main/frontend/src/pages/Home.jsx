import React, { useEffect, useState } from "react";
import { ShoppingCart, Star, CheckCircle, X, Trash2, Plus, Minus, Heart } from "lucide-react"; // Heart ikonunu ekledik
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]); 
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState(""); 
  const [activeSearch, setActiveSearch] = useState(""); 

  // FAVORİLER İÇİN DURUM (STATE) DEĞİŞKENİ
  const [favorites, setFavorites] = useState([]);

  const navigate = useNavigate();

  const fetchCart = (userId) => {
    fetch(`http://localhost:8001/api/cart/${userId}`)
      .then(res => res.json())
      .then(cartData => {
        if (cartData && cartData.items) {
          const activeItems = cartData.items.filter(item => item.quantity > 0);
          setCartItems(activeItems);
        }
      })
      .catch(err => console.error("Sepet çekilirken hata:", err));
  };

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      const user = JSON.parse(userString);
      setCurrentUser(user);
      fetchCart(user.id); 
    }

    fetch('http://localhost:8001/api/products')
      .then(res => res.json())
      .then(data => {
        const backendProducts = [
          {
            id: data[0]?.id || "b1",
            title: "Bosch Profesyonel Matkap ve Aksesuar Seti",
            brand: "BOSCH",
            price: 4500,
            category: "elektronik",
            image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400",
            stars: 5,
            reviews: 142
          },
          {
            id: data[1]?.id || "b2",
            title: "Garrett Akıllı Hızlı Şarj Ünitesi Multi-Port",
            brand: "GARRETT",
            price: 32000,
            category: "elektronik",
            image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=400",
            stars: 5,
            reviews: 88
          },
          {
            id: data[2]?.id || "b3",
            title: "Mobil 1 Sentetik Motor Yağı 5W-30 4L",
            brand: "MOBIL",
            price: 3800,
            category: "oto",
            image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400",
            stars: 4,
            reviews: 210
          },
          {
            id: data[3]?.id || "b4",
            title: "VDO Dijital Multimetre ve Ölçüm Cihazı",
            brand: "VDO",
            price: 12500,
            category: "elektronik",
            image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400",
            stars: 5,
            reviews: 65
          }
        ];

        const extraProducts = [
          { id: "p1", title: "Sony WH-1000XM4 Kablosuz ANC Kulak Üstü Kulaklık", brand: "SONY", price: 8499, category: "elektronik", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400", stars: 5, reviews: 1240 },
          { id: "p2", title: "Oversize Unisex Siyah Pamuklu Sweatshirt", brand: "TRENDYOLMİLLA", price: 549, category: "moda", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400", stars: 4, reviews: 3250 },
          { id: "p3", title: "Xiaomi Mi Robot Süpürge ve Mop Pro 2", brand: "XIAOMI", price: 14299, category: "elektronik", image: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=400", stars: 5, reviews: 840 },
          { id: "p4", title: "xDrive Sancak Profesyonel Oyuncu Koltuğu", brand: "XDRIVE", price: 4199, category: "ev", image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=400", stars: 4, reviews: 190 },
          { id: "p5", title: "Karaca Retro 6 Kişilik Porselen Yemek Takımı", brand: "KARACA", price: 3899, category: "ev", image: "https://images.unsplash.com/photo-1610701596007-11502861affa?auto=format&fit=crop&q=80&w=400", stars: 5, reviews: 412 },
          { id: "p6", title: "Apple Watch Series 9 GPS 45mm Alüminyum", brand: "APPLE", price: 16499, category: "elektronik", image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=400", stars: 5, reviews: 2100 },
          { id: "p7", title: "Derimod Hakiki Deri Kahverengi Erkek Ayakkabı", brand: "DERİMOD", price: 2199, category: "moda", image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=400", stars: 4, reviews: 88 },
          { id: "p8", title: "Meguiars Yeni Nesil Sıvı Oto Cilası Paketi", brand: "MEGUIARS", price: 1250, category: "oto", image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&q=80&w=400", stars: 5, reviews: 530 }
        ];

        setProducts([...backendProducts, ...extraProducts]);
        setLoading(false);
      })
      .catch(err => {
        console.error("Veri çekilirken hata:", err);
        setLoading(false);
      });
  }, []);

  // FAVORİYE EKLEME / ÇIKARMA FONKSİYONU
  const toggleFavorite = (productId) => {
    if (favorites.includes(productId)) {
      // Eğer zaten favorilerde varsa çıkar
      setFavorites(favorites.filter(id => id !== productId));
    } else {
      // Favorilerde yoksa ekle
      setFavorites([...favorites, productId]);
    }
  };

  const addToCart = async (product) => {
    if (!currentUser) {
      alert("Sepete ürün eklemek için lütfen önce giriş yapın!");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8001/api/cart/${currentUser.id}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });

      if (!response.ok) throw new Error("Ürün sepete eklenemedi.");
      fetchCart(currentUser.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const updateQuantity = async (productId, currentQty, action) => {
    if (!currentUser) return;

    try {
      let targetQuantity = 1;
      if (action === "decrease") targetQuantity = -1;
      if (action === "remove") targetQuantity = -currentQty; 

      const response = await fetch(`http://localhost:8001/api/cart/${currentUser.id}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity: targetQuantity }),
      });

      if (!response.ok) throw new Error("Sepet güncellenemedi.");
      fetchCart(currentUser.id);
    } catch (err) {
      console.error(err);
    }
  };

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const p = products.find(prod => prod.id === item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  const getProductDetails = (productId) => {
    return products.find(p => p.id === productId) || { title: "Ürün Detayı Yükleniyor...", price: 0, brand: "GENEL", image: "" };
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(activeSearch.toLowerCase()) || 
                          p.brand.toLowerCase().includes(activeSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setActiveSearch(searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#333333] font-sans antialiased pb-12 relative overflow-x-hidden">
      
      {/* Hepsiburada Logolu Ana Bar */}
      <div className="bg-white border-b border-[#E2E2E2] px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-3xl font-black tracking-tight text-[#FF6000] lowercase cursor-pointer" onClick={() => { navigate("/"); setSelectedCategory("all"); setActiveSearch(""); setSearchQuery(""); }}>
          hepsiburada<span className="text-[#999999] text-xs font-normal ml-1">Premium'u keşfet</span>
        </h1>

        <div className="hidden md:flex flex-1 max-w-2xl mx-12">
          <input 
            type="text" 
            value={searchQuery}
            placeholder="Ürün, kategori veya marka ara..." 
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#F4F4F6] border border-[#E2E2E2] rounded-l-md px-4 py-2.5 text-sm text-black outline-none focus:border-[#FF6000]"
          />
          <button 
            onClick={() => setActiveSearch(searchQuery)}
            className="bg-[#FF6000] hover:bg-[#e05500] text-white font-bold px-8 rounded-r-md text-sm transition-colors"
          >
            Ara
          </button>
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#666666]">Selam, {currentUser.name}</span>
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="text-xs text-red-500 underline"
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate("/login")} 
              className="text-sm font-bold border border-[#E2E2E2] px-4 py-2 rounded-md hover:bg-[#F4F4F6]"
            >
              Giriş Yap / Üye Ol
            </button>
          )}

          {/* ÜST BARDAKİ FAVORİLERİM BUTONU */}
          <div 
            onClick={() => alert(`Favorilerinizde ${favorites.length} ürün var!`)}
            className="border border-[#E2E2E2] hover:bg-[#F4F4F6] text-[#666666] transition-colors px-4 py-2.5 rounded-md flex items-center gap-2 cursor-pointer relative"
          >
            <Heart size={18} className={favorites.length > 0 ? "text-red-500 fill-red-500" : ""} />
            <span className="text-sm font-semibold hidden lg:inline">Beğendiklerim</span>
            {favorites.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {favorites.length}
              </span>
            )}
          </div>

          <div 
            onClick={() => setIsCartOpen(true)}
            className="bg-[#919196] text-white hover:bg-[#FF6000] transition-colors px-6 py-2.5 rounded-md flex items-center gap-3 cursor-pointer"
          >
            <ShoppingCart size={18} />
            <span className="text-sm font-semibold">Sepetim</span>
            <span className="bg-white text-[#FF6000] font-bold text-xs px-2 py-0.5 rounded-full">{totalQuantity}</span>
          </div>
        </div>
      </div>

      {/* SAĞDAN KAYAN SEPET PANELİ */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={() => setIsCartOpen(false)} />
          
          <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 p-6 flex flex-col justify-between transition-transform duration-300">
            <div>
              <div className="flex justify-between items-center border-b border-[#E2E2E2] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[#FF6000]" />
                  <h2 className="text-lg font-bold text-[#333333]">Sepetim ({totalQuantity})</h2>
                </div>
                <X size={24} className="cursor-pointer text-[#666666] hover:text-[#333333]" onClick={() => setIsCartOpen(false)} />
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-240px)] space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 text-[#999999] text-sm">Sepetiniz şu an boş.</div>
                ) : (
                  cartItems.map((item, idx) => {
                    const details = getProductDetails(item.product_id);
                    return (
                      <div key={idx} className="flex gap-3 bg-[#F8F8FA] p-3 rounded-lg border border-[#E2E2E2] items-center">
                        <div className="w-16 h-16 bg-cover bg-center rounded bg-white border border-[#E2E2E2] flex-shrink-0" style={{ backgroundImage: `url('${details.image}')` }}></div>
                        <div className="flex-1">
                          <span className="text-[9px] font-bold text-[#FF6000] uppercase">{details.brand}</span>
                          <h4 className="text-xs font-bold text-[#333333] line-clamp-1">{details.title}</h4>
                          <span className="text-xs font-black text-[#FF6000] font-mono block mt-1">{(details.price * item.quantity).toLocaleString('tr-TR')} TL</span>
                          
                          <div className="flex items-center justify-between mt-2 bg-white border border-[#E2E2E2] rounded-md p-1 w-24">
                            <button onClick={() => updateQuantity(item.product_id, item.quantity, "decrease")} className="text-[#666666] hover:text-black p-0.5">
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold font-mono">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id, item.quantity, "increase")} className="text-[#666666] hover:text-black p-0.5">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity, "remove")} className="text-red-400 hover:text-red-600 p-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-[#E2E2E2] pt-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-[#666666]">Toplam Tutar:</span>
                <span className="text-xl font-black text-[#FF6000] font-mono">{totalPrice.toLocaleString('tr-TR')} TL</span>
              </div>
              <button onClick={() => alert("Alışveriş başarıyla tamamlandı!")} className="w-full bg-[#FF6000] hover:bg-[#e05500] text-white font-bold py-3 rounded-md text-sm transition-colors shadow-sm">
                Alışverişi Tamamla
              </button>
            </div>
          </div>
        </>
      )}

      {/* Ana Vitrin Alanı */}
      <div className="max-w-7xl mx-auto p-6">
        
        {activeSearch && (
          <div className="mb-4 bg-orange-50 border border-[#FF6000]/20 p-3 rounded-md flex justify-between items-center text-sm">
            <span>🔍 <strong>"{activeSearch}"</strong> araması için sonuçlar listeleniyor.</span>
            <button onClick={() => { setActiveSearch(""); setSearchQuery(""); }} className="text-[#FF6000] font-bold underline hover:text-[#e05500]">
              Aramayı Temizle
            </button>
          </div>
        )}

        {/* Kategoriler */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[{ id: "all", label: "Tüm Ürünler" }, { id: "elektronik", label: "💻 Elektronik" }, { id: "moda", label: "👗 Moda & Giyim" }, { id: "ev", label: "🛋️ Ev, Yaşam, Ofis" }, { id: "oto", label: "🚗 Oto, Bahçe, Yapı Market" }].map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 text-xs font-bold transition-all rounded-full border ${selectedCategory === cat.id ? "bg-[#FF6000] text-white border-[#FF6000]" : "bg-white text-[#666666] border-[#E2E2E2]"}`}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* 12 ÜRÜNLÜK DEV VİTRİN IZGARASI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">Aradığınız kriterlere uygun ürün bulunamadı.</div>
          ) : (
            filteredProducts.map(product => {
              const isFavorite = favorites.includes(product.id); // Bu ürün favoride mi?

              return (
                <div key={product.id} className="bg-white border border-[#E2E2E2] rounded-lg p-4 flex flex-col justify-between hover:shadow-md relative group">
                  <div className="absolute top-2 left-2 z-10 bg-[#FF6000] text-white font-bold text-[9px] px-2 py-0.5 rounded-sm">SÜPER FİYAT</div>
                  
                  {/* SAĞ ÜST KÖŞEDEKİ HEDEF KALP (FAVORİ) BUTONU */}
                  <button 
                    onClick={() => toggleFavorite(product.id)}
                    className="absolute top-2 right-2 z-10 bg-white border border-[#E2E2E2] p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Heart 
                      size={16} 
                      className={`transition-colors ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-400 group-hover:text-red-400"}`} 
                    />
                  </button>

                  <div className="h-40 w-full bg-white flex items-center justify-center overflow-hidden rounded-md mb-3">
                    <img 
                      src={product.image} 
                      alt={product.title} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[#FF6000] text-[10px] font-bold uppercase">{product.brand}</span>
                      <h3 className="text-sm font-bold text-[#333333] line-clamp-2 mt-0.5 h-10">{product.title}</h3>
                      <div className="flex text-orange-400 my-2">
                        {[...Array(product.stars || 5)].map((_, i) => <Star key={i} size={11} fill="currentColor" />)}
                        <span className="text-[10px] text-[#999999] ml-1">({product.reviews || 96})</span>
                      </div>
                    </div>
                    <div className="border-t border-[#F4F4F6] pt-3 mt-2">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-[10px] text-[#999999]">FİYAT</span>
                        <span className="text-base font-black text-[#FF6000] font-mono">{product.price?.toLocaleString('tr-TR')} TL</span>
                      </div>
                      <button onClick={() => addToCart(product)} className="w-full bg-[#FF6000] text-white font-bold rounded-md py-2 text-xs flex items-center justify-center gap-2">
                        <CheckCircle size={14} /> Sepete Ekle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}