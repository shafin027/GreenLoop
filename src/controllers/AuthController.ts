import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Collector } from '../models/Collector';
import { Admin } from '../models/Admin';
import { RecyclingCenter } from '../models/RecyclingCenter';
import { Business } from '../models/Business';

const JWT_SECRET = process.env.JWT_SECRET || 'greenloop_secret_key_2026';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, companyName, centerName, email, password, phone, role, licenseNumber, address } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    let user: any;

    if (role === 'admin') {
      const hasAdmin = await Admin.exists({});
      if (hasAdmin) {
        return res.status(403).json({ message: 'Admin registration is closed after the first admin is created. Please login instead.' });
      }
      user = await Admin.create({ name, email, password: hashedPassword, phone, role: 'admin' });
    } else if (role === 'super-admin') {
      return res.status(403).json({ message: 'Super-admin registration is not allowed.' });
    } else if (role === 'collector') {
      user = await Collector.create({ name, email, password: hashedPassword, phone, role: 'collector' });
    } else if (role === 'recycling_center') {
      user = await RecyclingCenter.create({ centerName, email, password: hashedPassword, phone, licenseNumber, address, role: 'recycling_center' });
    } else if (role === 'business') {
      user = await Business.create({ companyName, email, password: hashedPassword, phone, role: 'business' });
    } else {
      user = await User.create({ name, email, password: hashedPassword, phone, role: 'user' });
    }
    res.status(201).json({ message: "Registration successful" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const adminSignupAvailable = async (req: Request, res: Response) => {
  try {
    const hasAdmin = await Admin.exists({});
    res.json({ adminSignupOpen: !hasAdmin });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    let user: any;
    if (role === 'collector') user = await Collector.findOne({ email });
    else if (role === 'admin') user = await Admin.findOne({ email });
    else if (role === 'recycling_center') user = await RecyclingCenter.findOne({ email });
    else if (role === 'business') user = await Business.findOne({ email });
    else user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been banned. Please contact support." });
    }
    const token = jwt.sign(
      { id: user._id, role: role || user.role || 'user', email: user.email },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name || user.centerName || user.companyName,
        email: user.email,
        role: role || user.role || 'user'
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
