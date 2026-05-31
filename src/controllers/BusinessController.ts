import { Request, Response } from 'express';
import { db } from '../db';
import { businesses, carbonCredits, recyclingCenters, certificates } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const businessRes = await db.select().from(businesses).where(eq(businesses.id, (req as any).user?.id)).limit(1);
    const business = businessRes[0];
    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }
    res.json(business);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, phone, location } = req.body;
    const updates: any = {};
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (location?.lat && location?.lng) updates.location = location;
    
    const updated = await db.update(businesses).set(updates).where(eq(businesses.id, (req as any).user?.id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listAvailableCredits = async (req: Request, res: Response): Promise<void> => {
  try {
    const credits = await db.select({
      carbonCredit: carbonCredits,
      center: {
        centerName: recyclingCenters.centerName
      }
    })
    .from(carbonCredits)
    .leftJoin(recyclingCenters, eq(carbonCredits.centerId, recyclingCenters.id))
    .where(eq(carbonCredits.status, 'available'));

    const mappedCredits = credits.map(row => ({
      ...row.carbonCredit,
      _id: row.carbonCredit.id,
      centerId: row.center ? { id: row.carbonCredit.centerId, _id: row.carbonCredit.centerId, ...row.center } : null
    }));
    res.json(mappedCredits);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const allBusinesses = await db.select({
      id: businesses.id,
      companyName: businesses.companyName,
      email: businesses.email,
      badges: businesses.badges,
      isBanned: businesses.isBanned,
      verified: businesses.verified,
      carbonCreditsPurchased: businesses.carbonCreditsPurchased
    }).from(businesses);
    res.json(allBusinesses.map(b => ({ ...b, _id: b.id })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const purchaseCarbonCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { creditId } = req.body;
    const creditRes = await db.select().from(carbonCredits).where(eq(carbonCredits.id, creditId)).limit(1);
    const credit = creditRes[0];
    if (!credit || credit.status !== 'available') {
      res.status(400).json({ message: 'Credit not available' });
      return;
    }
    await db.update(carbonCredits).set({
      status: 'purchased',
      businessId: (req as any).user?.id,
      purchaseDate: new Date()
    }).where(eq(carbonCredits.id, creditId));

    const businessRes = await db.select().from(businesses).where(eq(businesses.id, (req as any).user?.id)).limit(1);
    const business = businessRes[0];
    if (business) {
      const newAmount = (business.carbonCreditsPurchased || 0) + credit.amount;
      await db.update(businesses).set({
        carbonCreditsPurchased: newAmount
      }).where(eq(businesses.id, (req as any).user?.id));
    }
    res.json({ message: 'Purchase successful', amount: credit.amount });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getCertificates = async (req: Request, res: Response): Promise<void> => {
  try {
    const certs = await db.select().from(certificates).where(eq(certificates.issuedToId, (req as any).user?.id)).orderBy(desc(certificates.issueDate));
    res.json(certs || []);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
