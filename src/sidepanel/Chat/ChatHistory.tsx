import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SQLResultsModal } from './SQLResultsModal';

interface Message {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ChatHistoryProps {
  messages: Message[];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentResults, setCurrentResults] = useState<Record<string, unknown>[] | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleViewResults = (results: Record<string, unknown>[]) => {
    setCurrentResults(results);
    setModalOpen(true);
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h3 className="text-lg font-medium mb-2">Welcome to SQL-Buddy</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Ask questions about your data and get SQL queries and visualizations.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={cn(
              "px-4 py-3 rounded-lg",
              message.type === 'user' 
                ? "bg-primary/10 ml-8 mr-2" 
                : "bg-secondary/50 mr-8 ml-2"
            )}
          >
            <div className="flex items-center mb-1">
              <div 
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  message.type === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {message.type === 'user' ? 'U' : 'AI'}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {message.metadata?.queryResponse?.sql_results && (
              <div className="mt-2 flex justify-end">
                <button 
                  onClick={() => handleViewResults(message.metadata.queryResponse.sql_results)}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm rounded-md transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  View Results
                </button>
              </div>
            )}
            
            {/* Optionally show generated SQL in a smaller, collapsed section */}
            {message.metadata?.queryResponse?.sql_query && (
              <div className="mt-2 text-xs text-muted-foreground">
                <details className="group">
                  <summary className="cursor-pointer hover:text-foreground">
                    <span className="underline">Show Generated SQL</span>
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-sm font-mono overflow-x-auto">
                    {message.metadata.queryResponse.sql_query}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <SQLResultsModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={currentResults}
      />
    </>
  );
}; 