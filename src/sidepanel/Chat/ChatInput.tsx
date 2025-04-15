import React, { useState, ChangeEvent, FormEvent } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
  executeSQL?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  loading,
  executeSQL = true
}) => {
  const [message, setMessage] = useState<string>('');

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col space-y-2">
        <div className="flex">
          <textarea
            value={message}
            onChange={handleMessageChange}
            placeholder="Ask a question about your data..."
            className={cn(
              "flex-1 p-3 text-sm rounded-l-md border border-input",
              "bg-background min-h-[80px] max-h-[160px] resize-y",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            )}
            disabled={loading}
          />
          
          <button
            type="submit"
            className={cn(
              "bg-primary text-primary-foreground px-4 py-2 rounded-r-md",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            disabled={loading || !message.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </form>
  );
}; 