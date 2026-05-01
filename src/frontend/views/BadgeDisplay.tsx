import React from 'react';
import { Award } from 'lucide-react';

interface Badge {
  _id?: string;
  id?: string;
  badgeName: string;
  description?: string;
  iconURL?: string;
}

export const BadgeDisplay: React.FC<{ badges: Badge[] }> = ({ badges }) => {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award className="text-amber-400" /> Your Badges
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map((badge, i) => (
          <div
            key={badge._id || badge.id || badge.badgeName || i}
            className="flex flex-col items-center p-5 bg-amber-950/40 rounded-2xl border border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/50 transition-all shadow-md shadow-amber-900/20 hover:shadow-amber-500/20"
          >
            <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-3 ring-2 ring-amber-500/30">
              {badge.iconURL ? (
                <img src={badge.iconURL} alt={badge.badgeName} className="w-8 h-8 object-contain" />
              ) : (
                <Award className="w-8 h-8 text-amber-400" />
              )}
            </div>
            <span className="text-sm font-bold text-center text-amber-300 leading-snug">{badge.badgeName}</span>
            {badge.description && <span className="text-xs text-zinc-400 text-center mt-1 leading-tight">{badge.description}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
