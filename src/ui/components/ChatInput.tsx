import React, { useState, FormEvent } from 'react';
import { Button } from './button';
import { Send } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={handleMessageChange}
          placeholder="Ask a question about your data..."
          disabled={loading}
          className={cn(
            "flex h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "rounded-r-none resize-none overflow-y-auto"
          )}
        />
        <Button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-l-none h-[80px] px-8"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}; 
