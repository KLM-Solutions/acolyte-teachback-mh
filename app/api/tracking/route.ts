import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr-pooler.us-east-2.aws.neon.tech/documents?sslmode=require'
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const order = searchParams.get('order') || 'DESC';
    
    let query = `
      SELECT * FROM "Tracking-acolyte-103-pricing-models"
      ORDER BY ${sortBy === 'id' ? 'id' : 'timestamp'} ${order}
    `;

    const result = await pool.query(query);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
} 