import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr-pooler.us-east-2.aws.neon.tech/documents?sslmode=require'
});

export async function POST(req: Request) {
  try {
    const { sessionId, question, response } = await req.json();
    const currentUTCTime = new Date().toISOString(); // Get current time in UTC

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Tracking-acolyte-103-pricing-models" (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        question TEXT NOT NULL,
        response TEXT NOT NULL,
        conversation_data JSONB DEFAULT '[]',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if session exists
    const existingSession = await pool.query(
      `SELECT * FROM "Tracking-acolyte-103-pricing-models" WHERE session_id = $1`,
      [sessionId]
    );

    if (existingSession.rows.length > 0) {
      // Update existing session by appending new conversation data
      const existingData = existingSession.rows[0].conversation_data || [];
      const updatedData = [...existingData, { 
        question, 
        response, 
        timestamp: currentUTCTime 
      }];
      
      const result = await pool.query(
        `UPDATE "Tracking-acolyte-103-pricing-models" 
         SET conversation_data = $1,
             timestamp = $2
         WHERE session_id = $3
         RETURNING *`,
        [JSON.stringify(updatedData), currentUTCTime, sessionId]
      );
      
      return NextResponse.json({ success: true, data: result.rows[0] });
    } else {
      // Create new session
      const result = await pool.query(
        `INSERT INTO "Tracking-acolyte-103-pricing-models" (session_id, question, response, conversation_data, timestamp) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          sessionId,
          question,
          response,
          JSON.stringify([{ 
            question, 
            response, 
            timestamp: currentUTCTime 
          }]),
          currentUTCTime
        ]
      );

      return NextResponse.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to store chat data' },
      { status: 500 }
    );
  }
} 