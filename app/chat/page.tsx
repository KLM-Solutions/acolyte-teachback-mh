'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Settings, Plus, MessageCircle, FileText, Send, Menu, X, Loader, Users, Volume2, VolumeX, Mic, Square, Home } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { useSystemPrompt } from '../context/SystemPromptContext';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': {
        ref?: any;
        src: string;
        background?: string;
        speed?: string;
        style?: React.CSSProperties;
        loop?: boolean;
        autoplay?: boolean;
      };
    }
  }
}

interface TTSControlsProps {
  messageContent: string;
  messageId: string;
  isEnabled: boolean;
  audioChunks: string[];
}

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lottiePlayerRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@2.0.8/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        throw new Error('Browser does not support voice recording. Please use Chrome, Firefox, or Edge.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;

      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          await processAudio(audioBlob);
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Failed to process audio');
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setError(null);

      if (lottiePlayerRef.current) {
        lottiePlayerRef.current.play();
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (lottiePlayerRef.current) {
          lottiePlayerRef.current.pause();
          lottiePlayerRef.current.currentTime = 0;
        }
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Failed to stop recording');
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process audio');
      }

      const data = await response.json();
      if (data.text) {
        onTranscription(data.text);
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setIsProcessing(false);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`p-2 rounded-full transition-all duration-200 ${
          isRecording ? 'bg-transparent scale-125' : 'bg-gray-100'
        } hover:bg-opacity-90 disabled:opacity-50`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        type="button"
      >
        {isProcessing ? (
          <Loader className="w-4 h-4 animate-spin text-gray-600" />
        ) : isRecording ? (
          <div className="w-12 h-12 transform scale-125">
            <video
              ref={lottiePlayerRef as any}
              src="/Animation - 1736917881376.webm"
              className="w-full h-full"
              loop
              autoPlay
              muted
            />
          </div>
        ) : (
          <Mic className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
};
// This function splits a text into chunks based on natural breakpoints
// to improve the flow and quality of text-to-speech output
const chunkResponse = (text: string, chunkSize: number = 200) => {
  // Remove ** and # symbols from the text
  const sanitizedText = text.replace(/[\*\#]/g, '');

  // Split by natural breakpoints (periods followed by space, question marks, exclamation points)
  const sentences = sanitizedText.match(/[^.!?]+[.!?]+\s*/g) || [];
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit, start a new chunk
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  // Add the final chunk if there's anything left
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If we have no chunks (maybe the input had no proper sentences),
  // fall back to word-based chunking
  if (chunks.length === 0) {
    const words = sanitizedText.split(' ');
    currentChunk = '';
    
    for (const word of words) {
      if ((currentChunk + ' ' + word).length <= chunkSize || currentChunk.length === 0) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }
  
  return chunks;
};
const TTSControls: React.FC<TTSControlsProps> = ({ messageContent, messageId, isEnabled, audioChunks }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const playNextChunk = async (chunkIndex: number) => {
    if (chunkIndex >= audioChunks.length) {
      setIsPlaying(false);
      setCurrentChunkIndex(0);
      return;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Z5A0ZMhOWwL3m0q2Yo1P/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': 'sk_92abd11707faa16905cdcba5849819cd5b380993a19c10fc',
        },
        body: JSON.stringify({
          text: audioChunks[chunkIndex],
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setCurrentChunkIndex(chunkIndex + 1);
          playNextChunk(chunkIndex + 1);
        };
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    }
  };
  
  const togglePlayback = async () => {
    if (isLoading || !isEnabled) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
      setIsPlaying(false);
      setCurrentChunkIndex(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(true);
      await playNextChunk(0);
    } catch (err) {
      console.error('TTS Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, []);
  
  if (!isEnabled) return null;
  
  return (
    <div className="flex items-center space-x-2 mt-4">
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md transition-colors text-sm ${
          isPlaying ? 'bg-[#3CBFAE] text-white' : 'bg-[#3CBFAE] text-white'
        } hover:bg-[#35a99a] disabled:opacity-50`}
        title={isPlaying ? 'Stop' : 'Play'}
      >
        {isLoading ? (
          <div className="flex items-center">
            <Loader className="w-4 h-4 animate-spin text-white" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : isPlaying ? (
          <div className="flex items-center">
            <VolumeX className="w-4 h-4 mr-2" />
            <span>Stop Audio</span>
          </div>
        ) : (
          <div className="flex items-center">
            <Volume2 className="w-4 h-4 mr-2" />
            <span>Play Audio</span>
          </div>
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-500">Failed to play audio</span>
      )}
      
      <audio
        ref={audioRef}
        onError={() => {
          setError('Audio playback failed');
          setIsPlaying(false);
        }}
      />
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#000000]" />
  </div>
);

const InstructionsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { aboutExercise, taskDescription } = useSystemPrompt();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h3 className="text-xl font-semibold text-gray-900">Instructions</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="prose max-w-none">
            <h4 className="text-lg font-medium mb-3">About This Exercise</h4>
            <p>
              {aboutExercise}
            </p>
            
            <h4 className="text-lg font-medium mt-5 mb-3">Your Task</h4>
            <div className="text-gray-700 prose max-w-none">
              <ReactMarkdown>{taskDescription}</ReactMarkdown>
            </div>
            
            <h4 className="text-lg font-medium mt-5 mb-3">How to Use This Tool</h4>
            <ol className="list-decimal pl-5 my-3">
              <li>Click "Begin" to start the exercise.</li>
              <li>Your learning guide will ask you questions about the content in this course.</li>
              <li>Respond to each question to practice your explanation skills.</li>
              <li>Your learning guide may prompt you to provide more information or clarify key topics.</li>
              <li>Press the audio button underneath each prompt for sound, and use the voice recording option if you prefer to speak your responses.</li>
            </ol>
            
            <h4 className="text-lg font-medium mt-5 mb-3">Tips for Success</h4>
            <ul className="list-disc pl-5 my-3">
              <li>Use clear, concise language that clients can understand.</li>
              <li>Provide specific examples to illustrate complex concepts.</li>
              <li>Connect theoretical concepts to practical implications.</li>
              <li>Practice explaining these concepts in your own words.</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#3CBFAE] text-white px-4 py-2 rounded-md hover:bg-[#35a99a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ScoreRubricModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h3 className="text-xl font-semibold text-gray-900">Scoring Rubric (8 Points Total)</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Comprehensiveness Section */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-900">Comprehensiveness (4 points)</h4>
              <ul className="space-y-2 text-gray-800">
                <li><strong>4:</strong> Clearly defines methodologies, explains impact, connects to consulting</li>
                <li><strong>3:</strong> Mentions methodologies and impact, lacks full connection</li>
                <li><strong>2:</strong> Vague definitions, little explanation</li>
                <li><strong>1:</strong> Unclear or incorrect response</li>
              </ul>
            </div>

            {/* Clarity & Structure Section */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-900">Clarity & Structure (4 points)</h4>
              <ul className="space-y-2 text-gray-800">
                <li><strong>4:</strong> Clear, well-organized explanation</li>
                <li><strong>3:</strong> Mostly clear, needs better structure</li>
                <li><strong>2:</strong> Somewhat unclear or disorganized</li>
                <li><strong>1:</strong> Hard to follow or confusing</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-green-600 font-medium">Passing Score: 6+ out of 8</p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#3CBFAE] text-white px-4 py-2 rounded-md hover:bg-[#35a99a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionCard = () => {
  const { taskDescription } = useSystemPrompt();
  
  return (
    <div className="flex justify-start ml-10 mt-4">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 max-w-[85%] sm:max-w-[75%]">
        <div className="flex items-center mb-3">
          <FileText size={20} className="text-[#1AAFEE] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Your Task</h3>
        </div>
        <div className="text-gray-700 prose max-w-none">
          <ReactMarkdown>{taskDescription}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

const IntroVideoModal = ({ isOpen, onClose, onBegin }: { isOpen: boolean; onClose: () => void; onBegin: () => void; }) => {
  // Removed the modal logic for the intro video
  // ...
};

export default function ChatPage() {
  const [userId] = useState(() => uuidv4());
  const [showButtons, setShowButtons] = useState(true);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuestionSelected, setIsQuestionSelected] = useState(false);
  const [selectedPersona] = useState('roleplay');
  const [instructionsShown, setInstructionsShown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInputArea, setShowInputArea] = useState(false);
  const [isScoreRubricOpen, setIsScoreRubricOpen] = useState(false);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [isIntroVideoOpen, setIsIntroVideoOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const { systemPrompt, heading, description, pageTitle, aboutExercise, taskDescription } = useSystemPrompt();

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, setMessages, setInput } = useChat({
    api: '/api/chat',
    body: { 
      userId,
      tts: isTTSEnabled,
      mode: 'chat',
      systemPrompt: systemPrompt
    },
    onResponse: (response) => {
      console.log('Response started:', response);
      setError(null);
      setIsQuestionSelected(false);
    },
    onFinish: async (message) => {
      const currentInputValue = input;
      
      setCurrentQuestion(currentInputValue);
      setCurrentResponse(message.content);
      
      // Log the entire response before chunking
      console.log('Full response:', message.content);
      
      // Chunk the response and store it
      const chunks = chunkResponse(message.content, 200); // Adjust chunk size as needed
      
      // Log the chunks to verify
      console.log('Chunks:', chunks);
      
      setAudioChunks(chunks);
      
      // Call the store API to save the question and response
      try {
        await fetch('/api/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: userId, // Assuming userId is the sessionId
            question: currentInputValue,
            response: message.content,
          }),
        });
      } catch (error) {
        console.error('Error storing chat data:', error);
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setError('Failed to process your request. Please try again.');
    }
  });

  const startScenario = async (type: 'Begin' | 'Instructions') => {
    const startMessage = type;
    setInput(startMessage);
    
    try {
      const fakeEvent = new Event('submit') as unknown as React.FormEvent<HTMLFormElement>;
      await handleSubmit(fakeEvent);
    } catch (error) {
      console.error(`Error starting ${type} scenario:`, error);
      setError(`Failed to start ${type} scenario`);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const logUserQuestion = async (question: string, response: string) => {
    try {
      console.log('Logging question:', { userId, question, response });

      await fetch('/api/logging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'status': '200'
        },
        body: JSON.stringify({
          userId,
          question,
          response
        }),
      });
    } catch (error) {
      console.error('Error logging question:', error);
    }
  };

  const enhancedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    try {
        const currentInputValue = input.trim();
        setCurrentQuestion(currentInputValue);
        const responseMessage = await handleSubmit(e); // Assuming handleSubmit returns the response message

        // Log the user's question and response to the store
        await logUserQuestion(currentInputValue, currentResponse);

        // Send data to the store route
       
    } catch (error) {
        console.error('Error submitting question:', error);
        setError('Failed to process your request');
    }
  };

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    setMessages([]);
    setInput('');
    setShowButtons(true);
    setError(null);
  };

  const handleBeginClick = () => {
    setShowButtons(false);
    setInstructionsShown(false);
    setShowInputArea(true);
    setInput('Begin');
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  };

  const handleInstructionsClick = () => {
    setIsModalOpen(true);
  };

  const handlePostInstructionsBegin = () => {
    setShowButtons(false);
    setInstructionsShown(false);
    setShowInputArea(true);
    setInput('Begin');
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  };

  const customHandleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    setIsQuestionSelected(!!e.target.value.trim());
  };

  const playIntroMessage = async () => {
    if (hasPlayedIntro) return;
    
    try {
      const introText = "You will practice articulating how drug pricing methodologies impact the cost of pharmaceuticals and why this matters in pharmacy benefits consulting";
      
      // Removed the fetch call to Eleven Labs API for intro audio
      // const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/qLhgJ67YB77mwXXmI6XF/stream', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'xi-api-key': 'sk_92abd11707faa16905cdcba5849819cd5b380993a19c10fc',
      //   },
      //   body: JSON.stringify({
      //     text: introText,
      //     model_id: 'eleven_monolingual_v1',
      //     voice_settings: {
      //       stability: 0.5,
      //       similarity_boost: 0.5
      //     }
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to generate intro audio');
      // }
      
      // const audioBlob = await response.blob();
      // const audioUrl = URL.createObjectURL(audioBlob);
      
      // if (introAudioRef.current) {
      //   introAudioRef.current.src = audioUrl;
      //   await introAudioRef.current.play();
      //   setHasPlayedIntro(true);
      // }
    } catch (err) {
      console.error('Intro audio error:', err);
    }
  };

  useEffect(() => {
    if (!hasPlayedIntro && messages.length === 0) {
      playIntroMessage();
    }
  }, [hasPlayedIntro, messages.length]);

  useEffect(() => {
    return () => {
      if (introAudioRef.current) {
        URL.revokeObjectURL(introAudioRef.current.src);
      }
    };
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
        } catch (error) {
          console.error('Error attempting to play the video:', error);
        }
      }
    };

    playVideo();
  }, []);

  return (
    <div className="flex h-screen bg-[#F5F5F5] relative font-['Roboto', sans-serif]">
      <audio
        ref={introAudioRef}
        onError={(e) => console.error('Audio playback error:', e)}
      />
      <InstructionsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
      <ScoreRubricModal
        isOpen={isScoreRubricOpen}
        onClose={() => setIsScoreRubricOpen(false)}
      />

      <div className="flex-1 flex flex-col w-full">
        <div className="bg-white p-2 sm:p-4 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center">
            <img 
              src="./Side-text.png" 
              alt="Lockton Logo" 
              className="h-8 sm:h-10 mr-2 sm:mr-4"
            />
            <h2 className="text-lg sm:text-xl text-[#000000] truncate max-w-[200px] sm:max-w-full">
              {pageTitle}
            </h2>
          </div>
          <div className="flex space-x-2 sm:space-x-4">
            <button 
              onClick={() => setIsScoreRubricOpen(true)}
              className="bg-[#3CBFAE] text-white p-2 sm:px-4 sm:py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#35a99a] transition-colors duration-300 transform hover:scale-105"
            >
              <Users size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Scoring</span>
            </button>
            <button 
              onClick={handleInstructionsClick}
              className="bg-[#3CBFAE] text-white p-2 sm:px-4 sm:py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#35a99a] transition-colors duration-300 transform hover:scale-105"
            >
              <Settings size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Instructions</span>
            </button>
            <Link 
              href="/"
              className="bg-[#3CBFAE] text-white p-2 sm:px-4 sm:py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#35a99a] transition-colors duration-300 transform hover:scale-105">
              <Home size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Start Over</span>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 sm:p-4 bg-[#F5F5F5]">
          {messages.length === 0 && (
            <div className="flex flex-col justify-center items-center h-full my-2 sm:my-8">
              <h2 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 text-[#000000]">{heading}</h2>
              <div className="max-w-2xl mx-auto px-2 sm:px-0">
                {showButtons && (
                  <div className="flex justify-center space-x-2 sm:space-x-4 mb-4 sm:mb-8">
                    <button 
                      onClick={handleBeginClick}
                      className="bg-[#3CBFAE] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#35a99a] transition-colors duration-300 transform hover:scale-105"
                    >
                      <FileText size={16} className="sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Begin</span>
                    </button>
                    
                    <button onClick={toggleMute} className="flex items-center bg-[#3CBFAE] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md hover:bg-[#35a99a] transition-colors duration-300 transform hover:scale-105">
                      <span className="flex items-center">
                        {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        <span className="ml-1 sm:ml-2 text-sm sm:text-base">{isMuted ? 'Play' : 'Mute'}</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-center mb-4">
                <video 
                  ref={videoRef} 
                  className="w-full sm:w-1/2 h-auto max-w-full sm:max-w-1/2 max-h-[50vh] sm:max-h-[90vh] object-cover"
                  muted={isMuted}
                  controls={false} 
                  onEnded={() => setIsIntroVideoOpen(false)}
                >
                  <source src="/103-Teach-Back_ Drug Pricing Methodologies and Cost Impact.mp4" type="video/mp4" />
                  <p>Your browser does not support the video tag. Please use a different browser or update your current one.</p>
                </video>
              </div>
              <p className="text-slate-600 mb-4 sm:mb-8 text-sm sm:text-base px-2 sm:px-0">
                <br></br>
                {description}
              </p>
            </div>
          )}
          <div className="space-y-3 sm:space-y-4">
            {messages.map((m, index) => (
              <React.Fragment key={m.id}>
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="mr-1 sm:mr-2 flex items-start pt-2">
                      <img 
                        src="/A2.png" 
                        alt="AI Assistant"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-2 sm:p-4 rounded-lg shadow-sm ${
                      m.role === 'user'
                        ? 'bg-white text-gray-900 border border-slate-200'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    <div className={`text-xs sm:text-base prose max-w-none ${
                      m.role === 'user' ? 'prose-slate' : 'prose-slate'
                    }`}>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.role === 'assistant' && (
                      <div className="mt-2">
                        <TTSControls 
                          messageContent={m.content} 
                          messageId={m.id} 
                          isEnabled={isTTSEnabled}
                          audioChunks={audioChunks}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {m.role === 'assistant' && 
                 m.content.includes('Answer the question below') && 
                 index === 1 && 
                 <QuestionCard />}
              </React.Fragment>
            ))}
            
            {instructionsShown && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <div className="flex justify-start ml-4 sm:ml-10">
                <button 
                  onClick={handlePostInstructionsBegin}
                  className="bg-[#3CBFAE] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#35a99a] transition-colors duration-300 transform hover:scale-105 text-sm sm:text-base"
                >
                  <FileText size={16} className="sm:w-5 sm:h-5" />
                  <span>Begin</span>
                </button>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="mr-1 sm:mr-2 flex items-start pt-2">
                  <img 
                    src="/A2.png" 
                    alt="AI Assistant"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                  />
                </div>
                <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-lg shadow-sm">
                  <LoadingSpinner />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showInputArea && (
          <div className="p-2 sm:p-4 border-t border-slate-200 bg-white">
            <form ref={formRef} onSubmit={enhancedSubmit} className="space-y-2">
              <div className="flex space-x-1 sm:space-x-4">
                <textarea
                  value={input}
                  onChange={customHandleInputChange}
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder="Type your message here..."
                  className="flex-1 p-2 sm:p-3 text-xs sm:text-base border border-slate-200 rounded-md focus:outline-none focus:border-[#3CBFAE] focus:ring-1 focus:ring-[#3CBFAE] bg-white text-slate-900 resize-none overflow-y-auto min-h-[36px] sm:min-h-[40px] max-h-[120px] sm:max-h-[160px]"
                  style={{
                    height: 'auto',
                    minHeight: '36px',
                    maxHeight: '120px'
                  }}
                />
                <VoiceRecorder
                  onTranscription={(text) => {
                    setInput(text);
                    setIsQuestionSelected(true);
                  }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !isQuestionSelected)}
                  className={`bg-[#D94B87] text-white px-2 sm:px-4 py-2 rounded-md flex items-center space-x-1 sm:space-x-2 hover:bg-[#C43A76] transition-colors duration-300 transform hover:scale-105 ${
                    (!input.trim() && !isQuestionSelected) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <Send size={16} className="sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline text-sm sm:text-base">Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white p-1 sm:p-2 border-t border-slate-200">
          <div className="text-[10px] sm:text-xs text-gray-500 text-center">
            <div>Powered by Acolyte Health</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-16 sm:bottom-20 right-2 sm:right-4 bg-red-100 border border-red-400 text-red-700 px-2 sm:px-4 py-2 sm:py-3 rounded text-xs sm:text-sm max-w-[90%] sm:max-w-md">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-2 sm:px-4"
          >
            <span className="text-red-500">&times;</span>
          </button>
        </div>
      )}
    </div>
  );
}
