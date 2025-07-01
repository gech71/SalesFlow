
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const districts = await prisma.district.findMany();
    return NextResponse.json(districts);
  } catch (error) {
    console.error("Failed to fetch districts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
