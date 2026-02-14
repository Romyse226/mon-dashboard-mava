"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  const [notifPermission, setNotifPermission] = useState("default");

  useEffect(() => {
    // Gestion des notifications (Point 8)
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }

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

  // Surveillance Temps Réel + Notifications (Point 11)
  useEffect(() => {
    if (!vendeurPhone) return;

    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `phone_vendeur=eq.${vendeurPhone}` },
        (payload) => {
          if (Notification.permission === "granted") {
            new Notification("Nouvelle Commande ! 📦", {
              body: `${payload.new.product} - ${payload.new.quartier} (${payload.new.prix} FCFA)`,
              icon: logoUrl
            });
          }
          fetchOrders(vendeurPhone);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [vendeurPhone]);

  const requestNotif = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "denied") {
        alert("Pour activer les notifs, allez dans les réglages de votre téléphone > Notifications > Safari/Chrome/MAVA.");
      }
    }
  };

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

  const logout = () => {
    localStorage.removeItem('mava_active_session');
    window.location.href = "/";
  };

  const colors = {
    bg: darkMode ? 'bg-black' : 'bg-[#F8F9FA]',
    card: darkMode ? 'bg-[#121212]' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-black',
    border: darkMode ? 'border-white border-[3px]' : 'border-black border-[3px]',
    price: darkMode ? 'text-[#FF0000]' : 'text-[#700D02]',
    logoutCircle: darkMode ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
  };

  const ThemeToggle = () => (
    <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-[#808080] bg-opacity-20 flex items-center justify-center w-[42px] h-[42px]">
      <span className="text-[20px]">{darkMode ? '☀️' : '🌙'}</span>
    </button>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} font-sans transition-colors p-4 pb-20`}>
      {/* Bandeau Notifications Crucial (Point 8) */}
      {notifPermission !== "granted" && (
        <div onClick={requestNotif} className="fixed top-0 left-0 w-full bg-red-600 text-white p-3 z-[100] text-center font-black uppercase text-[10px] cursor-pointer animate-pulse">
          ⚠️ Notifications désactivées ! Cliquez ici pour les activer ⚠️
        </div>
      )}

      {!vendeurPhone ? (
        <div className="flex flex-col items-center pt-20">
          <div className="w-full flex justify-end mb-4"><ThemeToggle /></div>
          <img src={logoUrl} className="w-40 mb-8" alt="Logo" />
          <h2 className="text-3xl font-black mb-2 uppercase">Connexion</h2>
          {errorMsg && <div className="w-full max-w-sm bg-red-600 text-white p-4 rounded-xl font-bold mb-4 text-center">{errorMsg}</div>}
          <input 
            type="tel" className={`w-full max-w-sm p-5 rounded-2xl border-2 ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'} mb-4 text-center font-bold text-xl`}
            placeholder="07XXXXXXXX" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full max-w-sm p-5 rounded-2xl font-black uppercase bg-[#700D02] text-white">Ouvrir mon Board</button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-10 pt-8">
            <ThemeToggle />
            <button onClick={logout} className={`font-black text-[11px] uppercase ${colors.logoutCircle} px-5 py-2 rounded-full shadow-sm`}>Déconnexion 🚪</button>
          </div>

          <h1 className="text-4xl font-black uppercase mb-8 italic border-b-8 border-[#700D02] inline-block">MAVA Board</h1>

          <div className="flex gap-4 mb-8 sticky top-12 bg-inherit z-10 py-3">
            {['pending', 'done'].map((tab) => (
              <button 
                key={tab} onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-3 text-sm font-black uppercase rounded-xl transition ${activeTab === tab ? 'bg-[#700D02] text-white' : 'opacity-30'}`}
              >
                {tab === 'pending' ? `En cours (${orders.filter(o => o.order_statuts !== "Livrée").length})` : `Livrées (${orders.filter(o => o.order_statuts === "Livrée").length})`}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {(activeTab === 'pending' ? orders.filter(o => o.order_statuts !== "Livrée") : orders.filter(o => o.order_statuts === "Livrée")).map(order => (
              <div key={order.id} className={`${colors.card} ${colors.border} rounded-[2.5rem] p-8 relative shadow-2xl`}>
                <div className={`absolute -top-4 right-8 text-[11px] font-black px-4 py-2 rounded-full ${order.order_statuts === 'Livrée' ? 'bg-green-600' : 'bg-red-600'} text-white uppercase border-2 border-white`}>
                  {order.order_statuts === 'Livrée' ? 'Terminé' : 'À Livrer'}
                </div>
                <div className="font-black text-2xl mb-6 opacity-20 italic">#ID-{order.order_number || '000'}</div>
                <div className="space-y-4 mb-8 text-xl font-bold">
                  <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Produit</span>{order.product}</div>
                  <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Quartier</span>{order.quartier}</div>
                  <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Contact</span>{order.telephone}</div>
                  <div className="pt-4 border-t border-zinc-800"><div className={`text-4xl font-black ${colors.price}`}>{order.prix?.toLocaleString()} FCFA</div></div>
                </div>
                <div className="flex flex-col gap-3">
                  {activeTab === 'pending' ? (
                    <>
                      <button onClick={() => updateStatus(order.id, 'Livrée')} className="w-full bg-[#700D02] py-5 rounded-2xl font-black uppercase text-white shadow-lg">Valider livraison</button>
                      <a href={`https://wa.me/${order.phone_client?.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="w-full bg-[#25D366] py-5 rounded-2xl font-black uppercase text-black text-center shadow-lg">WhatsApp Client 💬</a>
                    </>
                  ) : (
                    <button onClick={() => updateStatus(order.id, 'À livrer')} className="w-full bg-[#700D02] py-4 rounded-2xl font-black uppercase text-white opacity-60">Récupérer 🔄</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MavaDashboard() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
}