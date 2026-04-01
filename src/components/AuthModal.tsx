import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [role, setRole] = React.useState('user');
  const [formData, setFormData] = React.useState({
    name: '',
    companyName: '',
    centerName: '',
    email: '',
    password: '',
    phone: '',
    licenseNumber: '',
    address: '',
  });
  const [error, setError] = React.useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email: formData.email, password: formData.password, role }
      : { ...formData, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      if (isLogin) {
        login(data.token, data.user);
        onClose();
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  const roles = [
    { id: 'user', label: 'User' },
    { id: 'collector', label: 'Collector' },
    { id: 'recycling_center', label: 'Center' },
    { id: 'business', label: 'Business' },
    { id: 'admin', label: 'Admin' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="text-zinc-500 text-sm mb-8">
          {isLogin ? 'Enter your credentials to access your account' : 'Join the green revolution today'}
        </p>

        {error && (
          <div className={`p-4 rounded-xl text-sm mb-6 ${error.includes('successful') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl mb-8">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`flex-1 min-w-[80px] py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${role === r.id ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {role === 'business' ? (
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Company Name"
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
              ) : role === 'recycling_center' ? (
                <>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Center Name"
                      required
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
                      value={formData.centerName}
                      onChange={(e) => setFormData({ ...formData, centerName: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="License Number"
                      required
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Address"
                      required
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              )}
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="tel"
                placeholder="Phone Number"
                required
                className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button className="w-full bg-emerald-500 text-black py-4 rounded-xl font-bold text-lg hover:bg-emerald-400 transition-all active:scale-[0.98] mt-4">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-400 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
