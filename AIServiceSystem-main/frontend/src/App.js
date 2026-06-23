import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin"; // <-- Admin panelimizi buraya dahil ettik

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Ana Alışveriş Sayfası */}
        <Route path="/" element={<Home />} />
        
        {/* Hepsiburada Tarzı Giriş/Kayıt Sayfası */}
        <Route path="/login" element={<Login />} />
        
        {/* VE İNATLA AÇILMAYAN O GİZLİ YÖNETİM PANELİ KAPISI BURASI! */}
        <Route path="/admin" element={<Admin />} />
        
        {/* Tanımlı olmayan her şey ana sayfaya fırlatılsın */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}