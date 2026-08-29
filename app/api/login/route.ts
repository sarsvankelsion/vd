import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUser } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'void-secret-key-2026';

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json({ error: 'Missing userId or password.' }, { status: 400 });
    }

    const cleanId = String(userId).trim().toUpperCase();
    const user = await getUser(cleanId);

    if (!user) {
      return NextResponse.json({ error: 'Invalid 15-char ID or password.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid 15-char ID or password.' }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({ userId: user.userId, token, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
