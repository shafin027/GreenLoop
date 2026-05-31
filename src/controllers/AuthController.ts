import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, admins, collectors, recyclingCenters, businesses } from '../schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'greenloop_secret_key_2026';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, companyName, centerName, email, password, phone, role, licenseNumber, address } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (role === 'admin') {
      const existingAdmins = await db.select().from(admins).limit(1);
      if (existingAdmins.length > 0) {
        res.status(403).json({ message: 'Admin registration is closed after the first admin is created. Please login instead.' });
        return;
      }
      await db.insert(admins).values({ name, email, password: hashedPassword, phone, role: 'admin' });
    } else if (role === 'super-admin') {
      res.status(403).json({ message: 'Super-admin registration is not allowed.' });
      return;
    } else if (role === 'collector') {
      await db.insert(collectors).values({ name, email, password: hashedPassword, phone, role: 'collector' });
    } else if (role === 'recycling_center') {
      await db.insert(recyclingCenters).values({ centerName, email, password: hashedPassword, phone, licenseNumber, address, role: 'recycling_center' });
    } else if (role === 'business') {
      await db.insert(businesses).values({ companyName, email, password: hashedPassword, phone, role: 'business' });
    } else {
      await db.insert(users).values({ name, email, password: hashedPassword, phone, role: 'user' });
    }
    res.status(201).json({ message: "Registration successful" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const adminSignupAvailable = async (req: Request, res: Response): Promise<void> => {
  try {
    const existingAdmins = await db.select().from(admins).limit(1);
    res.json({ adminSignupOpen: existingAdmins.length === 0 });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;
    let user: any = null;
    
    if (role === 'collector') {
      const result = await db.select().from(collectors).where(eq(collectors.email, email)).limit(1);
      user = result[0];
    } else if (role === 'admin') {
      const result = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
      user = result[0];
    } else if (role === 'recycling_center') {
      const result = await db.select().from(recyclingCenters).where(eq(recyclingCenters.email, email)).limit(1);
      user = result[0];
    } else if (role === 'business') {
      const result = await db.select().from(businesses).where(eq(businesses.email, email)).limit(1);
      user = result[0];
    } else {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      user = result[0];
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    
    // Check if banned
    if (user.isBanned) {
      res.status(403).json({ message: "Your account has been banned. Please contact support." });
      return;
    }
    
    const token = jwt.sign(
      { id: user.id, role: role || user.role || 'user', email: user.email },
      JWT_SECRET, { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name || user.centerName || user.companyName,
        email: user.email,
        role: role || user.role || 'user'
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
