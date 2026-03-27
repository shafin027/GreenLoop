import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Package, Award, History, Plus, CheckCircle2, AlertCircle, TrendingUp, Scale, Leaf, ShoppingCart, Zap, Users, Truck, MapPin, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function RecyclingCenterDashboard() {
  const { token } = useAuth();
  const [centerData, setCenterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'log' | 'marketplace' | 'badges'>('overview');
  const [logForm, setLogForm] = useState({ category: 'plastic', weight: '' });
  const [marketplaceForm, setMarketplaceForm] = useState({ amount: '', price: '' });
  const [pendingPickups, setPendingPickups] = useState<any[]>([]);
  const [myPickups, setMyPickups] = useState<any[]>([]);
  const [wasteLogs, setWasteLogs] = useState<any[]>([]);
  const [availableCredits, setAvailableCredits] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [badgeForm, setBadgeForm] = useState({ businessId: '', badgeName: '' });
  const [badgeOptions, setBadgeOptions] = useState<any[]>([]);
  const [centerBadgeProgress, setCenterBadgeProgress] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [availableWaste, setAvailableWaste] = useState<Record<string, number>>({});

  const CREDIT_RATES: Record<string, number> = {
    ewaste: 1.5, metal: 1.0, plastic: 0.8, glass: 0.4, paper: 0.3, organic: 0.2
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 6000);
    return () => clearInterval(interval);
  }, [token]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchAll = () => {
    fetchCenterData();
    fetchPendingPickups();
    fetchMyPickups();
    fetchWasteLogs();
    fetchAvailableCredits();
    fetchAvailableWaste();
    fetchBusinesses();
    fetchBadges();
    fetchCenterBadgeProgress();
  };

  const fetchCenterData = async () => {
    try {
      const res = await fetch('/api/recycling-centers/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setCenterData(data); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchPendingPickups = async () => {
    try {
      const res = await fetch('/api/recycling-centers/pending-pickups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setPendingPickups(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchMyPickups = async () => {
    try {
      const res = await fetch('/api/recycling-centers/my-pickups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setMyPickups(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchWasteLogs = async () => {
    try {
      const res = await fetch('/api/recycling-centers/waste-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setWasteLogs(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchAvailableCredits = async () => {
    try {
      const res = await fetch('/api/carbon-credits/available');
      if (res.ok) { const data = await res.json(); setAvailableCredits(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchAvailableWaste = async () => {
    try {
      const res = await fetch('/api/recycling-centers/available-waste', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setAvailableWaste(data.available || {}); }
    } catch (e) { console.error(e); }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setBusinesses(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/badges');
      if (res.ok) {
        const data = await res.json();
        setBadgeOptions(data.filter((b: any) => b.targetRole === 'business'));
      }
    } catch (e) { console.error(e); }
  };

  const fetchCenterBadgeProgress = async () => {
    try {
      const res = await fetch('/api/recycling-centers/badge-progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const data = await res.json(); setCenterBadgeProgress(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const handleAcceptPickup = async (pickupId: string) => {
    try {
      const res = await fetch(`/api/recycling-centers/accept-pickup/${pickupId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', 'Pickup accepted! Collectors can now claim it.'); fetchAll(); }
      else showMessage('error', d.message || 'Failed to accept pickup');
    } catch (e) { showMessage('error', 'An error occurred'); }
  };

  const handleLogWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recycling-centers/log-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...logForm, weight: parseFloat(logForm.weight) })
      });
      const d = await res.json();
      if (res.ok) {
        showMessage('success', d.message || 'Waste logged successfully!');
        setLogForm({ category: 'plastic', weight: '' });
        fetchAll();
      } else showMessage('error', d.message || 'Failed to log waste.');
    } catch (e) { showMessage('error', 'An error occurred.'); }
  };

  const handleListCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recycling-centers/list-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(marketplaceForm.amount), price: parseFloat(marketplaceForm.price), source: centerData?.centerName })
      });
      const d = await res.json();
      if (res.ok) {
        showMessage('success', `Listed ${marketplaceForm.amount} credits at ৳${marketplaceForm.price} in marketplace!`);
        setMarketplaceForm({ amount: '', price: '' });
        fetchAll();
      } else showMessage('error', d.message || 'Failed to list credits.');
    } catch (e) { showMessage('error', 'An error occurred.'); }
  };

  const handleUpdateCenterLocation = () => {
    if (!navigator.geolocation) return showMessage('error', 'Geolocation not supported by this browser.');
    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch('/api/recycling-centers/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } })
        });
        const d = await res.json();
        if (res.ok) { showMessage('success', `Location updated to ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); fetchAll(); }
        else showMessage('error', d.message || 'Failed to update location.');
      } catch (e) { showMessage('error', 'An error occurred.'); }
      finally { setUpdatingLocation(false); }
    }, () => { showMessage('error', 'Location access denied.'); setUpdatingLocation(false); });
  };

  const handleAwardBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recycling-centers/award-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ businessId: badgeForm.businessId, badgeName: badgeForm.badgeName })
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message || 'Badge awarded!'); setBadgeForm({ businessId: '', badgeName: '' }); fetchAll(); }
      else showMessage('error', d.message || 'Failed to award badge.');
    } catch (e) { showMessage('error', 'An error occurred.'); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500">Loading...</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'requests', label: `Live Requests (${pendingPickups.length})`, icon: Truck },
    { id: 'log', label: 'Log Waste', icon: Scale },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'badges', label: 'Award Badges', icon: Award },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{centerData?.centerName}</h1>
          <p className="text-zinc-400">Recycling Center Dashboard • {centerData?.address}</p>
        </div>
        <div className="flex items-center gap-3">
          {centerData?.isApproved ? (
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />Verified
            </div>
          ) : (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm font-bold text-amber-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />Pending Verification
            </div>
          )}
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-bold text-emerald-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {centerData?.carbonCreditsBalance || 0} Credits Balance
          </div>
          <button
            onClick={handleUpdateCenterLocation}
            disabled={updatingLocation}
            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm font-bold text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <MapPin className="w-4 h-4" />
            {updatingLocation ? 'Updating...' : centerData?.location?.lat ? 'Update Location' : 'Set My Location'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Scale className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Total Processed</div>
              <div className="text-2xl font-bold">{centerData?.totalWasteProcessed?.toFixed(1) || 0} kg</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Leaf className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">CO₂ Reduced</div>
              <div className="text-2xl font-bold">{centerData?.totalCarbonReduced?.toFixed(1) || 0} kg</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
              <Zap className="text-amber-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Carbon Credits</div>
              <div className="text-2xl font-bold text-amber-400">{centerData?.carbonCreditsBalance || 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <Truck className="text-purple-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">My Pickups</div>
              <div className="text-2xl font-bold">{myPickups.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-8 border-b border-white/5 pb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Waste Log History
              </h3>
              <div className="space-y-3">
                {wasteLogs.length === 0 ? (
                  <p className="text-zinc-500">No waste logged yet. Use the Log Waste tab.</p>
                ) : wasteLogs.slice(0, 6).map((log: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Package className="text-emerald-500 w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold capitalize">{log.category}</div>
                        <div className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{log.weight} kg</div>
                      <div className="text-xs text-amber-400">+{log.carbonCreditsEarned} credits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {centerData?.badges?.length > 0 && (
                <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Center Badges
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {centerData.badges.map((b: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-sm font-bold">{b}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-500" />
                  My Accepted Pickups
                </h3>
                {myPickups.length === 0 ? <p className="text-zinc-500 text-sm">No accepted pickups yet.</p> : (
                  <div className="space-y-3">
                    {myPickups.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-sm font-bold capitalize">{p.wasteType} • {p.estimatedWeight}kg</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          p.status === 'accepted_by_collector' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>{p.status.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LIVE REQUESTS */}
        {activeTab === 'requests' && (
          <div>
            {!centerData?.isApproved && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3 mb-6">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-400 mb-1">Verification Required</div>
                  <div className="text-sm text-zinc-400">Your center must be verified by an admin before you can accept pickup requests.</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-zinc-400 text-sm">Live feed of user pickup requests — refreshes every 6 seconds. Accept to route the pickup through your center.</p>
            </div>
            {pendingPickups.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">No pending requests right now. Check back soon.</div>
            ) : (
              <div className="space-y-4">
                {pendingPickups.map((pickup: any) => (
                  <div key={pickup._id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-emerald-500/20 transition-all">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Truck className="text-emerald-500 w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl font-bold capitalize">{pickup.wasteType} Waste</span>
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase rounded tracking-widest">Pending</span>
                        </div>
                        <div className="text-sm text-zinc-500">
                          User: {pickup.userId?.name || 'Unknown'} • Est. {pickup.estimatedWeight}kg • {pickup.pickupDate ? new Date(pickup.pickupDate).toLocaleDateString() : 'ASAP'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptPickup(pickup._id)}
                      disabled={!centerData?.isApproved}
                      className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Accept Request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOG WASTE */}
        {activeTab === 'log' && (
          <div className="space-y-6">
            {!centerData?.isApproved && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-400 mb-1">Verification Required</div>
                  <div className="text-sm text-zinc-400">Your center needs to be verified by an admin before you can log waste or earn carbon credits.</div>
                </div>
              </div>
            )}

            {/* Available waste summary */}
            {Object.keys(availableWaste).length > 0 && (
              <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Available to Log (Delivered by Collectors)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(availableWaste).map(([type, kg]) => (
                    <div key={type} className="bg-black/30 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 capitalize">{type === 'ewaste' ? 'E-Waste' : type}</span>
                      <span className="text-lg font-bold">{kg} kg</span>
                      <span className="text-xs text-amber-400">{CREDIT_RATES[type] ?? 0.5} credits/kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(availableWaste).length === 0 && centerData?.isApproved && (
              <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl text-zinc-500 text-sm">
                No delivered waste available to log yet. Available waste appears here once collectors complete deliveries to your center.
              </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-2">Log Processed Waste</h3>
              <p className="text-zinc-400 text-sm mb-6">Different waste types earn different carbon credits based on recycling value.</p>
              <form onSubmit={handleLogWaste} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Waste Type</label>
                  <select
                    value={logForm.category}
                    onChange={e => setLogForm({ ...logForm, category: e.target.value, weight: '' })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="plastic">Plastic — {CREDIT_RATES.plastic} credits/kg</option>
                    <option value="paper">Paper — {CREDIT_RATES.paper} credits/kg</option>
                    <option value="metal">Metal — {CREDIT_RATES.metal} credits/kg</option>
                    <option value="glass">Glass — {CREDIT_RATES.glass} credits/kg</option>
                    <option value="organic">Organic — {CREDIT_RATES.organic} credits/kg</option>
                    <option value="ewaste">E-Waste — {CREDIT_RATES.ewaste} credits/kg</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Weight (kg)
                    {availableWaste[logForm.category] !== undefined && (
                      <span className="ml-2 text-emerald-400">— {availableWaste[logForm.category]} kg available</span>
                    )}
                  </label>
                  <input
                    type="number" step="0.1" required
                    min="0.1"
                    max={availableWaste[logForm.category] ?? undefined}
                    value={logForm.weight}
                    onChange={e => setLogForm({ ...logForm, weight: e.target.value })}
                    placeholder={availableWaste[logForm.category] ? `Max ${availableWaste[logForm.category]} kg` : 'Enter weight in kg'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="text-amber-400 text-sm font-medium">
                    You will earn: <strong>{logForm.weight ? Math.ceil((parseFloat(logForm.weight) || 0) * (CREDIT_RATES[logForm.category] ?? 0.5)) : 0} carbon credits</strong>
                    <span className="text-zinc-500 ml-2">({CREDIT_RATES[logForm.category] ?? 0.5}/kg for {logForm.category === 'ewaste' ? 'e-waste' : logForm.category})</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!centerData?.isApproved}
                  className="w-full bg-emerald-500 text-black py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  Log Waste Entry
                </button>
              </form>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-500" />
                Recent Logs
              </h3>
              {wasteLogs.length === 0 ? <p className="text-zinc-500">No logs yet.</p> : (
                <div className="space-y-3">
                  {wasteLogs.map((log: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold capitalize">{log.category}</div>
                        <div className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{log.weight} kg</div>
                        <div className="text-xs text-amber-400 font-bold">+{log.carbonCreditsEarned} credits</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-2">List Credits for Sale</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Current balance: <span className="text-amber-400 font-bold">{centerData?.carbonCreditsBalance || 0} credits</span>. Set your own price per listing.
              </p>
              <form onSubmit={handleListCredits} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Amount of Credits</label>
                  <input
                    type="number" min="1" required
                    value={marketplaceForm.amount}
                    onChange={e => setMarketplaceForm({ ...marketplaceForm, amount: e.target.value })}
                    placeholder="e.g. 10"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Price (৳ BDT)</label>
                  <input
                    type="number" min="1" required
                    value={marketplaceForm.price}
                    onChange={e => setMarketplaceForm({ ...marketplaceForm, price: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <button type="submit" className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  List in Marketplace
                </button>
              </form>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                Active Listings
              </h3>
              {availableCredits.filter((c: any) => c.centerId?._id === centerData?._id || c.source === centerData?.centerName).length === 0 ? (
                <p className="text-zinc-500">No active listings. List some credits above.</p>
              ) : (
                <div className="space-y-3">
                  {availableCredits.filter((c: any) => c.source === centerData?.centerName).map((credit: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold">{credit.amount} Credits</div>
                        <div className="text-xs text-zinc-500">{new Date(credit.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-amber-400 font-bold">৳{credit.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AWARD BADGES */}
        {activeTab === 'badges' && (
          <div className="space-y-8">

          {/* Center Badge Progress */}
          {centerBadgeProgress.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Your Center Badges
              </h3>
              <p className="text-zinc-400 text-sm mb-6">These badges are <span className="text-emerald-400 font-medium">automatically awarded</span> based on completed pickups handled through your center by collectors.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {centerBadgeProgress.map((b: any) => {
                  const pct = Math.min(100, b.threshold > 0 ? Math.floor((b.current / b.threshold) * 100) : 0);
                  const wasteTypes = Object.entries(b.wasteBreakdown || {});
                  return (
                    <div key={b._id} className={`bg-zinc-900/50 border rounded-3xl p-6 flex flex-col gap-4 ${b.earned ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={b.iconURL} alt={b.badgeName} className="w-10 h-10 object-contain" onError={(e: any) => { e.target.style.display='none'; }} />
                          <div>
                            <div className="font-bold">{b.badgeName}</div>
                            <div className="text-xs text-zinc-500">{b.description}</div>
                          </div>
                        </div>
                        {b.earned && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 whitespace-nowrap">Earned</span>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                          <span>Progress</span>
                          <span className="font-bold text-white">{b.current} / {b.threshold}</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full">
                          <div className={`h-full rounded-full transition-all ${b.earned ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">{pct}% complete — {b.completedPickups} completed pickup{b.completedPickups !== 1 ? 's' : ''} via collectors</div>
                      </div>
                      {wasteTypes.length > 0 && (
                        <div className="bg-black/20 rounded-xl p-3">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Collected Waste Types ({b.wasteTypeCount} types)</div>
                          <div className="flex flex-wrap gap-2">
                            {wasteTypes.map(([type, kg]: [string, any]) => (
                              <span key={type} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold capitalize">{type}: {kg.toFixed(1)}kg</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
            <h3 className="text-xl font-bold mb-2">Award Badge to Business</h3>
            <p className="text-zinc-400 text-sm mb-6">Recognize businesses that are eco-friendly partners of your recycling center.</p>
            <form onSubmit={handleAwardBadge} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Select Business</label>
                <select
                  required
                  value={badgeForm.businessId}
                  onChange={e => setBadgeForm({ ...badgeForm, businessId: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">-- Select a business --</option>
                  {businesses.map((b: any) => (
                    <option key={b._id} value={b._id}>{b.companyName} ({b.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Select Badge</label>
                <select
                  required
                  value={badgeForm.badgeName}
                  onChange={e => setBadgeForm({ ...badgeForm, badgeName: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">-- Select a badge --</option>
                  {badgeOptions.map((b: any, i: number) => (
                    <option key={i} value={b.badgeName}>{b.badgeName} — {b.description}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-purple-500 text-white py-4 rounded-xl font-bold hover:bg-purple-400 transition-all flex items-center justify-center gap-2">
                <Award className="w-5 h-5" />
                Award Badge
              </button>
            </form>

            {/* Show businesses with badges */}
            {businesses.filter((b: any) => b.badges?.length > 0).length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <h4 className="text-lg font-bold mb-4">Businesses with Badges</h4>
                <div className="space-y-3">
                  {businesses.filter((b: any) => b.badges?.length > 0).map((b: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
                      <span className="font-bold">{b.companyName}</span>
                      <div className="flex flex-wrap gap-1">
                        {b.badges.map((badge: string, j: number) => (
                          <span key={j} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold">{badge}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
