export const WEEKLY_MILESTONES = [
  { pickups: 5, bonus: 50 },
  { pickups: 10, bonus: 150 },
  { pickups: 20, bonus: 400 },
];

export const CARBON_CREDIT_RATES: Record<string, number> = {
  ewaste:  1.5,
  metal:   1.0, 
  plastic: 0.8,
  glass:   0.4,
  paper:   0.3,
  organic: 0.2,
};
export const DEFAULT_CREDIT_RATE = 0.5;
export const ECO_POINTS_RATE = 10;
export const USER_CREDITS_PER_PICKUP = 5;

export function calcDeliveryCharge(distanceKm: number, weightKg: number = 0): number {
  const distCharge = distanceKm <= 3 ? 60 : Math.round(60 + (distanceKm - 3) * 20);
  const weightCharge = weightKg > 5 ? Math.round((weightKg - 5) * 5) : 0;
  return distCharge + weightCharge;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkWeekReset(collector: any) {
  const now = new Date();
  const resetDate = new Date(collector.weekResetDate || 0);
  const diffDays = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 7) {
    collector.weeklyPickups = 0;
    collector.weeklyEarnings = 0;
    collector.weeklyBonusEarned = 0;
    collector.weekResetDate = now;
  }
  return collector;
}
