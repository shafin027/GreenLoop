import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Truck, MapPin, CheckCircle2, AlertCircle, BarChart3, Clock, Package, Camera, Award, Star, TrendingUp, DollarSign, Zap, Navigation, Map, X, Radio, RadioTower } from 'lucide-react';
import { PickupMap } from './PickupMap';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const CollectorDashboard: React.FC = () => {
  const { token } = useAuth();
  const [assignedPickups, setAssignedPickups] = useState<any[]>([]);
  const [availablePickups, setAvailablePickups] = useState<any[]>([]);
  const [historyPickups, setHistoryPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'available' | 'history'>('assigned');
  const [mapPickupId, setMapPickupId] = useState<string | null>(null);
  const [collectorData, setCollectorData] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [completingPickup, setCompletingPickup] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string>('');
  const [actualWeight, setActualWeight] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [collectorLocation, setCollectorLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchAll = () => {
    fetchCollectorProfile();
    fetchAssignedPickups();
    fetchAvailablePickups();
    fetchEarningsChart();
    fetchHistory();
  };

  const fetchCollectorProfile = async () => {
    try {
      const res = await fetch('/api/collectors/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCollectorData(data);
    } catch (err) { console.error(err); }
  };

  const fetchAssignedPickups = async () => {
    try {
      const res = await fetch('/api/collectors/assigned-pickups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAssignedPickups(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchAvailablePickups = async () => {
    try {
      const res = await fetch('/api/collectors/available-pickups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAvailablePickups(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/collectors/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHistoryPickups(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchEarningsChart = async () => {
    try {
      const res = await fetch('/api/collectors/earnings-chart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEarningsData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const pushLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch('/api/collectors/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lat, lng }),
      });
    } catch (err) { console.error(err); }
  }, [token]);

  const startSharingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation not supported by your browser.' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    setSharingLocation(true);
    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setCollectorLocation({ lat, lng });
      pushLocation(lat, lng);
    };
    const onError = () => {
      setMessage({ type: 'error', text: 'Could not get your location. Please allow location access.' });
      setTimeout(() => setMessage(null), 4000);
      setSharingLocation(false);
    };
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, { enableHighAccuracy: true, maximumAge: 5000 });
    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true });
    }, 10000);
  }, [pushLocation]);

  const stopSharingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setSharingLocation(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSharingLocation();
    };
  }, [stopSharingLocation]);

  const claimPickup = async (pickupId: string) => {
    try {
      const res = await fetch(`/api/collectors/pickup/assign/${pickupId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pickup claimed successfully!' });
        fetchAssignedPickups();
        fetchAvailablePickups();
        setActiveTab('assigned');
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || 'Failed to claim pickup' });
      }
    } catch (err) { console.error(err); }
    setTimeout(() => setMessage(null), 4000);
  };

  const updateStatus = async (pickupId: string, status: string) => {
    try {
      const res = await fetch(`/api/collectors/pickup/update-status/${pickupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Status updated to ${status}` });
        fetchAssignedPickups();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message });
      }
    } catch (err) { console.error(err); }
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCompletePickup = async (pickupId: string) => {
    if (!photoData) {
      setMessage({ type: 'error', text: 'Please upload a completion photo before completing the pickup.' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    try {
      const res = await fetch(`/api/collectors/pickup/update-status/${pickupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'completed', actualWeight: parseFloat(actualWeight) || undefined, completionPhoto: photoData }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Pickup completed! Earned delivery charge. ${d.bonusEarned ? `Bonus: +৳${d.bonusEarned}` : ''}` });
        setCompletingPickup(null);
        setPhotoData('');
        setActualWeight('');
        fetchAll();
      } else {
        setMessage({ type: 'error', text: d.message });
      }
    } catch (err) { console.error(err); }
    setTimeout(() => setMessage(null), 5000);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const weeklyMilestones = [
    { pickups: 5, bonus: 50 },
    { pickups: 10, bonus: 150 },
    { pickups: 20, bonus: 400 },
  ];

  const weeklyPickups = collectorData?.weeklyPickups || 0;
  const nextMilestone = weeklyMilestones.find(m => m.pickups > weeklyPickups);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Collector Dashboard</h1>
          <p className="text-zinc-500">Manage your pickups, track earnings and milestones.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          {collectorData?.verified && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">
              <Award className="w-4 h-4" />
              Verified Collector
            </div>
          )}
          <button
            onClick={sharingLocation ? stopSharingLocation : startSharingLocation}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              sharingLocation
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 animate-pulse'
                : 'bg-zinc-800 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <RadioTower className="w-4 h-4" />
            {sharingLocation ? 'Sharing Live Location…' : 'Share My Location'}
          </button>
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'assigned' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Assigned ({assignedPickups.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'available' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Available ({availablePickups.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              History ({historyPickups.length})
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Package className="text-emerald-500 w-5 h-5" />
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Total Collected</div>
          </div>
          <div className="text-3xl font-bold">{collectorData?.totalWeightCollected?.toFixed(1) || 0} kg</div>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Pickups Done</div>
          </div>
          <div className="text-3xl font-bold">{collectorData?.totalPickups || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-amber-500 w-5 h-5" />
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Total Earnings</div>
          </div>
          <div className="text-3xl font-bold text-amber-400">৳{collectorData?.totalEarnings || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Star className="text-purple-500 w-5 h-5" />
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Performance</div>
          </div>
          <div className="text-3xl font-bold">{collectorData?.performanceRating?.toFixed(1) || '5.0'}/5.0</div>
        </div>
      </div>

      {/* Earnings Chart + Weekly Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Earnings Chart */}
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Weekly Earnings
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <XAxis dataKey="day" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} name="Earnings (৳)" />
                <Bar dataKey="bonus" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Bonus (৳)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">৳{collectorData?.weeklyEarnings || 0}</div>
              <div className="text-xs text-zinc-500">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">৳{collectorData?.weeklyBonusEarned || 0}</div>
              <div className="text-xs text-zinc-500">Bonus Earned</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{collectorData?.weeklyPickups || 0}</div>
              <div className="text-xs text-zinc-500">Weekly Pickups</div>
            </div>
          </div>
        </div>

        {/* Weekly Milestones */}
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Weekly Milestones
          </h3>
          <div className="space-y-4">
            {weeklyMilestones.map((m) => {
              const done = weeklyPickups >= m.pickups;
              const pct = Math.min(100, (weeklyPickups / m.pickups) * 100);
              return (
                <div key={m.pickups} className={`p-4 rounded-2xl border ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-black/20'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-zinc-500" />}
                      <span className="text-sm font-bold">{m.pickups} Pickups/Week</span>
                    </div>
                    <span className={`text-sm font-bold ${done ? 'text-emerald-400' : 'text-amber-400'}`}>+৳{m.bonus} Bonus</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full">
                    <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{weeklyPickups}/{m.pickups} this week</div>
                </div>
              );
            })}
          </div>
          {collectorData?.badges?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">Badges Earned</div>
              <div className="flex flex-wrap gap-2">
                {collectorData.badges.map((b: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion modal */}
      {completingPickup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md"
          >
            <h3 className="text-xl font-bold mb-6">Complete Pickup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Actual Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualWeight}
                  onChange={e => setActualWeight(e.target.value)}
                  placeholder="Enter actual weight"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Completion Photo <span className="text-red-400">*Required</span>
                </label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all ${photoData ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}
                >
                  {photoData ? (
                    <div>
                      <img src={photoData} alt="Proof" className="max-h-40 mx-auto rounded-lg mb-2 object-cover" />
                      <span className="text-emerald-400 text-sm font-medium">Photo uploaded ✓</span>
                    </div>
                  ) : (
                    <div className="text-zinc-500">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm">Click to upload photo proof</span>
                    </div>
                  )}
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setCompletingPickup(null); setPhotoData(''); setActualWeight(''); }}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCompletePickup(completingPickup)}
                  className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold hover:bg-emerald-400 transition-all"
                >
                  Complete Pickup
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pickups List */}
      <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">
            {activeTab === 'assigned' ? 'Your Assigned Pickups' : activeTab === 'available' ? 'Available Pickups (Accepted by Centers)' : 'Pickup History'}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {activeTab === 'available' ? 'These pickups have been accepted by a recycling center. Claim one to get started.' :
             activeTab === 'history' ? 'All your completed and failed pickups.' : 'Manage your active pickups.'}
          </p>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-12 text-center text-zinc-500">Loading pickups...</div>
          ) : activeTab === 'assigned' ? (
            assignedPickups.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No pickups assigned. Check the Available tab to claim one.</div>
            ) : (
              assignedPickups.map((pickup) => {
                const userLat = pickup.userId?.location?.lat;
                const userLng = pickup.userId?.location?.lng;
                const centerLat = pickup.centerId?.location?.lat;
                const centerLng = pickup.centerId?.location?.lng;
                const hasUserLoc = userLat && userLng;
                const hasCenterLoc = centerLat && centerLng;
                const isMapOpen = mapPickupId === pickup._id;
                const mapMarkers = [
                  ...(hasUserLoc ? [{ lat: userLat, lng: userLng, label: `${pickup.userId?.name || 'User'} (Pickup)`, color: 'green' as const, popup: `🏠 ${pickup.userId?.name || 'User'}<br/>Pickup Location` }] : []),
                  ...(hasCenterLoc ? [{ lat: centerLat, lng: centerLng, label: pickup.centerId?.centerName || 'Center', color: 'orange' as const, popup: `♻️ ${pickup.centerId?.centerName || 'Recycling Center'}` }] : []),
                ];
                const hasAnyLoc = mapMarkers.length > 0 || !!collectorLocation;
                return (
                  <div key={pickup._id} className="border-b border-white/5 last:border-b-0">
                    <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-6">
                        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Truck className="text-emerald-500 w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl font-bold capitalize">{pickup.wasteType} Waste</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                              pickup.status === 'accepted_by_collector' ? 'bg-amber-500/10 text-amber-400' :
                              pickup.status === 'on-the-way' ? 'bg-blue-500/10 text-blue-400' :
                              pickup.status === 'arrived' ? 'bg-purple-500/10 text-purple-400' :
                              'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {pickup.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{pickup.userId?.name || 'User'}</span>
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{pickup.pickupDate ? new Date(pickup.pickupDate).toLocaleDateString() : 'ASAP'}</span>
                            {pickup.centerId && <span className="text-emerald-400 text-xs font-medium">→ {pickup.centerId?.centerName}</span>}
                          </div>
                          {/* Navigation buttons */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {hasUserLoc && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${userLat},${userLng}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all"
                              >
                                <Navigation className="w-3.5 h-3.5" /> Navigate to User
                              </a>
                            )}
                            {hasCenterLoc && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${centerLat},${centerLng}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl hover:bg-orange-500/20 transition-all"
                              >
                                <Navigation className="w-3.5 h-3.5" /> Navigate to Center
                              </a>
                            )}
                            {hasAnyLoc && (
                              <button
                                onClick={() => setMapPickupId(isMapOpen ? null : pickup._id)}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all"
                              >
                                <Map className="w-3.5 h-3.5" /> {isMapOpen ? 'Hide Map' : 'View Route Map'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="px-6 py-2 bg-black rounded-xl border border-white/5">
                          <div className="text-xs text-zinc-500 uppercase font-bold">Est. Weight</div>
                          <div className="font-bold">{pickup.estimatedWeight} kg</div>
                        </div>
                        {pickup.deliveryCharge > 0 && (
                          <div className="px-6 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <div className="text-xs text-amber-500 uppercase font-bold">Est. Pay</div>
                            <div className="font-bold text-amber-400">৳{pickup.deliveryCharge}</div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {pickup.status === 'accepted_by_collector' && (
                            <button onClick={() => updateStatus(pickup._id, 'on-the-way')} className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all">
                              Start Trip
                            </button>
                          )}
                          {pickup.status === 'on-the-way' && (
                            <button onClick={() => updateStatus(pickup._id, 'arrived')} className="bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-400 transition-all">
                              Arrived
                            </button>
                          )}
                          {pickup.status === 'arrived' && (
                            <button onClick={() => setCompletingPickup(pickup._id)} className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" /> Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Route Map */}
                    {isMapOpen && hasAnyLoc && (
                      <div className="px-8 pb-6">
                        <div className="rounded-2xl overflow-hidden border border-white/10">
                          <div className="bg-zinc-800/60 px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                              <Map className="w-3.5 h-3.5" />
                              {collectorLocation ? 'Live Route: Collector → User → Center' : 'Route: User → Recycling Center'}
                            </span>
                            <div className="flex items-center gap-2">
                              {sharingLocation && (
                                <span className="flex items-center gap-1 text-xs text-blue-400 font-bold">
                                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block"></span> Live
                                </span>
                              )}
                              <button onClick={() => setMapPickupId(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <PickupMap
                            markers={mapMarkers}
                            drawLine={mapMarkers.length >= 2}
                            className="w-full h-72"
                            zoom={12}
                            collectorLocation={collectorLocation}
                          />
                          <div className="bg-zinc-800/40 px-4 py-2 flex flex-wrap gap-4 text-xs text-zinc-500">
                            {hasUserLoc && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> User pickup</span>}
                            {hasCenterLoc && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Recycling center</span>}
                            {collectorLocation && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> You (live)</span>}
                            {!collectorLocation && <span className="flex items-center gap-1.5 text-blue-400 font-medium">Enable "Share My Location" to show your position on the map</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : activeTab === 'available' ? (
            availablePickups.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No available pickups yet. Recycling centers must accept a user request first.</div>
            ) : (
              availablePickups.map((pickup) => (
                <div key={pickup._id} className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-6">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Truck className="text-zinc-400 w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl font-bold capitalize">{pickup.wasteType} Waste</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400">Center Accepted</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{pickup.userId?.name || 'User'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{pickup.pickupDate ? new Date(pickup.pickupDate).toLocaleDateString() : 'ASAP'}</span>
                        {pickup.centerId && <span className="text-blue-400 text-xs font-medium">Center: {pickup.centerId?.centerName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="px-6 py-2 bg-black rounded-xl border border-white/5">
                      <div className="text-xs text-zinc-500 uppercase font-bold">Est. Weight</div>
                      <div className="font-bold">{pickup.estimatedWeight} kg</div>
                    </div>
                    <div className="px-6 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <div className="text-xs text-amber-500 uppercase font-bold">Delivery Pay</div>
                      <div className="font-bold text-amber-400">
                        ৳{pickup.deliveryCharge || 60}
                        {(pickup.deliveryCharge || 60) === 60 && <span className="text-xs text-amber-600 ml-1 font-normal">(base)</span>}
                      </div>
                    </div>
                    <button onClick={() => claimPickup(pickup._id)} className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all">
                      Claim Pickup
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            historyPickups.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No completed pickups yet. Your history will appear here.</div>
            ) : (
              historyPickups.map((pickup) => (
                <div key={pickup._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${pickup.status === 'completed' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      <Truck className={`w-6 h-6 ${pickup.status === 'completed' ? 'text-emerald-500' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold capitalize">{pickup.wasteType} Waste</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pickup.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {pickup.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pickup.userId?.name || 'User'}</span>
                        {pickup.centerId && <span className="text-emerald-400">→ {pickup.centerId?.centerName}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pickup.completedAt ? new Date(pickup.completedAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(pickup.updatedAt || pickup.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Actual Weight</div>
                      <div className="font-bold">{pickup.actualWeight || pickup.estimatedWeight} kg</div>
                    </div>
                    {pickup.deliveryCharge > 0 && (
                      <div className="px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-right">
                        <div className="text-xs text-amber-500 font-bold uppercase">Earned</div>
                        <div className="font-bold text-amber-400">৳{pickup.deliveryCharge}</div>
                      </div>
                    )}
                    {pickup.rating?.stars && (
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= pickup.rating.stars ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
