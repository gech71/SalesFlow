
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const districts = await db.district.findMany();
    return NextResponse.json(districts);
  } catch (error) {
    console.error("Failed to fetch districts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
