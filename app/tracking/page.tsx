'use client';
import { useState, useEffect } from 'react';
import { Loader, Clock, Hash, Search, ChevronDown, ChevronUp, Download, ChevronRight, Maximize2, X } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Conversation {
  id: number;
  session_id: string;
  conversation_data: Array<{
    question: string;
    response: string;
    timestamp: string;
  }>;
  timestamp: string;
}

interface SessionModalProps {
  conversation: Conversation;
  onClose: () => void;
}

const SessionModal: React.FC<SessionModalProps> = ({ conversation, onClose }) => {
  const formatModalTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            Session Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          {conversation.conversation_data.map((message, index) => (
            <div key={index}>
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="mb-2">
                  <p className="font-bold text-gray-900 mb-1">Question:</p>
                  <p className="text-gray-700">{message.question}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Response:</p>
                  <article className="prose prose-slate prose-lg max-w-none">
                    <ReactMarkdown>{message.response}</ReactMarkdown>
                  </article>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatModalTimestamp(message.timestamp)}
                </p>
              </div>
              {index < conversation.conversation_data.length - 1 && (
                <div className="my-3 border-b border-gray-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'timestamp' | 'id'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [popoutSession, setPopoutSession] = useState<Conversation | null>(null);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tracking?sortBy=${sortBy}&order=${sortOrder}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [sortBy, sortOrder]);

  const toggleSort = (field: 'timestamp' | 'id') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const toggleSession = (sessionId: string) => {
    const newExpandedSessions = new Set(expandedSessions);
    if (expandedSessions.has(sessionId)) {
      newExpandedSessions.delete(sessionId);
    } else {
      newExpandedSessions.add(sessionId);
    }
    setExpandedSessions(newExpandedSessions);
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    
    // Search in session ID
    if (conv.session_id.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    
    // Search in conversation data
    return conv.conversation_data.some(msg => 
      msg.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.response.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatSessionName = (timestamp: string) => {
    const date = new Date(timestamp);
    return `Session ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    })}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const downloadCSV = () => {
    try {
      // Create CSV headers - include both UTC and Local time
      const headers = [
        'Session Date (Local)',
        'Session Date (UTC)',
        'Session ID',
        'Question',
        'Response',
        'Timestamp (Local)',
        'Timestamp (UTC)'
      ];
      
      // Format data for CSV with both UTC and local timestamps
      const csvData = conversations.flatMap(conversation => 
        conversation.conversation_data.map(message => {
          const sessionDate = new Date(conversation.timestamp);
          const messageDate = new Date(message.timestamp);
          
          return [
            sessionDate.toLocaleString(),
            conversation.timestamp,
            conversation.session_id,
            message.question.replace(/"/g, '""'),
            message.response.replace(/"/g, '""'),
            messageDate.toLocaleString(),
            message.timestamp
          ];
        })
      );
      
      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Create and trigger download with UTC date in filename
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const utcDate = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `conversation_data_UTC_${utcDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tracking user Conversation</h1>
            <div className="flex space-x-4">
              <button
                onClick={downloadCSV}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center space-x-2"
              >
                <Download size={20} />
                <span>Download CSV</span>
              </button>
              <Link 
                href="/chat"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Back to Chat
              </Link>
            </div>
          </div>

          {/* Search and Sort Controls */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => toggleSort('timestamp')}
                className={`flex items-center space-x-2 px-4 py-2 rounded ${
                  sortBy === 'timestamp' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 dark:text-white'
                }`}
              >
                <Clock size={16} />
                <span>Time</span>
                {sortBy === 'timestamp' && (
                  sortOrder === 'ASC' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                )}
              </button>
              <button
                onClick={() => toggleSort('id')}
                className={`flex items-center space-x-2 px-4 py-2 rounded ${
                  sortBy === 'id' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 dark:text-white'
                }`}
              >
                <Hash size={16} />
                <span>Sequence</span>
                {sortBy === 'id' && (
                  sortOrder === 'ASC' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Conversations List */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.session_id}
                  className={`border border-gray-200 rounded-lg p-4 transition-all duration-200 ${
                    expandedSessions.has(conversation.session_id) 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="flex justify-between items-center"
                  >
                    <div 
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => toggleSession(conversation.session_id)}
                    >
                      <ChevronRight 
                        className={`transform transition-transform duration-200 ${
                          expandedSessions.has(conversation.session_id) 
                            ? 'rotate-90 text-blue-500' 
                            : 'text-gray-400'
                        }`}
                        size={20}
                      />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {formatSessionName(conversation.timestamp)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Session ID: {conversation.session_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {conversation.conversation_data.length} messages
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopoutSession(conversation);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Open in popup"
                      >
                        <Maximize2 size={18} className="text-gray-500 hover:text-blue-500" />
                      </button>
                    </div>
                  </div>

                  {expandedSessions.has(conversation.session_id) && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      {conversation.conversation_data.map((message, index) => (
                        <div key={index}>
                          <div className="border-l-4 border-blue-500 pl-4">
                            <div className="mb-2">
                              <p className="font-bold text-gray-900 mb-1">Question:</p>
                              <p className="text-gray-700">{message.question}</p>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 mb-1">Response:</p>
                              <article className="prose prose-sm max-w-none">
                                <ReactMarkdown>{message.response}</ReactMarkdown>
                              </article>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTimestamp(message.timestamp)}
                            </p>
                          </div>
                          {index < conversation.conversation_data.length - 1 && (
                            <div className="my-3 border-b border-gray-200" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popup Modal */}
      {popoutSession && (
        <SessionModal 
          conversation={popoutSession} 
          onClose={() => setPopoutSession(null)} 
        />
      )}
    </div>
  );
}