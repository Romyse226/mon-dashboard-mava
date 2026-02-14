"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY);
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
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Vérification continue des notifications (Point 8)
  useEffect(() => {
    const checkNotifs = () => {
      if ("Notification" in window) {
        if (Notification.permission !== "granted") {
          setShowNotifModal(true);
        } else {
          setShowNotifModal(false);
        }
      }
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 10000); // Vérifie toutes les 10s
    return () => clearInterval(interval);
  }, []);

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
  }, [searchParams]);

  // Point 11 : Notification temps réel
  useEffect(() => {
    if (!vendeurPhone) return;
    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `phone_vendeur=eq.${vendeurPhone}` }, 
      (payload) => {
        if (Notification.permission === "granted") {
          new Notification("Nouvelle Commande !", {
            body: `${payload.new.product} - ${payload.new.quartier}`,
            icon: logoUrl
          });
        }
        fetchOrders(vendeurPhone);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [vendeurPhone]);

  const fetchOrders = async (phone) => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').eq('phone_vendeur', phone).order('created_at', { ascending: false });
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
      setErrorMsg("Numéro non reconnu.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ order_statuts: newStatus }).eq('id', id);
    fetchOrders(vendeurPhone);
  };

  const requestPermission = () => {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") setShowNotifModal(false);
      else alert("Veuillez activer les notifications dans les réglages de votre téléphone pour ne rater aucune commande.");
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
      <div className={`min-h-screen ${colors.bg} flex flex-col items-center p-8 transition-colors`}>
        <div className="w-full flex justify-end mb-4"><button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-zinc-800 rounded-full text-xl">{darkMode ? '☀️' : '🌙'}</button></div>
        <img src={logoUrl} className="w-40 mb-8" alt="Logo" />
        {errorMsg && <div className="w-full max-w-sm bg-red-600 text-white p-4 rounded-xl font-bold mb-4 text-center">{errorMsg}</div>}
        <input type="tel" className={`w-full max-w-sm p-5 rounded-2xl border-2 mb-4 outline-none text-xl text-center font-bold ${darkMode ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-white text-black border-zinc-300'}`} placeholder="07XXXXXXXX" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
        <button onClick={handleLogin} className="w-full max-w-sm p-5 rounded-2xl font-black uppercase bg-[#700D02] text-white text-lg shadow-xl">Ouvrir mon Board</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} p-4 font-sans overscroll-none`}>
      {/* Modal Notification Moderne (Point 8) */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-black p-8 rounded-[2.5rem] w-full max-w-sm text-center shadow-[0_0_50px_rgba(112,13,2,0.4)] border-4 border-[#700D02]">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Activer les alertes</h3>
            <p className="text-sm font-medium opacity-70 mb-6">Pour recevoir vos commandes en temps réel, vous devez autoriser les notifications.</p>
            <div className="flex flex-col gap-3">
              <button onClick={requestPermission} className="bg-[#700D02] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg">Autoriser maintenant</button>
              <button onClick={() => setShowNotifModal(false)} className="bg-zinc-100 text-zinc-500 py-4 rounded-2xl font-black uppercase text-xs">Plus tard</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10 pt-2">
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-zinc-800 rounded-full text-xl">{darkMode ? '☀️' : '🌙'}</button>
        <button onClick={() => {localStorage.removeItem('mava_active_session'); window.location.href="/";}} className={`font-black text-[11px] uppercase px-5 py-2 rounded-full ${darkMode ? 'bg-zinc-800' : 'bg-white border border-zinc-200'}`}>Déconnexion 🚪</button>
      </div>

      <h1 className="text-4xl font-black uppercase mb-8 italic border-b-8 border-[#700D02] inline-block">MAVA Board</h1>

      <div className="flex gap-4 mb-8 sticky top-0 bg-inherit z-10 py-3">
        {['pending', 'done'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-black uppercase rounded-xl transition ${activeTab === tab ? 'bg-[#700D02] text-white scale-105 shadow-[0_10px_20px_rgba(112,13,2,0.3)]' : 'opacity-30'}`}>
            {tab === 'pending' ? `🔔 En cours (${orders.filter(o => o.order_statuts !== "Livrée").length})` : `✅ Livrées (${orders.filter(o => o.order_statuts === "Livrée").length})`}
          </button>
        ))}
      </div>

      <div className="space-y-8 pb-10">
        {(activeTab === 'pending' ? orders.filter(o => o.order_statuts !== "Livrée") : orders.filter(o => o.order_statuts === "Livrée")).map(order => (
          <div key={order.id} className={`${colors.card} ${colors.border} rounded-[2.5rem] p-8 relative shadow-2xl`}>
            <div className={`absolute -top-4 right-8 text-[11px] font-black px-4 py-2 rounded-full border-2 border-white ${order.order_statuts === 'Livrée' ? 'bg-green-600' : 'bg-red-600'} text-white uppercase`}>
              {order.order_statuts === 'Livrée' ? 'Livrée' : 'À Livrer'}
            </div>
            <div className="font-black text-2xl mb-6 opacity-20 italic">#ID-{order.order_number || '000'}</div>
            <div className="space-y-4 mb-8">
              <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Produit</span><span className="text-xl font-bold">{order.product}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Quartier</span><span className="text-xl font-bold">{order.quartier}</span></div>
              <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Contact Client</span><span className="text-xl font-bold">{order.telephone}</span></div>
              <div className="pt-4 border-t border-zinc-800"><span className="text-[10px] font-black uppercase opacity-40">Prix Total</span><div className={`text-4xl font-black ${colors.price}`}>{order.prix?.toLocaleString()} FCFA</div></div>
            </div>
            <div className="flex flex-col gap-3">
              {activeTab === 'pending' ? (
                <>
                  <button onClick={() => updateStatus(order.id, 'Livrée')} className="w-full bg-[#700D02] py-5 rounded-2xl font-black uppercase text-white shadow-lg active:scale-95 transition">Marquer comme livrée</button>
                  <a href={`https://wa.me/${order.phone_client?.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="w-full bg-[#25D366] py-5 rounded-2xl font-black uppercase text-black text-center shadow-lg active:scale-95 transition">WhatsApp du client 💬</a>
                </>
              ) : (
                <button onClick={() => updateStatus(order.id, 'À livrer')} className="w-full bg-[#700D02] py-4 rounded-2xl font-black uppercase text-white opacity-60 hover:opacity-100 transition">Annuler 🔄</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MavaDashboard() { return (<Suspense fallback={null}><DashboardContent /></Suspense>); }