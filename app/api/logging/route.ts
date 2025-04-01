import { traceable } from "langsmith/traceable";
import { NextResponse } from 'next/server';
import { wrapOpenAI } from "langsmith/wrappers";
import { OpenAI } from "openai";

// Set max duration for serverless function
export const maxDuration = 300;

const openai = wrapOpenAI(new OpenAI());

// Debug environment in production
const debugEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment check:', {
      LANGCHAIN_API_KEY: !!process.env.LANGCHAIN_API_KEY,
      LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
      LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    });
  }
};

// Define the data structure for logging
interface LogData {
  userId: string;
  timestamp?: string;
  question: string;
  response: string;
}

const systemPrompt = `Just print the same response you received.`;

// Create a traceable function with timeout
const createCompletion = traceable(
  async (question: string, response: string) => {
    debugEnv();
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 25000);
      });

      const completionPromise = openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question: ${question}\nResponse: ${response}` }
        ],
      });

      const result = await Promise.race([completionPromise, timeoutPromise]) as OpenAI.Chat.ChatCompletion;
      return result;
    } catch (error) {
      console.error('Completion error:', error);
      throw error;
    }
  },
  { 
    name: "Tracing",
    run_type: "llm",
    project_name: process.env.LANGSMITH_PROJECT,
    metadata: {
      environment: process.env.NODE_ENV,
      deployment: 'vercel'
    }
  }
);

// Health check function to verify LangSmith connectivity
const checkLangSmithConnectivity = async () => {
  try {
    // Log a simple test message
    console.log('LangSmith environment variables:',
      {
        endpoint: process.env.LANGSMITH_ENDPOINT ? 'Set' : 'Not set',
        project: process.env.LANGSMITH_PROJECT ? 'Set' : 'Not set',
        tracing: process.env.LANGSMITH_TRACING ? 'Set' : 'Not set',
        apiKey: process.env.LANGCHAIN_API_KEY ? 'Set (length: ' + process.env.LANGCHAIN_API_KEY.length + ')' : 'Not set'
      }
    );
    
    return true;
  } catch (error) {
    console.error('LangSmith connectivity check failed:', error);
    return false;
  }
};

export async function POST(request: Request) {
  try {
    const { question, response } = await request.json();
    
    if (!question || !response) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await createCompletion(question, response);
    
    // Ensure trace is completed before responding
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({ 
      success: true,
      content: result.choices[0]?.message?.content,
      environment: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error('Route error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process completion', 
        details: (error as Error).message,
        environment: process.env.NODE_ENV 
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS method to handle CORS preflight requests if needed
export async function OPTIONS(request: Request) {
  return NextResponse.json(
    { success: true },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}
