import { ElevenLabsClient } from 'elevenlabs';
import { NextRequest, NextResponse } from 'next/server';

const client = new ElevenLabsClient();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const audioStream = await client.textToSpeech.convertAsStream('JBFqnCBsd6RMkjVDRZzb', {
      text: text,
      model_id: 'eleven_multilingual_v2',
    });

    // Convert the audio stream to an array buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Return the audio as a response with appropriate headers
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'Failed to convert text to speech' },
      { status: 500 }
    );
  }
}
