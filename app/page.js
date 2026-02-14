"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Nouveau logo brut (raw)
const logoUrl = "https://raw.githubusercontent.com/Romyse226/mon-dashboard-mava/31c25ca78b7d59f021c7a498e8b1ce7491f12237/mon%20logo%20mava.png";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [vendeurPhone, setVendeurPhone] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [errorMsg, setErrorMsg] = useState("");

  // Persistance renforcée (Point 9 et 10)
  useEffect(() => {
    const savedActive = localStorage.getItem('mava_active_session');
    const lastNum = localStorage.getItem('mava_last_number');
    const v = searchParams.get('v');

    if (lastNum) setPhoneInput(lastNum);

    if (v) {
      setVendeurPhone(v);
      fetchOrders(v);
      localStorage.setItem('mava_active_session', v);
      localStorage.setItem('mava_last_number', v);
    } else if (savedActive) {
      setVendeurPhone(savedActive);
      fetchOrders(savedActive);
    }
    
    // Demande de notification (Point 8)
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, [searchParams]);

  // Surveillance des nouvelles commandes (Point 11)
  useEffect(() => {
    if (!vendeurPhone) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `phone_vendeur=eq.${vendeurPhone}` },
        (payload) => {
          new Notification("Nouvelle Commande MAVA ! 📦", {
            body: `Client: ${payload.new.telephone}\nLieu: ${payload.new.quartier}\nProduit: ${payload.new.product}`,
            icon: logoUrl
          });
          fetchOrders(vendeurPhone);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [vendeurPhone]);

  const fetchOrders = async (phone) => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('phone_vendeur', phone)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const handleLogin = async () => {
    setErrorMsg("");
    let num = phoneInput.replace(/\s/g, "").replace("+", "");
    if (num.length === 10 && num.startsWith("0")) num = "225" + num;

    const { data } = await supabase.from('orders').select('phone_vendeur').eq('phone_vendeur', num).limit(1);
    
    if (data && data.length > 0) {
      localStorage.setItem('mava_active_session', num);
      localStorage.setItem('mava_last_number', num);
      window.location.href = `?v=${num}`;
    } else {
      setErrorMsg("Numéro non reconnu dans notre base."); // Point 6
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ order_statuts: newStatus }).eq('id', id);
    fetchOrders(vendeurPhone);
  };

  const logout = () => {
    localStorage.removeItem('mava_active_session');
    window.location.href = "/";
  };

  const colors = {
    bg: darkMode ? 'bg-black' : 'bg-[#F8F9FA]',
    card: darkMode ? 'bg-[#121212]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-black',
    sub: darkMode ? 'text-[#BBBBBB]' : 'text-[#666666]',
    border: darkMode ? 'border-white border-[3px]' : 'border-black border-[3px]', // Point 1
    price: darkMode ? 'text-[#FF0000]' : 'text-[#700D02]',
    btnToggle: 'bg-[#808080] bg-opacity-20 hover:bg-opacity-40',
    logoutCircle: darkMode ? 'bg-zinc-800' : 'bg-white border border-zinc-200' // Point 4
  };

  // Icône Mode Sombre/Clair (Point 2)
  const ThemeToggle = () => (
    <button 
      onClick={() => setDarkMode(!darkMode)} 
      className={`p-2 rounded-full transition-all ${colors.btnToggle} flex items-center justify-center`}
      style={{ width: '42px', height: '42px' }}
    >
      <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.2))' }}>
        {darkMode ? '☀️' : '🌙'}
      </span>
    </button>
  );

  if (!vendeurPhone) {
    return (
      <div className={`min-h-screen ${colors.bg} flex flex-col items-center p-8 transition-colors`}>
        <div className="w-full flex justify-end mb-4">
          <ThemeToggle /> {/* Point 5 */}
        </div>
        <img src={logoUrl} className="w-40 mb-8" alt="Logo" />
        <h2 className={`text-3xl font-black mb-2 uppercase tracking-tighter ${colors.text}`}>Connexion</h2>
        
        {/* Notification d'erreur personnalisée (Point 6) */}
        {errorMsg && (
          <div className="w-full max-w-sm bg-red-600 text-white p-4 rounded-xl font-bold mb-4 animate-bounce text-center">
            {errorMsg}
          </div>
        )}

        <input 
          type="tel"
          className={`w-full max-w-sm p-5 rounded-2xl border-2 ${darkMode ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-black'} mb-4 outline-none text-xl text-center font-bold`}
          placeholder="07XXXXXXXX"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
        />
        <button onClick={handleLogin} className="w-full max-w-sm p-5 rounded-2xl font-black uppercase bg-[#700D02] text-white text-lg shadow-xl active:scale-95 transition">
          Ouvrir mon Board
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} p-4 font-sans transition-colors`}>
      <div className="flex justify-between items-center mb-10 pt-2">
        <ThemeToggle />
        <button onClick={logout} className={`font-black text-[11px] uppercase tracking-tighter ${colors.logoutCircle} px-5 py-2 rounded-full shadow-sm`}>
          Déconnexion 🚪
        </button>
      </div>

      <h1 className="text-4xl font-black uppercase mb-8 italic tracking-tighter border-b-8 border-[#700D02] inline-block">MAVA Board</h1>

      <div className="flex gap-4 mb-8 sticky top-0 bg-inherit z-10 py-3">
        {['pending', 'done'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition ${activeTab === tab ? 'bg-[#700D02] text-white scale-105' : 'opacity-30'}`}
          >
            {tab === 'pending' ? `🔔 En cours (${orders.filter(o => o.order_statuts !== "Livrée").length})` : `✅ Livrées (${orders.filter(o => o.order_statuts === "Livrée").length})`}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {(activeTab === 'pending' ? orders.filter(o => o.order_statuts !== "Livrée") : orders.filter(o => o.order_statuts === "Livrée")).map(order => (
          <div key={order.id} className={`${colors.card} ${colors.border} rounded-[2.5rem] p-8 relative shadow-2xl transition-all`}>
            <div className={`absolute -top-4 right-8 text-[11px] font-black px-4 py-2 rounded-full ${order.order_statuts === 'Livrée' ? 'bg-green-600' : 'bg-red-600'} text-white uppercase border-2 border-white`}>
              {order.order_statuts === 'Livrée' ? 'Terminé' : 'À Livrer'}
            </div>
            
            <div className="font-black text-2xl mb-6 italic opacity-20 italic">#ID-{order.order_number || '000'}</div>
            
            <div className="space-y-4 mb-8">
              {/* Point 3 : Styles d'écriture uniformes */}
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-40">Produit</span>
                <span className="text-xl font-bold leading-tight">{order.product}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-40">Quartier</span>
                <span className="text-xl font-bold leading-tight">{order.quartier}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-40">Contact Client</span>
                <span className="text-xl font-bold leading-tight tracking-tighter">{order.telephone}</span>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <span className="text-[10px] font-black uppercase opacity-40">Prix Total</span>
                <div className={`text-4xl font-black ${colors.price} tracking-tighter`}>{order.prix?.toLocaleString()} FCFA</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {activeTab === 'pending' ? (
                <>
                  <button onClick={() => updateStatus(order.id, 'Livrée')} className="w-full bg-[#700D02] py-5 rounded-2xl font-black uppercase text-white shadow-lg active:scale-95 transition">
                    Valider la livraison
                  </button>
                  <a href={`https://wa.me/${order.phone_client?.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="w-full bg-[#25D366] py-5 rounded-2xl font-black uppercase text-black text-center shadow-lg active:scale-95 transition">
                    WhatsApp Client 💬
                  </a>
                </>
              ) : (
                <button onClick={() => updateStatus(order.id, 'À livrer')} className="w-full bg-[#700D02] py-4 rounded-2xl font-black uppercase text-white opacity-60 active:opacity-100 transition">
                  Récupérer la commande 🔄
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-20 py-10 text-center text-[11px] font-black uppercase tracking-[0.5em] opacity-20 border-t ${colors.border}`}>
        MAVA Board • SYNC 2026
      </div>
    </div>
  );
}

export default function MavaDashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}