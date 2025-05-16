import React, { useEffect, useRef } from 'react';
import './Chat.css';

interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;
}

const Message: React.FC<MessageProps> = ({ content, role, timestamp }) => {
  const messageRef = useRef<HTMLDivElement>(null);
  
  // Add visibility check when message is rendered
  useEffect(() => {
    if (messageRef.current) {
      // Force layout recalculation
      void messageRef.current.offsetHeight;
    }
  }, []);
  
  return (
    <div 
      ref={messageRef}
      className={`message ${role === 'user' ? 'user-message' : 'ai-message'}`}
    >
      <div className="message-content">{content}</div>
      {timestamp && (
        <div className="message-timestamp">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
};

export default Message; 