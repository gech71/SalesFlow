
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=et&q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'LeadTrack-Pro/1.0 (your-email@example.com)' // OpenStreetMap requires a User-Agent header
      }
    });

    if (!response.ok) {
      throw new Error(`OpenStreetMap API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch from OpenStreetMap API:", error);
    return NextResponse.json({ error: 'Internal Server Error fetching location data' }, { status: 500 });
  }
}
