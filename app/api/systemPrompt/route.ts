import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Use the same connection string as your other database connections
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr-pooler.us-east-2.aws.neon.tech/documents?sslmode=require'
});

// First, let's create the table if it doesn't exist
async function ensureTableExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "acolyte-teachback-mh" (
        id SERIAL PRIMARY KEY,
        prompt TEXT NOT NULL DEFAULT '',
        heading TEXT NOT NULL DEFAULT '👋 Hi There!',
        description TEXT NOT NULL DEFAULT '',
        page_title TEXT NOT NULL DEFAULT 'Teach Back : Testing agent',
        about_exercise TEXT NOT NULL DEFAULT 'In this practice session, you will practice articulating how drug pricing methodologies impact the cost of pharmaceuticals and why this matters in pharmacy benefits consulting.',
        task_description TEXT NOT NULL DEFAULT 'Explain how drug pricing benchmarks impact pharmacy costs and reimbursement, and why this matters in pharmacy benefits consulting.',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if there's at least one row
    const rowCount = await pool.query('SELECT COUNT(*) FROM "acolyte-teachback-mh"');
    
    // If no rows exist, insert a default row
    if (parseInt(rowCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO "acolyte-teachback-mh" (prompt, heading, description, page_title, about_exercise, task_description)
        VALUES (
          'You are a specialized assistant with the following guidelines...',
          '👋 Hi There!',
          'Welcome to the practice session.',
          'Teach Back : Testing agent',
          'In this practice session, you will practice articulating how drug pricing methodologies impact the cost of pharmaceuticals and why this matters in pharmacy benefits consulting.',
          'Explain how drug pricing benchmarks impact pharmacy costs and reimbursement, and why this matters in pharmacy benefits consulting.'
        )
      `);
    }
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    throw error;
  }
}

export async function GET() {
  try {
    // Ensure the table exists with the correct schema
    await ensureTableExists();
    
    const result = await pool.query(
      'SELECT prompt, heading, description, page_title as "pageTitle", about_exercise as "aboutExercise", task_description as "taskDescription" FROM "acolyte-teachback-mh" ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        prompt: '',
        heading: '👋 Hi There!',
        description: '',
        pageTitle: 'Teach Back : Testing agent',
        aboutExercise: 'In this practice session, you will practice articulating how drug pricing methodologies impact the cost of pharmaceuticals and why this matters in pharmacy benefits consulting.',
        taskDescription: 'Explain how drug pricing benchmarks impact pharmacy costs and reimbursement, and why this matters in pharmacy benefits consulting.'
      });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompt' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Ensure the table exists with the correct schema
    await ensureTableExists();
    
    const data = await request.json();
    
    // Build the SET clause dynamically based on provided fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    // Check each possible field and add it to the update if present
    if ('prompt' in data) {
      updateFields.push(`prompt = $${paramIndex}`);
      values.push(data.prompt);
      paramIndex++;
    }
    
    if ('heading' in data) {
      updateFields.push(`heading = $${paramIndex}`);
      values.push(data.heading);
      paramIndex++;
    }
    
    if ('description' in data) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }
    
    if ('pageTitle' in data) {
      updateFields.push(`page_title = $${paramIndex}`);
      values.push(data.pageTitle);
      paramIndex++;
    }
    
    if ('aboutExercise' in data) {
      updateFields.push(`about_exercise = $${paramIndex}`);
      values.push(data.aboutExercise);
      paramIndex++;
    }
    
    if ('taskDescription' in data) {
      updateFields.push(`task_description = $${paramIndex}`);
      values.push(data.taskDescription);
      paramIndex++;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update, return success
    if (updateFields.length === 0) {
      return NextResponse.json({ success: true, message: 'No fields to update' });
    }
    
    // Build and execute the query
    const query = `
      UPDATE "acolyte-teachback-mh" 
      SET ${updateFields.join(', ')}
      WHERE id = (SELECT id FROM "acolyte-teachback-mh" ORDER BY updated_at DESC LIMIT 1)
      RETURNING prompt, heading, description, page_title as "pageTitle", about_exercise as "aboutExercise", task_description as "taskDescription"
    `;
    
    const result = await pool.query(query, values);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update system prompt' },
      { status: 500 }
    );
  }
} 