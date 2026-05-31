import React from 'react';
import { Award } from 'lucide-react';
import { motion } from 'motion/react';
import { DynamicIcon } from '../components/DynamicIcon';

interface Badge {
  _id?: string;
  id?: string;
  badgeName: string;
  description?: string;
  iconURL?: string;
}

export const BadgeDisplay: React.FC<{ badges: Badge[] }> = ({ badges }) => {
  return (
    <div className="bg-zinc-950/60 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />

      <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2 text-zinc-100">
        <Award className="text-emerald-400 w-5 h-5" /> Your Badges
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {badges.map((badge, i) => (
          <motion.div
            key={badge._id || badge.id || badge.badgeName || i}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col items-center p-5 bg-white/5 rounded-3xl border border-white/10 hover:border-emerald-500/30 hover:bg-white/10 transition-colors duration-200 shadow-sm cursor-pointer group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3 ring-1 ring-white/10 group-hover:ring-emerald-500/30 group-hover:scale-110 transition-all duration-200">
              {badge.iconURL ? (
                badge.iconURL.startsWith('http') || badge.iconURL.startsWith('data:') ? (
                  <img src={badge.iconURL} alt={badge.badgeName} className="w-6 h-6 object-contain" />
                ) : (
                  <DynamicIcon name={badge.iconURL} className="w-6 h-6 text-emerald-400" />
                )
              ) : (
                <Award className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <span className="text-sm font-bold text-center text-zinc-200 group-hover:text-emerald-400 transition-colors duration-200 leading-snug">
              {badge.badgeName}
            </span>
            {badge.description && (
              <span className="text-xs text-zinc-500 text-center mt-2 leading-relaxed max-w-[14ch] truncate group-hover:text-zinc-400 transition-colors duration-200" title={badge.description}>
                {badge.description}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
