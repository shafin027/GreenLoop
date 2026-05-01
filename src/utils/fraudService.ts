import { FraudLog } from '../models/FraudLog';

export async function detectFraud(pickup: any): Promise<boolean> {
  const estimatedW = pickup.estimatedWeight || 0;
  const actualW = pickup.actualWeight || 0;
  
  const mismatchPct = estimatedW > 0 ? Math.abs(actualW - estimatedW) / estimatedW : 0;
  const mismatchKg = Math.abs(actualW - estimatedW);
  const isMismatch = mismatchPct > 0.10 && mismatchKg > 0.5;
  const isAnomalous = actualW > 50;
  
  return isMismatch || isAnomalous;
}

export async function logFraudIfNeeded(
  collectorId: string, 
  pickupId: string, 
  estimatedWeight: number, 
  actualWeight: number
): Promise<void> {
  const isFraudulent = await detectFraud({ estimatedWeight, actualWeight } as any);
  
  if (!isFraudulent) return;
  
  const existing = await FraudLog.findOne({ pickupId });
  if (existing) return;
  
  const mismatchPct = estimatedWeight > 0 ? Math.abs(actualWeight - estimatedWeight) / estimatedWeight : 0;
  let reason: string;
  let severity: string;
  
  if (mismatchPct > 0.5 || actualWeight > 100) {
    reason = `Critical anomaly: estimated ${estimatedWeight}kg → actual ${actualWeight}kg (${Math.round(mismatchPct * 100)}% diff)`;
    severity = 'critical';
  } else if (mismatchPct > 0.25 || actualWeight > 75) {
    reason = `High risk: estimated ${estimatedWeight}kg → actual ${actualWeight}kg (${Math.round(mismatchPct * 100)}% diff)`;
    severity = 'high';
  } else {
    reason = `Suspicious: estimated ${estimatedWeight}kg → actual ${actualWeight}kg (${Math.round(mismatchPct * 100)}% diff, or >50kg`;
    severity = 'medium';
  }
  
  await FraudLog.create({ 
    collectorId, 
    pickupId, 
    reason, 
    severity, 
    resolved: false 
  });
}
