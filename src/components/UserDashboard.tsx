import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, History, Award, Recycle, Trash2, Plus, ArrowUpRight, BarChart3, Leaf, Gift, ShoppingBag, Zap, Heart, MessageCircle, Share2, Filter, Search, Star, User, MapPin, CheckCircle2, AlertCircle, Navigation, Map, X } from 'lucide-react';
import { BadgeDisplay } from './BadgeDisplay';
import { CommunityEvents } from './CommunityEvents';
import { PickupMap } from './PickupMap';
import { useAuth } from '../context/AuthContext';

export const UserDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [pickups, setPickups] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<any[]>([]);
  const [claimingBadge, setClaimingBadge] = useState<string | null>(null);
  const [badgeMsg, setBadgeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'community' | 'rewards'>('dashboard');
  const [posts, setPosts] = useState<any[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postFormData, setPostFormData] = useState({
    title: '',
    content: '',
    image: ''
  });
  const [formData, setFormData] = useState({
    wasteType: 'plastic',
    estimatedWeight: '',
    pickupDate: '',
  });
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [chargeEstimate, setChargeEstimate] = useState<{ charge: number; distanceKm: number; nearestCenter: { name: string } | null } | null>(null);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    location: { lat: 0, lng: 0 }
  });
  const [filterWasteType, setFilterWasteType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [redeemedHistory, setRedeemedHistory] = useState<any[]>([]);
  const [ratingPickupId, setRatingPickupId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingMsg, setRatingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    fetchPickups();
    fetchBadges();
    fetchBadgeProgress();
    fetchUserData();
    fetchPosts();
    fetchRedeemedHistory();
  }, [token]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUserData(data);
      setProfileForm({
        name: data.name || '',
        phone: data.phone || '',
        location: data.location || { lat: 0, lng: 0 }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRedeemedHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/me/redeemed-rewards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRedeemedHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/badges');
      const data = await res.json();
      setBadges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBadgeProgress = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/me/badge-progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBadgeProgress(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimBadge = async (badgeName: string) => {
    setClaimingBadge(badgeName);
    setBadgeMsg(null);
    try {
      const res = await fetch('/api/users/me/claim-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ badgeName })
      });
      const data = await res.json();
      if (res.ok) {
        setBadgeMsg({ type: 'success', text: data.message });
        fetchBadgeProgress();
        fetchUserData();
      } else {
        setBadgeMsg({ type: 'error', text: data.message });
      }
    } catch (err) {
      setBadgeMsg({ type: 'error', text: 'An error occurred.' });
    } finally {
      setClaimingBadge(null);
      setTimeout(() => setBadgeMsg(null), 5000);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/community/posts');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPickups = async () => {
    try {
      const res = await fetch('/api/users/me/pickups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPickups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: postFormData.title,
          content: postFormData.content,
          images: postFormData.image ? [postFormData.image] : []
        }),
      });
      if (res.ok) {
        setIsCreatingPost(false);
        setPostFormData({ title: '', content: '', image: '' });
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostFormData({ ...postFormData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData };
      if (pickupLocation) payload.location = pickupLocation;
      const res = await fetch('/api/pickups/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsScheduling(false);
        setPickupLocation(null);
        setChargeEstimate(null);
        setShowPickupMap(false);
        fetchPickups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/community/posts/like/${postId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRedeem = async (reward: { id: number; title: string; points: number }) => {
    if (redeemingId !== null) return;
    setRedeemingId(reward.id);
    setRedeemMsg(null);
    try {
      const res = await fetch('/api/users/me/redeem-reward', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id, rewardTitle: reward.title, pointsCost: reward.points })
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemMsg({ type: 'error', text: data.message || 'Redemption failed' });
      } else {
        setRedeemMsg({ type: 'success', text: data.message });
        setUserData((prev: any) => ({ ...prev, ecoPoints: data.ecoPoints }));
        fetchRedeemedHistory();
      }
    } catch (err) {
      setRedeemMsg({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setRedeemingId(null);
      setTimeout(() => setRedeemMsg(null), 4000);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        setIsEditingProfile(false);
        fetchUserData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickupLocation(loc);
        setDetectingLocation(false);
        fetchChargeEstimate(loc, parseFloat(formData.estimatedWeight) || 5);
      },
      () => setDetectingLocation(false),
      { timeout: 8000 }
    );
  };

  const fetchChargeEstimate = async (loc: { lat: number; lng: number }, weightKg: number) => {
    if (!token) return;
    try {
      const res = await fetch('/api/pickups/estimate-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lat: loc.lat, lng: loc.lng, weightKg }),
      });
      const data = await res.json();
      if (res.ok) setChargeEstimate(data);
    } catch { /* silent */ }
  };

  const handleRatePickup = async (pickupId: string) => {
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/pickups/${pickupId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ stars: ratingStars, review: ratingReview }),
      });
      const data = await res.json();
      if (res.ok) {
        setRatingMsg({ type: 'success', text: 'Thank you for your feedback!' });
        setRatingPickupId(null);
        setRatingStars(5);
        setRatingReview('');
        fetchPickups();
      } else {
        setRatingMsg({ type: 'error', text: data.message || 'Rating failed' });
      }
    } catch {
      setRatingMsg({ type: 'error', text: 'Something went wrong.' });
    } finally {
      setSubmittingRating(false);
      setTimeout(() => setRatingMsg(null), 4000);
    }
  };

  const filteredPickups = pickups.filter(pickup => {
    const matchesWasteType = filterWasteType === 'all' || pickup.wasteType === filterWasteType;
    const matchesStatus = filterStatus === 'all' || pickup.status === filterStatus;
    const pickupDate = new Date(pickup.pickupDate);
    const matchesStartDate = !startDate || pickupDate >= new Date(startDate);
    const matchesEndDate = !endDate || pickupDate <= new Date(endDate);
    return matchesWasteType && matchesStatus && matchesStartDate && matchesEndDate;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold">Welcome, {userData?.name || user?.name}</h1>
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              title="Edit Profile"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
          <p className="text-zinc-500">Track your impact and manage your waste pickups.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('community')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'community' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Community
            </button>
            <button 
              onClick={() => setActiveTab('rewards')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'rewards' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Rewards
            </button>
          </div>
          <button
            onClick={() => setIsScheduling(true)}
            className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            Schedule Pickup
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <Leaf className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="text-3xl font-bold mb-1">{userData?.ecoPoints || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Eco-Points</div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="text-3xl font-bold mb-1">{userData?.totalCO2Reduced?.toFixed(1) || 0} kg</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">CO₂ Reduced</div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <Award className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="text-3xl font-bold mb-1">{userData?.badges?.length || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Badges Earned</div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <History className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="text-3xl font-bold mb-1">{pickups.length}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Total Pickups</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Pickups */}
            <div className="lg:col-span-2">
              <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-500" />
                      <h2 className="text-xl font-bold">Recent Pickups</h2>
                    </div>
                    <button 
                      onClick={() => {
                        setFilterWasteType('all');
                        setFilterStatus('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                      <select 
                        value={filterWasteType}
                        onChange={(e) => setFilterWasteType(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl py-2 pl-8 pr-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-emerald-500 transition-all appearance-none"
                      >
                        <option value="all">All Types</option>
                        <option value="plastic">Plastic</option>
                        <option value="paper">Paper</option>
                        <option value="glass">Glass</option>
                        <option value="metal">Metal</option>
                        <option value="organic">Organic</option>
                        <option value="ewaste">E-Waste</option>
                      </select>
                    </div>
                    <div className="relative">
                      <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl py-2 pl-8 pr-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-emerald-500 transition-all appearance-none"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="on-the-way">On Way</option>
                        <option value="arrived">Arrived</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-2 px-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-emerald-500 transition-all"
                      placeholder="Start"
                    />
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-2 px-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-emerald-500 transition-all"
                      placeholder="End"
                    />
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {ratingMsg && (
                    <div className={`mx-6 mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${ratingMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {ratingMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      {ratingMsg.text}
                    </div>
                  )}
                  {filteredPickups.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                      {pickups.length === 0 ? "No pickups scheduled yet." : "No pickups match your filters."}
                    </div>
                  ) : (
                    filteredPickups.map((pickup) => (
                      <div key={pickup._id || pickup.id} className="p-6 hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-b-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                              <Trash2 className={`w-6 h-6 ${pickup.status === 'completed' ? 'text-emerald-500' : 'text-zinc-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold capitalize">{pickup.wasteType} Waste</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  pickup.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                  pickup.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                  pickup.status === 'on-the-way' ? 'bg-blue-500/10 text-blue-400' :
                                  pickup.status === 'arrived' ? 'bg-purple-500/10 text-purple-400' :
                                  'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {pickup.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-500 mb-2">
                                {pickup.pickupDate ? new Date(pickup.pickupDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Scheduled ASAP'}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                <span className="text-zinc-400"><span className="font-bold text-white">{pickup.actualWeight || pickup.estimatedWeight} kg</span> {pickup.actualWeight ? 'actual' : 'estimated'}</span>
                                {pickup.deliveryCharge > 0 && pickup.status !== 'pending' ? (
                                  <span className="text-amber-400 font-bold">৳{pickup.deliveryCharge} charge</span>
                                ) : pickup.status === 'pending' ? (
                                  <span className="text-zinc-500 text-xs">charge set when center accepts</span>
                                ) : null}
                                {pickup.ecoPointsEarned > 0 && (
                                  <span className="text-emerald-400 font-bold">+{pickup.ecoPointsEarned} eco-pts</span>
                                )}
                                {pickup.centerId && (
                                  <span className="text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{pickup.centerId.centerName}</span>
                                )}
                              </div>
                              {pickup.collectorId && (
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  <User className="w-3 h-3 text-zinc-500" />
                                  <span className="text-zinc-400">Collector: <span className="font-bold text-white">{pickup.collectorId.name}</span></span>
                                  {pickup.collectorId.performanceRating && (
                                    <span className="flex items-center gap-0.5 text-amber-400">
                                      <Star className="w-3 h-3 fill-amber-400" />
                                      {pickup.collectorId.performanceRating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Rating section */}
                          {pickup.status === 'completed' && pickup.collectorId && (
                            <div className="sm:text-right flex-shrink-0">
                              {pickup.rating?.stars ? (
                                <div className="flex items-center gap-1">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-4 h-4 ${s <= pickup.rating.stars ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                                  ))}
                                  <span className="text-xs text-zinc-500 ml-1">Rated</span>
                                </div>
                              ) : ratingPickupId === pickup._id ? (
                                <div className="bg-zinc-800 rounded-2xl p-4 w-64 text-left">
                                  <p className="text-xs font-bold text-zinc-300 mb-2">Rate your collector</p>
                                  <div className="flex gap-1 mb-3">
                                    {[1,2,3,4,5].map(s => (
                                      <button key={s} onClick={() => setRatingStars(s)}>
                                        <Star className={`w-6 h-6 transition-all ${s <= ratingStars ? 'text-amber-400 fill-amber-400' : 'text-zinc-600 hover:text-amber-300'}`} />
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    value={ratingReview}
                                    onChange={e => setRatingReview(e.target.value)}
                                    placeholder="Leave a review (optional)"
                                    rows={2}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none mb-3"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => setRatingPickupId(null)} className="flex-1 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg font-bold hover:bg-white/10 transition-all">Cancel</button>
                                    <button onClick={() => handleRatePickup(pickup._id)} disabled={submittingRating} className="flex-1 py-1.5 text-xs bg-emerald-500 text-black rounded-lg font-bold hover:bg-emerald-400 transition-all disabled:opacity-50">Submit</button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setRatingPickupId(pickup._id); setRatingStars(5); setRatingReview(''); }}
                                  className="flex items-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 transition-all"
                                >
                                  <Star className="w-3.5 h-3.5" /> Rate Collector
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {(userData?.badges?.length || 0) === 0 ? (
                <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="text-amber-400" /> Your Badges
                  </h3>
                  <div className="text-center py-8 text-zinc-500 text-sm">No badges earned yet. Complete pickups to earn your first badge!</div>
                </div>
              ) : (
                <BadgeDisplay badges={badges.filter(b => userData?.badges?.includes(b.badgeName))} />
              )}

              <div className="bg-emerald-500 p-6 rounded-3xl text-black">
                <h3 className="text-lg font-bold mb-2">Green Tip of the Day</h3>
                <p className="text-sm font-medium mb-4 opacity-80">Rinse your plastic containers before recycling to prevent contamination.</p>
                <button className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  Learn More <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'community' ? (
        <div className="space-y-12">
          <CommunityEvents />
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Community Stories</h2>
                <p className="text-zinc-500">Share your recycling journey and inspire others.</p>
              </div>
              <button 
                onClick={() => setIsCreatingPost(true)}
                className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-5 h-5" />
                Create Post
              </button>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {posts.map((post) => (
                  <div key={post._id || post.id} className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                    {post.images && post.images.length > 0 && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img 
                          src={post.images[0]} 
                          alt={post.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 font-bold text-xs">
                          {post.author?.name?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{post.author?.name}</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{post.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                    </div>
                    <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-emerald-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {post.likes} Likes
                      </button>
                      <button className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Read More</button>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <div className="col-span-full py-20 text-center text-zinc-500">
                    No community posts yet. Be the first to share!
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Award className="text-amber-400 w-5 h-5" />
                  Top Recyclers
                </h3>
                <div className="space-y-6">
                  {[
                    { name: 'Sarah Green', points: 12500, rank: 1 },
                    { name: 'Michael Eco', points: 10200, rank: 2 },
                    { name: 'Emma Waste', points: 9800, rank: 3 },
                    { name: 'David Clean', points: 8500, rank: 4 },
                    { name: 'Lisa Earth', points: 7200, rank: 5 },
                  ].map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-amber-400 text-black' : 
                          idx === 1 ? 'bg-zinc-300 text-black' :
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 text-zinc-500'
                        }`}>
                          {user.rank}
                        </div>
                        <div className="font-bold text-sm">{user.name}</div>
                      </div>
                      <div className="text-emerald-500 font-bold text-sm">{user.points} pts</div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-8 py-3 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all">
                  View Full Leaderboard
                </button>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-4 text-emerald-500">Weekly Goal</h3>
                <p className="text-sm text-emerald-500/80 mb-6">Collect 50kg of plastic this week to earn a "Plastic Warrior" badge!</p>
                <div className="w-full bg-emerald-500/20 h-2 rounded-full mb-4">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '65%' }} />
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-500">
                  <span>32.5kg collected</span>
                  <span>65%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="space-y-12">

          {/* Badge Progress & Claim Section */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                  <Award className="text-amber-400 w-6 h-6" />
                  Claim Your Badges
                </h2>
                <p className="text-zinc-500 text-sm">Badges are earned based on your <span className="text-emerald-400 font-medium">completed pickups collected by a collector</span>. Progress only counts when a collector has finished the job.</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-5 py-2 rounded-2xl text-sm font-bold text-emerald-400">
                {userData?.badges?.length || 0} / {badgeProgress.length} Badges Earned
              </div>
            </div>

            {badgeMsg && (
              <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 ${
                badgeMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {badgeMsg.text}
              </div>
            )}

            {badgeProgress.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">Loading badge progress...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {badgeProgress.map((b) => {
                  const pct = Math.min(100, b.threshold > 0 ? Math.floor((b.current / b.threshold) * 100) : 0);
                  const wasteTypes = Object.entries(b.wasteBreakdown || {});
                  const criteriaType = b.criteria?.type || '';
                  const palette = criteriaType === 'pickupsCompleted'
                    ? { border: 'border-emerald-500/40', bg: 'bg-emerald-950/60', icon: 'bg-emerald-500/20', bar: 'bg-emerald-400', tag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'text-emerald-300' }
                    : criteriaType === 'co2Reduced'
                    ? { border: 'border-sky-500/40', bg: 'bg-sky-950/60', icon: 'bg-sky-500/20', bar: 'bg-sky-400', tag: 'bg-sky-500/20 text-sky-300 border-sky-500/30', label: 'text-sky-300' }
                    : criteriaType === 'ecoPoints'
                    ? { border: 'border-amber-500/40', bg: 'bg-amber-950/60', icon: 'bg-amber-500/20', bar: 'bg-amber-400', tag: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'text-amber-300' }
                    : { border: 'border-purple-500/40', bg: 'bg-purple-950/60', icon: 'bg-purple-500/20', bar: 'bg-purple-400', tag: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'text-purple-300' };

                  const earnedPalette = { border: 'border-emerald-400/60', bg: 'bg-emerald-950/80', icon: 'bg-emerald-400/20', bar: 'bg-emerald-400', tag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'text-emerald-300' };
                  const colors = b.earned ? earnedPalette : palette;
                  return (
                    <div key={b._id} className={`${colors.bg} border ${colors.border} rounded-3xl p-6 flex flex-col gap-4 transition-all hover:brightness-110`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                            <img src={b.iconURL} alt={b.badgeName} className="w-7 h-7 object-contain" onError={(e: any) => { e.target.style.display='none'; }} />
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${colors.label}`}>{b.badgeName}</div>
                            <div className="text-xs text-zinc-400">{b.description}</div>
                          </div>
                        </div>
                        {b.earned && (
                          <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/40 whitespace-nowrap">✓ Claimed</span>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                          <span className="capitalize">{criteriaType.replace(/([A-Z])/g, ' $1').trim() || 'Progress'}</span>
                          <span className={`font-bold ${colors.label}`}>{b.current} / {b.threshold}</span>
                        </div>
                        <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">{pct}% complete</div>
                      </div>

                      {wasteTypes.length > 0 && (
                        <div className="bg-black/20 rounded-xl p-3">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Collected Waste Types</div>
                          <div className="flex flex-wrap gap-1.5">
                            {wasteTypes.map(([type, kg]: [string, any]) => (
                              <span key={type} className={`px-2 py-0.5 ${colors.tag} border rounded-full text-[10px] font-bold capitalize`}>{type}: {kg.toFixed(1)}kg</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        disabled={b.earned || pct < 100 || claimingBadge === b.badgeName}
                        onClick={() => handleClaimBadge(b.badgeName)}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          b.earned
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 cursor-not-allowed'
                            : pct >= 100
                            ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                            : 'bg-black/20 text-zinc-500 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        {b.earned ? 'Badge Claimed' : pct >= 100 ? (claimingBadge === b.badgeName ? 'Claiming...' : 'Claim Badge') : `${pct}% — Keep Recycling!`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Eco-Rewards Shop */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-2">Eco-Rewards Shop</h2>
                <p className="text-zinc-500">Redeem your hard-earned eco-points for sustainable rewards.</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                <Zap className="text-emerald-500 w-5 h-5" />
                <span className="font-bold text-emerald-500">{userData?.ecoPoints || 0} Points Available</span>
              </div>
            </div>

            {redeemMsg && (
              <div className={`mb-6 px-6 py-4 rounded-2xl text-sm font-medium ${
                redeemMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {redeemMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { id: 1, title: 'Eco-Friendly Tote Bag', points: 500, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { id: 2, title: 'Sustainable Water Bottle', points: 1200, icon: Gift, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                { id: 3, title: 'Local Tree Planting', points: 2000, icon: Leaf, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { id: 4, title: 'Zero-Waste Starter Kit', points: 3500, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { id: 5, title: 'Solar Power Bank', points: 5000, icon: Gift, color: 'text-rose-400', bg: 'bg-rose-400/10' },
                { id: 6, title: 'Sustainable Fashion Voucher', points: 7500, icon: ShoppingBag, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
              ].map((reward) => {
                const canAfford = (userData?.ecoPoints || 0) >= reward.points;
                const isLoading = redeemingId === reward.id;
                return (
                  <motion.div
                    key={reward.id}
                    whileHover={{ y: -5 }}
                    className="bg-zinc-900 border border-white/5 p-8 rounded-3xl flex flex-col h-full"
                  >
                    <div className={`w-14 h-14 ${reward.bg} rounded-2xl flex items-center justify-center mb-6`}>
                      <reward.icon className={`${reward.color} w-7 h-7`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{reward.title}</h3>
                    <div className="text-zinc-500 text-sm mb-8 flex-grow">High-quality sustainable product to help you on your green journey.</div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="font-bold text-lg">{reward.points} pts</div>
                      <button
                        onClick={() => handleRedeem({ id: reward.id, title: reward.title, points: reward.points })}
                        disabled={!canAfford || isLoading || redeemingId !== null}
                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                          canAfford && redeemingId === null
                            ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? 'Redeeming…' : 'Redeem'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Redemption History */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-2">Redemption History</h2>
                <p className="text-zinc-500">A log of all rewards you've claimed so far.</p>
              </div>
              <div className="bg-zinc-900 border border-white/5 px-5 py-3 rounded-2xl text-sm font-bold text-zinc-400">
                {redeemedHistory.length} {redeemedHistory.length === 1 ? 'Redemption' : 'Redemptions'}
              </div>
            </div>

            {redeemedHistory.length === 0 ? (
              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-12 text-center">
                <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 text-lg font-medium">No redemptions yet</p>
                <p className="text-zinc-600 text-sm mt-2">Redeem rewards from the shop above and they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {redeemedHistory.map((item, idx) => {
                  const iconMap: Record<number, { color: string; bg: string }> = {
                    1: { color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    2: { color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    3: { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    4: { color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    5: { color: 'text-rose-400', bg: 'bg-rose-400/10' },
                    6: { color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                  };
                  const style = iconMap[item.rewardId] || { color: 'text-zinc-400', bg: 'bg-zinc-400/10' };
                  const date = new Date(item.redeemedAt);
                  const formatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-zinc-900 border border-white/5 rounded-2xl px-6 py-5 flex items-center gap-5"
                    >
                      <div className={`w-12 h-12 ${style.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Gift className={`${style.color} w-6 h-6`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base truncate">{item.rewardTitle}</div>
                        <div className="text-zinc-500 text-sm mt-0.5">{formatted} at {time}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-bold text-emerald-500">-{item.pointsCost} pts</div>
                        <div className="text-xs text-zinc-600 mt-0.5">Redeemed</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {isScheduling && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
          <div onClick={() => { setIsScheduling(false); setPickupLocation(null); setChargeEstimate(null); setShowPickupMap(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Schedule Pickup</h2>
              <button onClick={() => { setIsScheduling(false); setPickupLocation(null); setChargeEstimate(null); setShowPickupMap(false); }} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSchedule} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-2">Waste Type</label>
                  <select
                    className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-emerald-500 transition-all"
                    value={formData.wasteType}
                    onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}
                  >
                    <option value="plastic">Plastic</option>
                    <option value="paper">Paper</option>
                    <option value="glass">Glass</option>
                    <option value="metal">Metal</option>
                    <option value="organic">Organic</option>
                    <option value="ewaste">E-Waste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-2">Estimated Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-emerald-500 transition-all"
                    value={formData.estimatedWeight}
                    onChange={(e) => {
                      setFormData({ ...formData, estimatedWeight: e.target.value });
                      if (pickupLocation && e.target.value) {
                        fetchChargeEstimate(pickupLocation, parseFloat(e.target.value) || 5);
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Preferred Date</label>
                <input
                  type="date"
                  required
                  className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-emerald-500 transition-all"
                  value={formData.pickupDate}
                  onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                />
              </div>

              {/* Location Section */}
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Pickup Location
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detectingLocation}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4" />
                    {detectingLocation ? 'Detecting...' : 'Detect My Location'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPickupMap(!showPickupMap)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/20 transition-all"
                  >
                    <Map className="w-4 h-4" />
                    {showPickupMap ? 'Hide Map' : 'Pin on Map'}
                  </button>
                </div>
                {pickupLocation && (
                  <div className="text-xs text-zinc-400 bg-black/30 border border-white/5 px-3 py-2 rounded-xl mb-3">
                    📍 {pickupLocation.lat.toFixed(5)}, {pickupLocation.lng.toFixed(5)}
                    {chargeEstimate?.nearestCenter && <span className="text-emerald-400 ml-2">→ {chargeEstimate.nearestCenter.name}</span>}
                  </div>
                )}
                {showPickupMap && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 mb-3">
                    <PickupMap
                      mode="pick"
                      center={pickupLocation || { lat: 23.8103, lng: 90.4125 }}
                      zoom={13}
                      markers={pickupLocation ? [{ lat: pickupLocation.lat, lng: pickupLocation.lng, label: 'Your Location', color: 'red' }] : []}
                      className="w-full h-56"
                      onPick={(lat, lng) => {
                        const loc = { lat, lng };
                        setPickupLocation(loc);
                        fetchChargeEstimate(loc, parseFloat(formData.estimatedWeight) || 5);
                      }}
                    />
                    <div className="bg-zinc-800/60 px-4 py-2 text-xs text-zinc-400">
                      Tap anywhere on the map to pin your pickup location
                    </div>
                  </div>
                )}
              </div>

              {/* Charge Estimate */}
              {chargeEstimate && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-400">Estimated Delivery Charge</span>
                    <span className="text-2xl font-bold text-amber-400">৳{chargeEstimate.charge}</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {chargeEstimate.distanceKm > 0 ? `${chargeEstimate.distanceKm} km to nearest center` : 'Base rate'}
                    {formData.estimatedWeight && parseFloat(formData.estimatedWeight) > 5
                      ? ` · Weight surcharge for ${(parseFloat(formData.estimatedWeight) - 5).toFixed(1)}kg over limit`
                      : ''}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Final charge confirmed after pickup based on actual weight & distance</div>
                </div>
              )}
              {!chargeEstimate && !pickupLocation && (
                <div className="bg-zinc-800/40 border border-white/5 rounded-2xl p-3 text-xs text-zinc-500 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                  Share your location above to see an estimated delivery charge before scheduling.
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsScheduling(false); setPickupLocation(null); setChargeEstimate(null); setShowPickupMap(false); }}
                  className="flex-1 bg-white/5 py-4 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-black py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all"
                >
                  Schedule Pickup
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Create Post Modal */}
      {isCreatingPost && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div onClick={() => setIsCreatingPost(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Create Story</h2>
              <button onClick={() => setIsCreatingPost(false)} className="text-zinc-500 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Post Title</label>
                <input
                  type="text"
                  required
                  placeholder="Give your story a title..."
                  className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-emerald-500 transition-all"
                  value={postFormData.title}
                  onChange={(e) => setPostFormData({ ...postFormData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share your recycling experience or tips..."
                  className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-emerald-500 transition-all resize-none"
                  value={postFormData.content}
                  onChange={(e) => setPostFormData({ ...postFormData, content: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Image (Optional)</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className="w-full bg-black border border-dashed border-white/20 rounded-xl py-8 flex flex-col items-center justify-center hover:border-emerald-500/50 transition-all">
                      {postFormData.image ? (
                        <img src={postFormData.image} alt="Preview" className="w-full h-32 object-contain rounded-lg" />
                      ) : (
                        <>
                          <Share2 className="w-8 h-8 text-zinc-500 mb-2" />
                          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Upload Image</span>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                  {postFormData.image && (
                    <button 
                      type="button"
                      onClick={() => setPostFormData({ ...postFormData, image: '' })}
                      className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingPost(false)}
                  className="flex-1 bg-white/5 py-4 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-black py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all"
                >
                  Post Story
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div onClick={() => setIsEditingProfile(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-8"
          >
            <h2 className="text-3xl font-bold mb-6">Edit Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-emerald-500 transition-all"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-emerald-500 transition-all"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Home Location (for pickup charge estimates)</label>
                <button
                  type="button"
                  onClick={() => {
                    setDetectingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => { setProfileForm(f => ({ ...f, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } })); setDetectingLocation(false); },
                      () => setDetectingLocation(false)
                    );
                  }}
                  disabled={detectingLocation}
                  className="w-full border border-dashed border-white/20 rounded-xl py-3 px-4 text-sm font-medium text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {detectingLocation ? 'Detecting...' : profileForm.location.lat ? `📍 ${profileForm.location.lat.toFixed(4)}, ${profileForm.location.lng.toFixed(4)} — click to update` : '📍 Detect My Location'}
                </button>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 bg-white/5 py-4 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-black py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
