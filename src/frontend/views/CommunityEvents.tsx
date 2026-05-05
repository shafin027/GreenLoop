import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Users, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Event {
  _id: string;
  title: string;
  description?: string;
  date?: string;
  location?: string;
  offerings?: string;
  imageURL?: string;
  participantCount?: number;
}

export const CommunityEvents: React.FC = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchEvents();
    if (token) fetchJoinedIds();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/community/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchJoinedIds = async () => {
    try {
      const res = await fetch('/api/community/events/my-joined', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJoinedIds(new Set(Array.isArray(data) ? data : []));
      }
    } catch (e) { console.error(e); }
  };

  const handleJoin = async (eventId: string) => {
    if (!token) {
      setMessage({ type: 'error', text: 'You must be logged in to join events.' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    if (joinedIds.has(eventId) || joiningId) return;
    setJoiningId(eventId);
    try {
      const res = await fetch(`/api/community/events/${eventId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        setJoinedIds(prev => new Set([...prev, eventId]));
        setMessage({ type: 'success', text: "You've joined the event! See you there." });
        fetchEvents();
      } else {
        setMessage({ type: 'error', text: d.message || 'Failed to join event.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setJoiningId(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-zinc-500">Loading events...</div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Community Events</h1>
        <p className="text-zinc-500">Join sustainability events and connect with the eco-community.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No events yet.</p>
          <p className="text-sm">Admins can create events from the Admin Dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event, i) => {
            const joined = joinedIds.has(event._id);
            const isJoining = joiningId === event._id;
            return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all group"
              >
                {event.imageURL ? (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={event.imageURL}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 flex items-center justify-center">
                    <div className="text-center">
                      <Calendar className="w-12 h-12 text-emerald-500/40 mx-auto mb-2" />
                      <span className="text-zinc-600 text-sm">No image</span>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h4 className="font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">{event.title}</h4>
                  {event.description && (
                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{event.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    {event.date && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {typeof event.participantCount !== 'undefined' && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{event.participantCount} participant{event.participantCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {event.offerings && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Event Offerings</div>
                          <div className="text-sm text-zinc-300">{event.offerings}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleJoin(event._id)}
                    disabled={joined || isJoining}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      joined
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 cursor-default'
                        : isJoining
                        ? 'bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed'
                        : 'bg-white/5 border border-white/10 hover:bg-emerald-500 hover:text-black hover:border-emerald-500'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {joined ? 'Joined' : isJoining ? 'Joining…' : 'Join Event'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
