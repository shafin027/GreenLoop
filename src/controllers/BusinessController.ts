import { Request, Response } from 'express';
import { Business } from '../models/Business';
import { CarbonCredit } from '../models/CarbonCredit';
import { Certificate } from '../models/Certificate';

export const getMe = async (req: Request, res: Response) => {
  try {
    const business = await Business.findById(req.user?.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json(business);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const { address, phone, location } = req.body;
    const updates: any = {};
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (location?.lat && location?.lng) updates.location = location;
    const business = await Business.findByIdAndUpdate(req.user?.id, updates, { new: true });
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json(business);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Carbon credit features added

export const listAvailableCredits = async (req: Request, res: Response) => {
  try {
    const credits = await CarbonCredit.find({ status: 'available' }).populate('centerId', 'centerName');
    res.json(credits);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const purchaseCarbonCredit = async (req: Request, res: Response) => {
  try {
    const { creditId } = req.body;
    const credit = await CarbonCredit.findById(creditId);
    if (!credit || credit.status !== 'available') {
      return res.status(400).json({ message: 'Credit not available' });
    }
    credit.status = 'purchased';
    credit.businessId = req.user?.id;
    credit.purchaseDate = new Date();
    await credit.save();
    const business = await Business.findById(req.user?.id);
    if (business) {
      business.carbonCreditsPurchased = (business.carbonCreditsPurchased || 0) + credit.amount;
      await business.save();
    }
    res.json({ message: 'Purchase successful', amount: credit.amount });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getCertificates = async (req: Request, res: Response) => {
  try {
    const certs = await Certificate.find({ issuedToId: req.user?.id }).sort({ issueDate: -1 });
    res.json(certs || []);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
