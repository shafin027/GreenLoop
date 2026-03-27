import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, CreditCard, Award, History, Zap, CheckCircle2, AlertCircle, TrendingUp, Globe, Leaf, ShoppingCart, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CarbonCredit {
  _id: string;
  amount: number;
  price: number;
  source: string;
  status: 'available' | 'sold';
}

export function BusinessDashboard() {
  const { token } = useAuth();
  const [businessData, setBusinessData] = useState<any>(null);
  const [availableCredits, setAvailableCredits] = useState<CarbonCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'marketplace' | 'badges'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState<{ lat: number | ''; lng: number | '' }>({ lat: '', lng: '' });

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchAll = () => {
    fetchBusinessData();
    fetchAvailableCredits();
    fetchBadges();
  };

  const fetchBusinessData = async () => {
    try {
      const res = await fetch('/api/businesses/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setBusinessData(data); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchAvailableCredits = async () => {
    try {
      const res = await fetch('/api/carbon-credits/available', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setAvailableCredits(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/badges');
      if (res.ok) { const data = await res.json(); setAllBadges(Array.isArray(data) ? data.filter((b: any) => b.targetRole === 'business') : []); }
    } catch (e) { console.error(e); }
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationForm({ lat: Math.round(position.coords.latitude * 10000) / 10000, lng: Math.round(position.coords.longitude * 10000) / 10000 });
          setDetectingLocation(false);
        },
        () => { setMessage({ type: 'error', text: 'Could not detect location. Please enable location access.' }); setDetectingLocation(false); }
      );
    } else {
      setMessage({ type: 'error', text: 'Geolocation is not supported by this browser.' });
      setDetectingLocation(false);
    }
  };

  const updateLocation = async () => {
    if (!locationForm.lat || !locationForm.lng) {
      setMessage({ type: 'error', text: 'Please enter valid latitude and longitude.' });
      return;
    }
    try {
      const res = await fetch('/api/businesses/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ location: { lat: locationForm.lat, lng: locationForm.lng } })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Location updated successfully!' });
        setBusinessData(data);
        setLocationForm({ lat: '', lng: '' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update location.' });
      }
    } catch (e) { setMessage({ type: 'error', text: 'An error occurred.' }); }
  };

  const handlePurchase = async (creditId: string) => {
    try {
      const res = await fetch('/api/businesses/carbon-credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ creditId })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Purchased ${data.amount} carbon credits!` });
        fetchAll();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to purchase credits.' });
      }
    } catch (e) { setMessage({ type: 'error', text: 'An error occurred.' }); }
    setTimeout(() => setMessage(null), 4000);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{businessData?.companyName}</h1>
          <p className="text-zinc-400">Business Sustainability Dashboard</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">
          <Globe className="w-4 h-4" />
          Verified Business
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Zap className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Carbon Credits</div>
              <div className="text-2xl font-bold">{businessData?.carbonCreditsPurchased || 0} units</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Leaf className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">CO₂ Offset</div>
              <div className="text-2xl font-bold">{((businessData?.carbonCreditsPurchased || 0) * 0.5).toFixed(1)} tons</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <Award className="text-purple-500 w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Badges Earned</div>
              <div className="text-2xl font-bold">{businessData?.badges?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/5 pb-4 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'marketplace', label: 'Credit Marketplace' },
          { id: 'badges', label: 'My Badges' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
          >
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

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Location Section */}
            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold">Business Location</h3>
              </div>
              {businessData?.location?.lat && businessData?.location?.lng && (
                <div className="mb-4 p-4 bg-white/5 rounded-2xl">
                  <p className="text-sm text-zinc-400">Current Location</p>
                  <p className="text-emerald-400 font-mono font-bold">{businessData.location.lat.toFixed(4)}, {businessData.location.lng.toFixed(4)}</p>
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <button onClick={detectLocation} disabled={detectingLocation} className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-40">
                  {detectingLocation ? '...' : '📍 Detect My Location'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="number" step="0.0001" placeholder="Latitude" value={locationForm.lat} onChange={(e) => setLocationForm({ ...locationForm, lat: e.target.value ? parseFloat(e.target.value) : '' })} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500" />
                <input type="number" step="0.0001" placeholder="Longitude" value={locationForm.lng} onChange={(e) => setLocationForm({ ...locationForm, lng: e.target.value ? parseFloat(e.target.value) : '' })} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500" />
              </div>
              <button onClick={updateLocation} className="w-full bg-emerald-500 text-black py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all">Save Location</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Sustainability Impact
                  </h3>
                </div>
                <div className="space-y-6">
                  {[
                    { label: 'Energy Efficiency', value: 85, color: 'bg-emerald-500' },
                    { label: 'Waste Reduction', value: 72, color: 'bg-blue-500' },
                    { label: 'Carbon Offsetting', value: Math.min(100, (businessData?.carbonCreditsPurchased || 0)), color: 'bg-purple-500' },
                    { label: 'Supply Chain', value: 65, color: 'bg-amber-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">{item.label}</span>
                        <span className="font-bold">{item.value}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-500 p-8 rounded-3xl text-black">
                <h3 className="text-2xl font-bold mb-4">Carbon Neutral Goal</h3>
                <p className="font-medium mb-8 opacity-80">You are {Math.min(100, businessData?.carbonCreditsPurchased || 0)}% of the way to your carbon offset goal.</p>
                <div className="w-full bg-black/10 h-3 rounded-full mb-4">
                  <div className="bg-black h-full rounded-full" style={{ width: `${Math.min(100, businessData?.carbonCreditsPurchased || 0)}%` }} />
                </div>
                <div className="flex justify-between text-sm font-bold mb-8">
                  <span>{businessData?.carbonCreditsPurchased || 0} credits purchased</span>
                  <span>100 goal</span>
                </div>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" /> Buy Credits
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCredits.map(credit => (
              <div key={credit._id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl hover:border-emerald-500/30 transition-all group">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="text-emerald-500 w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-500 uppercase tracking-widest font-medium">Price</div>
                    <div className="text-xl font-bold text-emerald-500">৳{credit.price}</div>
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-2">{credit.amount} Carbon Credits</h4>
                <p className="text-sm text-zinc-400 mb-6">Source: {credit.source}</p>
                <button
                  onClick={() => handlePurchase(credit._id)}
                  className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-bold hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Purchase Now
                </button>
              </div>
            ))}
            {availableCredits.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500">No carbon credits available in the marketplace right now.</div>
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div>
            <p className="text-zinc-400 mb-6">Badges are awarded to your business by recycling centers you partner with.</p>
            {businessData?.badges?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessData.badges.map((badgeName: string, i: number) => {
                  const badgeInfo = allBadges.find(b => b.badgeName === badgeName);
                  return (
                    <div key={i} className="bg-zinc-900/50 border border-amber-500/20 p-8 rounded-3xl text-center">
                      <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        {badgeInfo?.iconURL ? (
                          <img src={badgeInfo.iconURL} alt={badgeName} className="w-10 h-10 object-contain" />
                        ) : (
                          <Award className="text-amber-400 w-10 h-10" />
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-amber-400 mb-2">{badgeName}</h4>
                      {badgeInfo?.description && <p className="text-sm text-zinc-400">{badgeInfo.description}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No badges yet.</p>
                <p className="text-sm mt-1">Partner with recycling centers to earn recognition badges.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
