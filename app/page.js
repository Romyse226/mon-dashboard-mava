"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

// Initialisation de Supabase avec sécurité pour le build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function DashboardContent() {
  const searchParams = useSearchParams();
  const [vendeurPhone, setVendeurPhone] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const logoUrl = "https://raw.githubusercontent.com/Romyse226/mon-dashboard-livraison/3fe7b8570c28a48b298698ae7e6f8793f0add98d/mon%20logo%20mava.png";

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mava_persistent_phone');
      const v = searchParams.get('v');

      if (v) {
        setVendeurPhone(v);
        fetchOrders(v);
        localStorage.setItem('mava_persistent_phone', v);
      } else if (saved) {
        setVendeurPhone(saved);
        fetchOrders(saved);
        const newUrl = window.location.pathname + `?v=${saved}`;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [searchParams]);

  const fetchOrders = async (phone) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('phone_vendeur', phone)
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    let num = phoneInput.replace(/\s/g, "").replace("+", "");
    if (num.length === 10 && num.startsWith("0")) num = "225" + num;

    const { data } = await supabase.from('orders').select('phone_vendeur').eq('phone_vendeur', num).limit(1);
    
    if (data && data.length > 0) {
      localStorage.setItem('mava_persistent_phone', num);
      window.location.href = `?v=${num}`;
    } else {
      alert("Numéro non reconnu.");
    }
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ order_statuts: newStatus }).eq('id', id);
    fetchOrders(vendeurPhone);
  };

  const logout = () => {
    localStorage.removeItem('mava_persistent_phone');
    window.location.href = "/";
  };

  const colors = {
    bg: darkMode ? 'bg-black' : 'bg-white',
    card: darkMode ? 'bg-[#121212]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-black',
    sub: darkMode ? 'text-[#BBBBBB]' : 'text-[#666666]',
    border: darkMode ? 'border-[#333333]' : 'border-[#EEEEEE]',
    price: darkMode ? 'text-[#FF0000]' : 'text-[#700D02]',
  };

  if (!vendeurPhone) {
    return (
      <div className={`min-h-screen ${colors.bg} flex flex-col items-center p-8`}>
        <img src={logoUrl} className="w-32 mb-6" alt="Logo" />
        <h2 className={`text-2xl font-bold mb-2 uppercase ${colors.text}`}>Bienvenue</h2>
        <p className={`${colors.sub} text-center mb-6`}>Entre ton numéro pour suivre tes ventes</p>
        <input 
          type="tel"
          className={`w-full max-w-sm p-4 rounded-xl border ${colors.border} ${colors.card} ${colors.text} mb-4 outline-none`}
          placeholder="07XXXXXXXX"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
        />
        <button onClick={handleLogin} className="w-full max-w-sm p-4 rounded-xl font-black uppercase bg-[#700D02] text-white">
          Suivre mes commandes
        </button>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.order_statuts !== "Livrée");
  const doneOrders = orders.filter(o => o.order_statuts === "Livrée");

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} p-4 font-sans`}>
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setDarkMode(!darkMode)} className="text-xl p-2 bg-zinc-900/50 rounded-full">
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button onClick={logout} className="font-bold text-[10px] uppercase opacity-50 border border-zinc-800 px-3 py-1 rounded-full">Déconnexion 🚪</button>
      </div>

      <h1 className="text-4xl font-black uppercase mb-6 italic tracking-tighter underline decoration-[#700D02]">Mes Commandes</h1>

      <div className="flex gap-4 mb-6 sticky top-0 bg-inherit z-10 py-2">
        <button onClick={() => setActiveTab('pending')} className={`pb-2 px-2 text-xs font-black uppercase ${activeTab === 'pending' ? 'border-b-2 border-red-600 text-red-600' : 'opacity-30'}`}>
          En cours ({pendingOrders.length})
        </button>
        <button onClick={() => setActiveTab('done')} className={`pb-2 px-2 text-xs font-black uppercase ${activeTab === 'done' ? 'border-b-2 border-green-600 text-green-600' : 'opacity-30'}`}>
          Livrées ({doneOrders.length})
        </button>
      </div>

      <div className="space-y-4">
        {loading && <div className="h-40 bg-zinc-900 rounded-2xl animate-pulse"></div>}

        {(activeTab === 'pending' ? pendingOrders : doneOrders).map(order => (
          <div key={order.id} className={`${colors.card} border ${colors.border} rounded-[2rem] p-6 relative shadow-2xl`}>
            <div className={`absolute top-6 right-6 text-[9px] font-black px-3 py-1 rounded-full ${order.order_statuts === 'Livrée' ? 'bg-green-600' : 'bg-red-600'} text-white uppercase`}>
              {order.order_statuts === 'Livrée' ? 'Livrée' : 'À Livrer'}
            </div>
            
            <div className="font-black text-xl mb-4 italic opacity-30">#{order.order_number || '000'}</div>
            <div className="space-y-2 mb-6">
              <p className="text-sm font-bold">🛍️ {order.product}</p>
              <p className="text-sm opacity-70">📍 {order.quartier}</p>
              <p className="pt-2 font-black text-2xl text-red-600">{order.prix?.toLocaleString()} FCFA</p>
              <p className="text-sm opacity-50">📞 {order.telephone}</p>
            </div>

            <div className="flex flex-col gap-2">
              {activeTab === 'pending' ? (
                <>
                  <button onClick={() => updateStatus(order.id, 'Livrée')} className="w-full bg-[#700D02] py-4 rounded-2xl font-black uppercase text-white shadow-lg">
                    Marquer livrée
                  </button>
                  <a href={`https://wa.me/${order.phone_client?.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="w-full bg-[#25D366] py-4 rounded-2xl font-black uppercase text-black text-center shadow-lg">
                    WhatsApp 💬
                  </a>
                </>
              ) : (
                <button onClick={() => updateStatus(order.id, 'À livrer')} className="w-full bg-zinc-800 py-3 rounded-xl font-bold text-white opacity-40">
                  Annuler 🔄
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-20 py-10 text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-20 border-t ${colors.border}`}>
        MAVA © 2026
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
