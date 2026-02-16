"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY);
const logoUrl = "https://raw.githubusercontent.com/Romyse226/mon-dashboard-mava/31c25ca78b7d59f021c7a498e8b1ce7491f12237/mon%20logo%20mava.png";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [vendeurPhone, setVendeurPhone] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showNotifModal, setShowNotifModal] = useState(false);

  const fetchOrders = useCallback(async (phone) => {
    if (!phone) return;
    const { data } = await supabase.from('orders').select('*').eq('phone_vendeur', phone).order('created_at', { ascending: false });
    setOrders(data || []);
  }, []);

  // Fix Pull-to-refresh pour iOS PWA (Séparé correctement)
  useEffect(() => {
    let touchStart = 0;
    const handleTouchStart = (e) => { touchStart = e.touches[0].pageY; };
    const handleTouchEnd = (e) => {
      const touchEnd = e.changedTouches[0].pageY;
      if (window.scrollY <= 10 && touchEnd - touchStart > 150) {
        window.location.reload();
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    // Déclenchement notifs Web + PWA
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        setShowNotifModal(true);
      }
    }

    const savedActive = localStorage.getItem('mava_active_session');
    const lastNum = localStorage.getItem('mava_last_number');
    const v = searchParams.get('v');

    if (lastNum) setPhoneInput(lastNum);
    if (v) {
      setVendeurPhone(v);
      fetchOrders(v);
      localStorage.setItem('mava_active_session', v);
    } else if (savedActive) {
      setVendeurPhone(savedActive);
      fetchOrders(savedActive);
    }
  }, [searchParams, fetchOrders]);

  const handleLogin = async () => {
    let num = phoneInput.replace(/\s/g, "").replace("+", "");
    if (num.length === 10 && num.startsWith("0")) num = "225" + num;
    const { data } = await supabase.from('orders').select('phone_vendeur').eq('phone_vendeur', num).limit(1);
    if (data && data.length > 0) {
      localStorage.setItem('mava_active_session', num);
      localStorage.setItem('mava_last_number', num);
      window.location.href = `?v=${num}`;
    } else {
      alert("Numéro non reconnu.");
    }
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ order_statuts: newStatus }).eq('id', id);
    fetchOrders(vendeurPhone);
  };

  const requestPermission = () => {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        setShowNotifModal(false);
        new Notification("MAVA Board", { body: "Alertes activées !", icon: logoUrl });
      }
    });
  };

  const colors = {
    bg: darkMode ? 'bg-black' : 'bg-[#F8F9FA]',
    card: darkMode ? 'bg-[#121212]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-black',
    border: darkMode ? 'border-white border-[3px]' : 'border-black border-[3px]',
    price: darkMode ? 'text-[#FF0000]' : 'text-[#700D02]',
  };

  if (!vendeurPhone) {
    return (
      <div className={`min-h-screen ${colors.bg} flex flex-col items-center p-8`}>
        <div className="w-full flex justify-end mb-4"><button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-zinc-800 rounded-full">{darkMode ? '☀️' : '🌙'}</button></div>
        <img src={logoUrl} className="w-40 mb-8" alt="Logo" />
        <input type="tel" className={`w-full max-w-sm p-5 rounded-2xl border-2 mb-4 text-center font-bold ${darkMode ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-white text-black border-zinc-300'}`} placeholder="07XXXXXXXX" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
        <button onClick={handleLogin} className="w-full max-w-sm p-5 rounded-2xl font-black uppercase bg-[#700D02] text-white">Ouvrir mon Board</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} p-4`}>
      {showNotifModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white text-black p-8 rounded-[2.5rem] w-full max-w-sm text-center border-4 border-[#700D02]">
            <h3 className="text-2xl font-black uppercase mb-2">Activer les alertes</h3>
            <p className="text-sm opacity-70 mb-6 font-medium">Autorisez les notifications pour recevoir vos commandes instantanément.</p>
            <button onClick={requestPermission} className="w-full bg-[#700D02] text-white py-5 rounded-2xl font-black uppercase active:scale-95 transition-transform">Autoriser</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-zinc-800 rounded-full text-xl">{darkMode ? '☀️' : '🌙'}</button>
        <button onClick={() => {localStorage.removeItem('mava_active_session'); window.location.href="/";}} className={`font-black text-[11px] uppercase px-6 py-3 rounded-full ${darkMode ? 'bg-zinc-800' : 'bg-white border border-zinc-200'}`}>Déconnexion 🚪</button>
      </div>

      <h1 className="text-4xl font-black uppercase mb-8 italic border-b-8 border-[#700D02] inline-block tracking-tighter">MAVA Board</h1>

      <div className="flex gap-4 mb-8 sticky top-0 bg-inherit z-10 py-2">
        {['pending', 'done'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-xs font-black uppercase rounded-2xl transition-all active:scale-95 ${activeTab === tab ? 'bg-[#700D02] text-white shadow-lg' : 'opacity-30 bg-zinc-800/20'}`}>
            {tab === 'pending' ? `En cours (${orders.filter(o => o.order_statuts !== "Livrée").length})` : `Livrées (${orders.filter(o => o.order_statuts === "Livrée").length})`}
          </button>
        ))}
      </div>

      <div className="space-y-8 pb-12">
        {orders.filter(o => activeTab === 'pending' ? o.order_statuts !== "Livrée" : o.order_statuts === "Livrée").map(order => (
          <div key={order.id} className={`${colors.card} ${colors.border} rounded-[2.5rem] p-8 relative shadow-2xl`}>
            <div className={`absolute -top-4 right-8 text-[11px] font-black px-5 py-2 rounded-full border-2 border-white ${order.order_statuts === 'Livrée' ? 'bg-green-600' : 'bg-red-600'} text-white uppercase`}>
              {order.order_statuts === 'Livrée' ? 'Livrée' : 'À Livrer'}
            </div>
            <div className="font-black text-2xl mb-6 opacity-20 italic">N°-{order.order_number || '000'}</div>
            
            <div className="space-y-4 mb-8">
              <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Produit</span><span className="text-xl font-bold tracking-tight">{order.product}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Quartier</span><span className="text-xl font-bold tracking-tight">{order.quartier}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Contact Client</span><span className="text-xl font-bold tracking-tight">{order.telephone}</span></div>
              <div className="pt-4 border-t border-zinc-800/50"><span className="text-[10px] font-black uppercase text-red-600">Prix Total</span><div className={`text-4xl font-black ${colors.price} tracking-tighter`}>{order.prix?.toLocaleString()} FCFA</div></div>
            </div>
            <div className="flex flex-col gap-3">
              {activeTab === 'pending' ? (
                <>
                  <button onClick={() => updateStatus(order.id, 'Livrée')} className="w-full bg-[#700D02] py-5 rounded-2xl font-black uppercase text-white shadow-lg active:scale-95 transition-transform">Marquer comme livrée</button>
                  <a href={`https://wa.me/${order.phone_client?.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="w-full bg-[#25D366] py-5 rounded-2xl font-black uppercase text-black text-center shadow-lg active:scale-95 transition-transform">WhatsApp du client 💬</a>
                </>
              ) : (
                <button onClick={() => updateStatus(order.id, 'À livrer')} className="w-full bg-[#700D02] py-4 rounded-2xl font-black uppercase text-white opacity-60 active:scale-95 transition-all">Annuler 🔄</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MavaDashboard() { return (<Suspense fallback={null}><DashboardContent /></Suspense>); }