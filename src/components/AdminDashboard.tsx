import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, AlertTriangle, Users, BarChart3, TrendingUp, Recycle, Leaf, MessageSquare, Map as MapIcon, Award, Search, CheckCircle2, XCircle, Plus, Calendar, Image, Truck, Trash2, Pencil, Eye, EyeOff, FileText, X, Ban, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sustainability' | 'fraud' | 'collectors' | 'centers' | 'users' | 'businesses' | 'events' | 'posts' | 'badges'>('overview');
  const [verifyingCenter, setVerifyingCenter] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [sustainabilityData, setSustainabilityData] = useState<any[]>([]);
  const [fraudData, setFraudData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [badgeOptions, setBadgeOptions] = useState<any[]>([]);
  const [resolvingFraud, setResolvingFraud] = useState<string | null>(null);
  const [fraudFilter, setFraudFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [calculatingScore, setCalculatingScore] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Events management
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editEventForm, setEditEventForm] = useState({ title: '', description: '', date: '', location: '', offerings: '', imageURL: '' });

  // Posts management
  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Event form
  const [eventForm, setEventForm] = useState({
    title: '', description: '', date: '', location: '', offerings: '', imageURL: ''
  });
  const [eventImage, setEventImage] = useState<string>('');

  // Badge form
  const [badgeForm, setBadgeForm] = useState({ targetType: 'center', targetId: '', badgeName: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'posts') fetchAdminPosts();
    if (activeTab === 'events') fetchAdminEvents();
  }, [activeTab]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchAll = () => {
    fetchStats();
    fetchSustainabilityScores();
    fetchFraudDetection();
    fetchHeatmapData();
    fetchCollectors();
    fetchCenters();
    fetchBusinesses();
    fetchBadges();
    fetchAdminEvents();
    fetchAdminPosts();
    fetchAllUsers();
    fetchAllBusinesses();
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAllBusinesses = async () => {
    try {
      const res = await fetch('/api/admin/businesses', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAllBusinesses(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const handleBan = async (role: string, id: string, banned: boolean, refetch: () => void) => {
    setActionInProgress(`ban-${id}`);
    try {
      const res = await fetch(`/api/admin/ban/${role}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ banned })
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message); refetch(); }
      else showMessage('error', d.message || 'Failed');
    } catch (err) { showMessage('error', 'An error occurred'); } finally { setActionInProgress(null); }
  };

  const handleDelete = async (role: string, id: string, refetch: () => void) => {
    if (!window.confirm('Permanently delete this account? This cannot be undone.')) return;
    setActionInProgress(`del-${id}`);
    try {
      const res = await fetch(`/api/admin/delete/${role}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message); refetch(); }
      else showMessage('error', d.message || 'Failed');
    } catch (err) { showMessage('error', 'An error occurred'); } finally { setActionInProgress(null); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSustainabilityScores = async () => {
    try {
      const res = await fetch('/api/admin/sustainability-scores', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setSustainabilityData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchFraudDetection = async () => {
    try {
      const res = await fetch('/api/admin/fraud-detection', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setFraudData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchHeatmapData = async () => {
    try {
      const res = await fetch('/api/admin/heatmaps', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setHeatmapData(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchCollectors = async () => {
    try {
      const res = await fetch('/api/collectors/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setCollectors(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchCenters = async () => {
    try {
      const res = await fetch('/api/recycling-centers/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setCenters(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/badges');
      const data = await res.json();
      setBadgeOptions(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAdminEvents = async () => {
    try {
      const res = await fetch('/api/community/events');
      const data = await res.json();
      setAdminEvents(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAdminPosts = async () => {
    try {
      const res = await fetch('/api/admin/community/posts', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { console.error('fetchAdminPosts error:', data.message); return; }
      setAdminPosts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Delete this event and all its participants?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/community/events/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message); fetchAdminEvents(); }
      else showMessage('error', d.message);
    } catch (err) { showMessage('error', 'Failed to delete event'); } finally { setDeletingId(null); }
  };

  const openEditEvent = (event: any) => {
    setEditingEvent(event);
    const dateStr = event.date ? new Date(event.date).toISOString().split('T')[0] : '';
    setEditEventForm({
      title: event.title || '',
      description: event.description || '',
      date: dateStr,
      location: event.location || '',
      offerings: event.offerings || '',
      imageURL: event.imageURL || ''
    });
  };

  const handleSaveEvent = async () => {
    if (!editingEvent) return;
    try {
      const res = await fetch(`/api/admin/community/events/${editingEvent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editEventForm)
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', 'Event updated!'); setEditingEvent(null); fetchAdminEvents(); }
      else showMessage('error', d.message);
    } catch (err) { showMessage('error', 'Failed to update event'); }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Delete this community post permanently?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/community/posts/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message); fetchAdminPosts(); }
      else showMessage('error', d.message);
    } catch (err) { showMessage('error', 'Failed to delete post'); } finally { setDeletingId(null); }
  };

  const handleToggleApproval = async (post: any) => {
    try {
      const res = await fetch(`/api/admin/community/posts/${post._id || post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isApproved: !post.isApproved })
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', `Post ${!post.isApproved ? 'approved' : 'hidden'}!`); fetchAdminPosts(); }
      else showMessage('error', d.message);
    } catch (err) { showMessage('error', 'Failed to update post'); }
  };

  const openEditPost = (post: any) => {
    setEditingPost(post);
    setEditPostForm({ title: post.title || '', content: post.content || '' });
  };

  const handleSavePost = async () => {
    if (!editingPost) return;
    try {
      const res = await fetch(`/api/admin/community/posts/${editingPost._id || editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editPostForm)
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', 'Post updated!'); setEditingPost(null); fetchAdminPosts(); }
      else showMessage('error', d.message);
    } catch (err) { showMessage('error', 'Failed to update post'); }
  };

  const handleCalculateScore = async (userId: string) => {
    setCalculatingScore(userId);
    try {
      const res = await fetch(`/api/admin/calculate-sustainability-score/${userId}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { fetchSustainabilityScores(); showMessage('success', 'Score recalculated!'); }
    } catch (err) { console.error(err); } finally { setCalculatingScore(null); }
  };

  const handleVerifyCollector = async (id: string, verify: boolean) => {
    try {
      const res = await fetch(`/api/admin/${verify ? 'verify' : 'unverify'}-collector/${id}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { showMessage('success', `Collector ${verify ? 'verified' : 'unverified'}!`); fetchCollectors(); }
    } catch (err) { console.error(err); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/community/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...eventForm, imageURL: eventImage || eventForm.imageURL })
      });
      if (res.ok) {
        showMessage('success', 'Community event created!');
        setEventForm({ title: '', description: '', date: '', location: '', offerings: '', imageURL: '' });
        setEventImage('');
      } else {
        const d = await res.json();
        showMessage('error', d.message || 'Failed to create event');
      }
    } catch (err) { showMessage('error', 'An error occurred'); }
  };

  const handleEventImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEventImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAwardBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/award-badge-to-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ centerId: badgeForm.targetId, badgeName: badgeForm.badgeName })
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message || 'Badge awarded!'); setBadgeForm({ ...badgeForm, targetId: '', badgeName: '' }); fetchAll(); }
      else showMessage('error', d.message || 'Failed to award badge');
    } catch (err) { showMessage('error', 'An error occurred'); }
  };

  const handleVerifyCenter = async (centerId: string, verified: boolean) => {
    setVerifyingCenter(centerId);
    try {
      const res = await fetch(`/api/admin/recycling-centers/${centerId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ verified })
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message); fetchCenters(); }
      else showMessage('error', d.message || 'Failed to update center');
    } catch (err) { showMessage('error', 'An error occurred'); } finally { setVerifyingCenter(null); }
  };

  const handleResolveFraud = async (logId: string, resolve: boolean) => {
    setResolvingFraud(logId);
    try {
      const endpoint = resolve ? `/api/admin/resolve-fraud/${logId}` : `/api/admin/reopen-fraud/${logId}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notes: resolve ? 'Reviewed and resolved by admin' : '' })
      });
      const d = await res.json();
      if (res.ok) { showMessage('success', d.message); fetchFraudDetection(); }
      else showMessage('error', d.message || 'Failed to update fraud log');
    } catch (err) { showMessage('error', 'An error occurred'); } finally { setResolvingFraud(null); }
  };

  const chartData = [
    { name: 'Mon', waste: 400, co2: 240 },
    { name: 'Tue', waste: 300, co2: 139 },
    { name: 'Wed', waste: 200, co2: 380 },
    { name: 'Thu', waste: 278, co2: 390 },
    { name: 'Fri', waste: 189, co2: 480 },
    { name: 'Sat', waste: 239, co2: 380 },
    { name: 'Sun', waste: 349, co2: 430 },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sustainability', label: 'Sustainability', icon: Leaf },
    { id: 'fraud', label: 'Fraud Detection', icon: ShieldCheck },
    { id: 'collectors', label: 'Collectors', icon: Truck },
    { id: 'centers', label: 'Centers', icon: Recycle },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'businesses', label: 'Businesses', icon: Building2 },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'posts', label: 'Community Posts', icon: FileText },
    { id: 'badges', label: 'Award Badges', icon: Award },
  ];

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Oversight</h1>
          <p className="text-zinc-500">System-wide performance metrics and management tools.</p>
        </div>
      </div>

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
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Total Waste Collected</div>
                <div className="text-3xl font-bold mb-2">{stats?.totalWaste?.toFixed(1) || 0} kg</div>
                <div className="text-emerald-500 text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Live data</div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Total CO₂ Reduced</div>
                <div className="text-3xl font-bold mb-2">{stats?.totalCO2?.toFixed(1) || 0} kg</div>
                <div className="text-emerald-500 text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Live data</div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Active Users</div>
                <div className="text-3xl font-bold mb-2">{stats?.activeUsers || 0}</div>
                <div className="text-zinc-500 text-xs">Registered users</div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Collectors</div>
                <div className="text-3xl font-bold mb-2 text-emerald-500">{stats?.totalCollectors || 0}</div>
                <div className="text-zinc-500 text-xs">Registered collectors</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-2 bg-zinc-900 border border-white/5 p-8 rounded-3xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold">Waste Collection Trends</h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }} itemStyle={{ color: '#10b981' }} />
                      <Area type="monotone" dataKey="waste" stroke="#10b981" fillOpacity={1} fill="url(#colorWaste)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl">
                <h3 className="text-xl font-bold mb-8">Quality Control</h3>
                <div className="space-y-6">
                  {stats?.fraudLogs?.map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-amber-500 w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm mb-1">{log.alertType}</div>
                        <div className="text-xs text-zinc-500">{log.collectorId?.name}</div>
                      </div>
                    </div>
                  ))}
                  {(!stats?.fraudLogs?.length && !stats?.issues?.length) && (
                    <div className="text-center py-12 text-zinc-500">No pending alerts.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* SUSTAINABILITY */}
        {activeTab === 'sustainability' && (
          <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-bold">User Sustainability Scores</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" placeholder="Search users..." className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-zinc-500 text-xs uppercase tracking-widest">
                    <th className="px-8 py-4 font-medium">User</th>
                    <th className="px-8 py-4 font-medium">Eco Points</th>
                    <th className="px-8 py-4 font-medium">CO₂ Reduced</th>
                    <th className="px-8 py-4 font-medium">Score</th>
                    <th className="px-8 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sustainabilityData.map((user: any) => (
                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold">{user.name}</div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                      </td>
                      <td className="px-8 py-6 font-bold text-emerald-400">{user.ecoPoints || 0}</td>
                      <td className="px-8 py-6 font-bold">{(user.totalCO2Reduced || 0).toFixed(1)} kg</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(user.sustainabilityScore || 0, 100)}%` }}></div>
                          </div>
                          <span className="font-bold text-emerald-500">{(user.sustainabilityScore || 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleCalculateScore(user._id)}
                          disabled={calculatingScore === user._id}
                          className="text-xs font-bold uppercase tracking-widest text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          {calculatingScore === user._id ? 'Calculating...' : 'Recalculate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sustainabilityData.length === 0 && (
                    <tr><td colSpan={5} className="px-8 py-12 text-center text-zinc-500">No user data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FRAUD */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-amber-500/20 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Open Alerts</div>
                <div className="text-3xl font-bold text-amber-400">{fraudData.filter((f: any) => !f.resolved).length}</div>
              </div>
              <div className="bg-zinc-900 border border-red-500/20 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Critical Severity</div>
                <div className="text-3xl font-bold text-red-400">{fraudData.filter((f: any) => !f.resolved && f.severity === 'critical').length}</div>
              </div>
              <div className="bg-zinc-900 border border-emerald-500/20 p-6 rounded-3xl">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Resolved</div>
                <div className="text-3xl font-bold text-emerald-400">{fraudData.filter((f: any) => f.resolved).length}</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
              <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold">Fraud Detection Logs</h3>
                  <p className="text-sm text-zinc-500 mt-1">Pickups with actual weight &gt;50kg are auto-flagged. Investigate and resolve each alert.</p>
                </div>
                <div className="flex gap-2">
                  {(['open', 'resolved', 'all'] as const).map(f => (
                    <button key={f} onClick={() => setFraudFilter(f)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${fraudFilter === f ? 'bg-amber-500 text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-8 space-y-4">
                {fraudData.filter((f: any) => fraudFilter === 'all' ? true : fraudFilter === 'open' ? !f.resolved : f.resolved).length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    {fraudFilter === 'open' ? 'No open fraud alerts. System is clean.' : `No ${fraudFilter} alerts.`}
                  </div>
                ) : fraudData
                  .filter((f: any) => fraudFilter === 'all' ? true : fraudFilter === 'open' ? !f.resolved : f.resolved)
                  .map((fraud: any) => (
                    <div key={fraud._id} className={`p-6 rounded-3xl border transition-all ${fraud.resolved ? 'border-emerald-500/20 bg-emerald-500/5' : fraud.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${fraud.resolved ? 'bg-emerald-500/10' : fraud.severity === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                            {fraud.resolved
                              ? <CheckCircle2 className="text-emerald-400 w-7 h-7" />
                              : <AlertTriangle className={`w-7 h-7 ${fraud.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fraud.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {(fraud.severity || 'high').toUpperCase()}
                              </span>
                              {fraud.resolved && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">RESOLVED</span>}
                            </div>
                            <div className="font-bold mb-1">{fraud.reason || 'Weight anomaly detected'}</div>
                            <div className="text-sm text-zinc-400">
                              Collector: <span className="text-white font-medium">{fraud.collectorId?.name || 'Unknown'}</span>
                              {fraud.pickupId && <span> · Waste: <span className="text-white font-medium">{fraud.pickupId?.wasteType || '—'}</span> · Weight: <span className="text-amber-400 font-bold">{fraud.pickupId?.actualWeight || '?'}kg</span></span>}
                            </div>
                            <div className="text-xs text-zinc-600 mt-1">Flagged: {new Date(fraud.createdAt).toLocaleString()}</div>
                            {fraud.resolved && fraud.resolvedAt && (
                              <div className="text-xs text-emerald-600 mt-0.5">Resolved: {new Date(fraud.resolvedAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {!fraud.resolved ? (
                            <button
                              onClick={() => handleResolveFraud(fraud._id, true)}
                              disabled={resolvingFraud === fraud._id}
                              className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
                            >
                              {resolvingFraud === fraud._id ? 'Resolving...' : 'Mark Resolved'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResolveFraud(fraud._id, false)}
                              disabled={resolvingFraud === fraud._id}
                              className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* COLLECTORS */}
        {activeTab === 'collectors' && (
          <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5">
              <h3 className="text-xl font-bold">All Collectors</h3>
              <p className="text-sm text-zinc-500 mt-1">Verify, ban, or remove collectors from the platform.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-zinc-500 text-xs uppercase tracking-widest">
                    <th className="px-6 py-4 font-medium">Collector</th>
                    <th className="px-6 py-4 font-medium">Pickups</th>
                    <th className="px-6 py-4 font-medium">Earnings (৳)</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {collectors.map((c: any) => (
                    <tr key={c._id} className={`hover:bg-white/5 transition-colors ${c.isBanned ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-5">
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs text-zinc-500">{c.email}</div>
                      </td>
                      <td className="px-6 py-5 font-bold">{c.totalPickups || 0}</td>
                      <td className="px-6 py-5 font-bold text-emerald-400">৳{Math.round(c.totalEarnings || 0)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                            {c.verified ? 'Verified' : 'Unverified'}
                          </span>
                          {c.isBanned && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">Banned</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleVerifyCollector(c._id, !c.verified)} disabled={!!actionInProgress}
                            className={`text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${c.verified ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
                            {c.verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button onClick={() => handleBan('collector', c._id, !c.isBanned, fetchCollectors)} disabled={actionInProgress === `ban-${c._id}`}
                            className={`text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${c.isBanned ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'}`}>
                            {actionInProgress === `ban-${c._id}` ? '...' : c.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button onClick={() => handleDelete('collector', c._id, fetchCollectors)} disabled={actionInProgress === `del-${c._id}`}
                            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-40">
                            {actionInProgress === `del-${c._id}` ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {collectors.length === 0 && (
                    <tr><td colSpan={5} className="px-8 py-12 text-center text-zinc-500">No collectors registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECYCLING CENTERS */}
        {activeTab === 'centers' && (
          <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5">
              <h3 className="text-xl font-bold">All Recycling Centers</h3>
              <p className="text-sm text-zinc-500 mt-1">Verify centers before they can accept pickups. Unverified centers are visible but cannot process requests.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-zinc-500 text-xs uppercase tracking-widest">
                    <th className="px-6 py-4 font-medium">Center</th>
                    <th className="px-6 py-4 font-medium">Address</th>
                    <th className="px-6 py-4 font-medium">Location</th>
                    <th className="px-6 py-4 font-medium">Credits</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {centers.map((c: any) => (
                    <tr key={c._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-bold">{c.centerName}</div>
                        <div className="text-xs text-zinc-500">{c.email}</div>
                      </td>
                      <td className="px-6 py-5 text-sm text-zinc-400">{c.address || '—'}</td>
                      <td className="px-6 py-5 text-xs text-zinc-500">
                        {c.location?.lat ? `${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}` : <span className="text-amber-400">Not set</span>}
                      </td>
                      <td className="px-6 py-5 font-bold text-emerald-400">{c.carbonCreditsBalance || 0}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {c.isApproved ? 'Verified' : 'Pending'}
                          </span>
                          {c.isBanned && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">Banned</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleVerifyCenter(c._id, !c.isApproved)} disabled={verifyingCenter === c._id || !!actionInProgress}
                            className={`text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${c.isApproved ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
                            {verifyingCenter === c._id ? '...' : c.isApproved ? 'Unverify' : 'Verify'}
                          </button>
                          <button onClick={() => handleBan('recycling_center', c._id, !c.isBanned, fetchCenters)} disabled={actionInProgress === `ban-${c._id}`}
                            className={`text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${c.isBanned ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'}`}>
                            {actionInProgress === `ban-${c._id}` ? '...' : c.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button onClick={() => handleDelete('recycling_center', c._id, fetchCenters)} disabled={actionInProgress === `del-${c._id}`}
                            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-40">
                            {actionInProgress === `del-${c._id}` ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {centers.length === 0 && (
                    <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-500">No recycling centers registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5">
              <h3 className="text-xl font-bold">All Users</h3>
              <p className="text-sm text-zinc-500 mt-1">View and manage registered household users. Ban or remove accounts.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-zinc-500 text-xs uppercase tracking-widest">
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Eco Points</th>
                    <th className="px-6 py-4 font-medium">Credits</th>
                    <th className="px-6 py-4 font-medium">Badges</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allUsers.map((u: any) => (
                    <tr key={u._id} className={`hover:bg-white/5 transition-colors ${u.isBanned ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-5">
                        <div className="font-bold">{u.name}</div>
                        <div className="text-xs text-zinc-500">{u.email}</div>
                        {u.phone && <div className="text-xs text-zinc-600">{u.phone}</div>}
                      </td>
                      <td className="px-6 py-5 font-bold text-emerald-400">{Math.round(u.ecoPoints || 0)}</td>
                      <td className="px-6 py-5 font-bold text-amber-400">{Math.round(u.carbonCreditsBalance || 0)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {(u.badges || []).map((b: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-full">{b}</span>
                          ))}
                          {!u.badges?.length && <span className="text-zinc-600 text-xs">None</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {u.isBanned
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">Banned</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400">Active</span>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleBan('user', u._id, !u.isBanned, fetchAllUsers)} disabled={actionInProgress === `ban-${u._id}`}
                            className={`text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${u.isBanned ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'}`}>
                            {actionInProgress === `ban-${u._id}` ? '...' : u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button onClick={() => handleDelete('user', u._id, fetchAllUsers)} disabled={actionInProgress === `del-${u._id}`}
                            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-40">
                            {actionInProgress === `del-${u._id}` ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allUsers.length === 0 && (
                    <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-500">No users registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BUSINESSES */}
        {activeTab === 'businesses' && (
          <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5">
              <h3 className="text-xl font-bold">All Businesses</h3>
              <p className="text-sm text-zinc-500 mt-1">Manage business accounts. Businesses purchase carbon credits from the marketplace.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-zinc-500 text-xs uppercase tracking-widest">
                    <th className="px-6 py-4 font-medium">Company</th>
                    <th className="px-6 py-4 font-medium">Location (GPS)</th>
                    <th className="px-6 py-4 font-medium">Credits Purchased</th>
                    <th className="px-6 py-4 font-medium">Badges</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allBusinesses.map((b: any) => (
                    <tr key={b._id} className={`hover:bg-white/5 transition-colors ${b.isBanned ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-5">
                        <div className="font-bold">{b.companyName}</div>
                        <div className="text-xs text-zinc-500">{b.email}</div>
                      </td>
                      <td className="px-6 py-5 text-sm text-zinc-400 font-mono">{b.location?.lat ? `${b.location.lat.toFixed(4)}, ${b.location.lng.toFixed(4)}` : <span className="text-amber-400">Not set</span>}</td>
                      <td className="px-6 py-5 font-bold text-amber-400">{Math.round(b.carbonCreditsPurchased || 0)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {(b.badges || []).map((badge: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full">{badge}</span>
                          ))}
                          {!b.badges?.length && <span className="text-zinc-600 text-xs">None</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {b.isBanned
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">Banned</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400">Active</span>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleBan('business', b._id, !b.isBanned, fetchAllBusinesses)} disabled={actionInProgress === `ban-${b._id}`}
                            className={`text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${b.isBanned ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'}`}>
                            {actionInProgress === `ban-${b._id}` ? '...' : b.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button onClick={() => handleDelete('business', b._id, fetchAllBusinesses)} disabled={actionInProgress === `del-${b._id}`}
                            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-40">
                            {actionInProgress === `del-${b._id}` ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allBusinesses.length === 0 && (
                    <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-500">No businesses registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EVENTS MANAGEMENT */}
        {activeTab === 'events' && (
          <div className="space-y-10">
            {/* Edit Event Modal */}
            {editingEvent && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Edit Event</h3>
                    <button onClick={() => setEditingEvent(null)} className="p-2 rounded-xl hover:bg-white/5"><X className="w-5 h-5 text-zinc-400" /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                      <input value={editEventForm.title} onChange={e => setEditEventForm({ ...editEventForm, title: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                      <textarea rows={3} value={editEventForm.description} onChange={e => setEditEventForm({ ...editEventForm, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Date</label>
                        <input type="date" value={editEventForm.date} onChange={e => setEditEventForm({ ...editEventForm, date: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Location</label>
                        <input value={editEventForm.location} onChange={e => setEditEventForm({ ...editEventForm, location: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Offerings</label>
                      <input value={editEventForm.offerings} onChange={e => setEditEventForm({ ...editEventForm, offerings: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Image URL</label>
                      <input value={editEventForm.imageURL} onChange={e => setEditEventForm({ ...editEventForm, imageURL: e.target.value })} placeholder="https://..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setEditingEvent(null)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all">Cancel</button>
                      <button onClick={handleSaveEvent} className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold hover:bg-emerald-400 transition-all">Save Changes</button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Existing Events */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold mb-1">All Events</h3>
                  <p className="text-zinc-500 text-sm">{adminEvents.length} event{adminEvents.length !== 1 ? 's' : ''} total</p>
                </div>
              </div>
              {adminEvents.length === 0 ? (
                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-10 text-center text-zinc-500">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No events created yet. Use the form below to create the first one.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adminEvents.map((event) => (
                    <div key={event._id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                      {event.imageURL ? (
                        <img src={event.imageURL} alt={event.title} className="w-20 h-16 object-cover rounded-xl flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 text-emerald-500/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base mb-1">{event.title}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                          {event.date && <span>{new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                          {event.location && <span>{event.location}</span>}
                          <span className="text-emerald-500">{event.participantCount || 0} participants</span>
                        </div>
                        {event.description && <p className="text-zinc-500 text-sm mt-1 line-clamp-1">{event.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEditEvent(event)} className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all" title="Edit">
                          <Pencil className="w-4 h-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleDeleteEvent(event._id)} disabled={deletingId === event._id} className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Event Form */}
            <div className="max-w-2xl bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-2">Create New Event</h3>
              <p className="text-zinc-400 text-sm mb-6">Events are visible to all users and can be joined instantly.</p>
              <form onSubmit={handleCreateEvent} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Event Title</label>
                  <input required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Green City Cleanup Drive" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                  <textarea rows={3} value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Describe the event..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Date</label>
                    <input type="date" required value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Location</label>
                    <input required value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} placeholder="e.g. City Park" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Offerings / Special Activities</label>
                  <input value={eventForm.offerings} onChange={e => setEventForm({ ...eventForm, offerings: e.target.value })} placeholder="e.g. Free recycling kits, eco workshop, 2x points" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Event Image</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleEventImageChange} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all ${eventImage ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}>
                    {eventImage ? (
                      <div><img src={eventImage} alt="Event" className="max-h-32 mx-auto rounded-lg mb-2 object-cover" /><span className="text-emerald-400 text-sm font-medium">Image uploaded ✓</span></div>
                    ) : (
                      <div className="text-zinc-500"><Image className="w-8 h-8 mx-auto mb-2" /><span className="text-sm">Click to upload event image</span></div>
                    )}
                  </button>
                  {!eventImage && (
                    <input value={eventForm.imageURL} onChange={e => setEventForm({ ...eventForm, imageURL: e.target.value })} placeholder="Or paste image URL" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 mt-2 focus:outline-none focus:border-emerald-500 transition-all text-sm" />
                  )}
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-black py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />Create Event
                </button>
              </form>
            </div>
          </div>
        )}

        {/* COMMUNITY POSTS MANAGEMENT */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Edit Post Modal */}
            {editingPost && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Edit Post</h3>
                    <button onClick={() => setEditingPost(null)} className="p-2 rounded-xl hover:bg-white/5"><X className="w-5 h-5 text-zinc-400" /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                      <input value={editPostForm.title} onChange={e => setEditPostForm({ ...editPostForm, title: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Content</label>
                      <textarea rows={5} value={editPostForm.content} onChange={e => setEditPostForm({ ...editPostForm, content: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setEditingPost(null)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all">Cancel</button>
                      <button onClick={handleSavePost} className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold hover:bg-emerald-400 transition-all">Save Changes</button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">All Community Posts</h3>
                <p className="text-zinc-500 text-sm">{adminPosts.length} post{adminPosts.length !== 1 ? 's' : ''} total — visible and hidden</p>
              </div>
              <button onClick={fetchAdminPosts} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all">Refresh</button>
            </div>

            {adminPosts.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-10 text-center text-zinc-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No community posts yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {adminPosts.map((post) => {
                  const postId = post._id || post.id;
                  return (
                    <div key={postId} className={`bg-zinc-900/50 border rounded-2xl p-5 ${post.isApproved ? 'border-white/5' : 'border-red-500/20 bg-red-500/5'}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-base">{post.title}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${post.isApproved ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                              {post.isApproved ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-zinc-500 text-sm line-clamp-2 mb-2">{post.content}</p>
                          <div className="flex gap-4 text-xs text-zinc-600">
                            {post.author && <span>By {post.author.name || post.author.email}</span>}
                            <span>{new Date(post.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span>{post.likes || 0} likes</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleToggleApproval(post)} className={`p-2 rounded-xl border transition-all ${post.isApproved ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'}`} title={post.isApproved ? 'Hide post' : 'Approve post'}>
                            {post.isApproved ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                          </button>
                          <button onClick={() => openEditPost(post)} className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all" title="Edit">
                            <Pencil className="w-4 h-4 text-blue-400" />
                          </button>
                          <button onClick={() => handleDeletePost(postId)} disabled={deletingId === postId} className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all" title="Delete permanently">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AWARD BADGES */}
        {activeTab === 'badges' && (
          <div className="space-y-8">
            <div className="max-w-2xl mx-auto bg-zinc-900/50 border border-purple-500/20 p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Award className="text-purple-400 w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Award Badges</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6">Admins can award badges to <span className="text-purple-400 font-medium">registered recycling centers</span> only. User and collector badges are earned automatically based on activity.</p>
              <form onSubmit={handleAwardBadge} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Select Registered Center</label>
                  <select
                    required
                    value={badgeForm.targetId}
                    onChange={e => setBadgeForm({ ...badgeForm, targetId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">-- Select center --</option>
                    {centers.map((item: any) => (
                      <option key={item._id} value={item._id}>
                        {item.centerName} ({item.email})
                      </option>
                    ))}
                  </select>
                  {centers.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">No registered recycling centers found.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Badge</label>
                  <select
                    required
                    value={badgeForm.badgeName}
                    onChange={e => setBadgeForm({ ...badgeForm, badgeName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">-- Select badge --</option>
                    {badgeOptions
                      .filter(b => b.targetRole === 'recycling_center')
                      .map((b: any, i: number) => (
                        <option key={i} value={b.badgeName}>{b.badgeName} — {b.description}</option>
                      ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-purple-500 text-white py-4 rounded-xl font-bold hover:bg-purple-400 transition-all flex items-center justify-center gap-2">
                  <Award className="w-5 h-5" />
                  Award Badge to Center
                </button>
              </form>
            </div>

            {/* Centers with badges */}
            {centers.filter((c: any) => c.badges?.length > 0).length > 0 && (
              <div className="max-w-2xl mx-auto">
                <h4 className="font-bold mb-4 text-zinc-300">Recycling Centers with Badges</h4>
                {centers.filter((c: any) => c.badges?.length > 0).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 mb-2 bg-zinc-900 rounded-2xl border border-white/5">
                    <span className="font-bold text-sm">{c.centerName}</span>
                    <div className="flex gap-1 flex-wrap">{c.badges.map((b: string, j: number) => <span key={j} className="px-2 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-full">{b}</span>)}</div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </motion.div>
    </div>
  );
};
