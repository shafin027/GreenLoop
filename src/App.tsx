import React from 'react';
import { motion } from 'motion/react';
import { Leaf, Recycle, BarChart3, ShieldCheck, ArrowRight, Menu, X, Globe, Zap, Users, LogOut, Calendar, Award, MapPin, Factory, ShoppingCart, Map, AlertTriangle, FileCheck, Trash2, Truck, TrendingUp, Wind, Droplets } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { UserDashboard } from './components/UserDashboard';
import { CollectorDashboard } from './components/CollectorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { RecyclingCenterDashboard } from './components/RecyclingCenterDashboard';
import { BusinessDashboard } from './components/BusinessDashboard';
import { GreenLoopChatbot } from './components/GreenLoopChatbot';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const [dbStatus, setDbStatus] = React.useState<'connected' | 'disconnected' | 'checking'>('checking');

  React.useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setDbStatus(data.database))
      .catch(() => setDbStatus('disconnected'));
  }, []);

  const renderDashboard = () => {
    if (user?.role === 'admin' || user?.role === 'super-admin') return <AdminDashboard />;
    if (user?.role === 'collector') return <CollectorDashboard />;
    if (user?.role === 'recycling_center') return <RecyclingCenterDashboard />;
    if (user?.role === 'business') return <BusinessDashboard />;
    return <UserDashboard />;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500 selection:text-black">
      {/* Database Status Banner */}
      {dbStatus === 'disconnected' && (
        <div className="fixed top-20 left-0 right-0 z-[60] bg-red-500/10 backdrop-blur-md border-b border-red-500/20 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-red-400">
            <ShieldCheck className="w-3 h-3" />
            Database not connected. Please set up your <code>MONGODB_URI</code> in AI Studio Secrets.
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Recycle className="text-black w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">GreenLoop</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {!isAuthenticated ? (
                <>
                  <a href="#features" className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors">Features</a>
                  <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors">How It Works</a>
                  <a href="#impact" className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors">Impact</a>
                  <div className="h-4 w-px bg-white/10 mx-2"></div>
                  <button 
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-sm font-medium hover:text-emerald-400 transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setIsAuthModalOpen(true)}
                    className="bg-emerald-500 text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-400 transition-all active:scale-95"
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold">{user?.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{user?.role}</div>
                    </div>
                    <button 
                      onClick={logout}
                      className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-zinc-400">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-zinc-900 border-b border-white/10 px-4 py-6 flex flex-col gap-4"
          >
            {!isAuthenticated ? (
              <>
                <a href="#features" className="text-lg font-medium">Features</a>
                <a href="#how-it-works" className="text-lg font-medium">How It Works</a>
                <a href="#impact" className="text-lg font-medium">Impact</a>
                <button 
                  onClick={() => { setIsAuthModalOpen(true); setIsMenuOpen(false); }}
                  className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold"
                >
                  Get Started
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl">
                  <div>
                    <div className="font-bold">{user?.name}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest">{user?.role}</div>
                  </div>
                  <button onClick={logout} className="text-red-400 font-bold">Logout</button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {!isAuthenticated ? (
          <>
            {/* Hero Section */}
            <section className="relative pt-20 pb-20 overflow-hidden">
              {/* Background Gradients */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-4xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8"
                  >
                    <Zap className="w-3 h-3 fill-emerald-400" />
                    Sustainable Waste Management Platform
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]"
                  >
                    Recycle. Earn. <span className="text-emerald-500">Save the Planet.</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed"
                  >
                    GreenLoop connects households, collectors, and recycling centers in a unified carbon credit ecosystem. Track your impact, earn eco-points, and contribute to a greener future.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                  >
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full sm:w-auto bg-emerald-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 group"
                    >
                      Start Recycling
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <a href="#how-it-works" className="w-full sm:w-auto bg-white/5 border border-white/10 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all inline-block text-center">
                      See How It Works
                    </a>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-[#050505]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <div className="text-emerald-500 text-sm font-bold tracking-widest uppercase mb-4">Features</div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need for <span className="text-emerald-500">Green Impact</span></h2>
                  <p className="text-zinc-400 text-lg">A complete ecosystem connecting every stakeholder in the recycling chain.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { icon: ShieldCheck, title: 'Secure Authentication', desc: 'Role-based login for households, collectors, recycling centers & admins.' },
                    { icon: Calendar, title: 'Schedule Pickups', desc: 'Book waste pickup by selecting date, time & waste type effortlessly.' },
                    { icon: Award, title: 'Eco-Points System', desc: 'Earn points based on waste weight and type — redeem for rewards.' },
                    { icon: MapPin, title: 'Smart Route Finding', desc: 'Collectors get AI-optimized pickup routes via integrated maps.' },
                    { icon: Factory, title: 'Carbon Credit Generation', desc: 'Recycling centers convert processed waste into verified carbon credits.' },
                    { icon: ShoppingCart, title: 'Credit Marketplace', desc: 'Companies purchase carbon credits to offset their emissions.' },
                    { icon: Map, title: 'Recycling Heatmap', desc: 'Admins visualize recycling activity by area on interactive maps.' },
                    { icon: BarChart3, title: 'Sustainability Scoring', desc: 'Households scored on recycling consistency and environmental impact.' },
                    { icon: AlertTriangle, title: 'Fraud Detection', desc: 'Flag unusual weight entries with automated anomaly detection.' },
                    { icon: FileCheck, title: 'Recycling Certificates', desc: 'Issue verified certificates to recycling centers with carbon credit proof.' },
                  ].map((feature, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-emerald-500/30 transition-all group">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <feature.icon className="text-emerald-500 w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold mb-2">{feature.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Process Section */}
            <section id="how-it-works" className="py-24 bg-[#050505]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                  <div className="text-emerald-500 text-sm font-bold tracking-widest uppercase mb-4">Process</div>
                  <h2 className="text-4xl md:text-5xl font-bold">How <span className="text-emerald-500">GreenLoop</span> Works</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                  {/* Connecting line for desktop */}
                  <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px border-t border-dashed border-white/10"></div>
                  
                  {[
                    { step: '01', icon: Trash2, title: 'Sort & Schedule', desc: 'Households sort waste and schedule a pickup through the app.' },
                    { step: '02', icon: Truck, title: 'Collect & Verify', desc: 'Collectors pick up waste, weigh it, and confirm the collection.' },
                    { step: '03', icon: Factory, title: 'Process & Convert', desc: 'Recycling centers process waste and generate carbon credits.' },
                    { step: '04', icon: TrendingUp, title: 'Trade & Impact', desc: 'Companies purchase credits. Everyone tracks their eco-impact.' },
                  ].map((item, i) => (
                    <div key={i} className="relative text-center">
                      <div className="text-6xl font-black text-white/5 mb-[-30px] select-none">{item.step}</div>
                      <div className="w-16 h-16 mx-auto bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <item.icon className="text-black w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed px-4">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Impact Section */}
            <section id="impact" className="py-24 bg-[#050505]">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <div className="text-emerald-500 text-sm font-bold tracking-widest uppercase mb-4">Impact</div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Collective <span className="text-emerald-500">Impact</span></h2>
                  <p className="text-zinc-400 text-lg">Real numbers from real recycling efforts across the platform.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { icon: Recycle, value: '45,000+', label: 'Tons Recycled' },
                    { icon: Wind, value: '12,400', label: 'Tons CO₂ Saved' },
                    { icon: Droplets, value: '8.2M', label: 'Liters Water Saved' },
                    { icon: Leaf, value: '3.1M', label: 'Carbon Credits Issued' },
                  ].map((stat, i) => (
                    <div key={i} className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 text-center hover:border-emerald-500/30 transition-all">
                      <div className="w-12 h-12 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                        <stat.icon className="text-emerald-500 w-6 h-6" />
                      </div>
                      <div className="text-3xl font-bold text-emerald-500 mb-2">{stat.value}</div>
                      <div className="text-sm text-zinc-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          renderDashboard()
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Recycle className="text-black w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">GreenLoop</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Us</a>
          </div>
          <div className="text-sm text-zinc-600">
            © 2026 GreenLoop. All rights reserved.
          </div>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <GreenLoopChatbot onSignInClick={() => setIsAuthModalOpen(true)} />
    </div>
  );
}
