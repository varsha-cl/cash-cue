import React, { useState, useRef, useEffect } from 'react';
import { useDBStore } from '../postgres-db/stores';
import { SAMPLE_DATA } from '../postgres-db/postgres/sample-data';
import Message from '../components/Chat/Message';
import { useScrollLock } from '../components/Chat/useScrollLock';

function printDBStoreState() {
  const state = useDBStore.getState();
  console.log("printDBStoreState")
  console.log("Active Connection:", state.active);
  console.log("Databases:");
  // Object.entries(state.databases).forEach(([name, database]) => {
  //   console.log(`- ${name}:`, database);
  // });
}

const ChatUI = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dbs = useDBStore((state) => state.databases);
  const active = useDBStore((state) => state.active);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollLocked, setIsScrollLocked] = useState(false);
  
  // Use the scroll lock hook
  useScrollLock(isScrollLocked);
  
  // Scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior, 
        block: 'end' 
      });
    }
  };
  
  // Handle scroll events to detect when user manually scrolls
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // Only auto-scroll if user is already near the bottom
    setIsScrollLocked(isAtBottom);
  };
  
  // Add scroll event listener
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // Scroll to bottom when messages change, but only if scroll is locked
  useEffect(() => {
    if (isScrollLocked) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [orders, isScrollLocked]);
  
  // Initial scroll on component mount
  useEffect(() => {
    scrollToBottom('auto');
    setIsScrollLocked(true);
  }, []);

  useEffect(() => {
    const importAndQueryData = async () => {
      try {
        // Import sample data
        // useDBStore.getState().connect(database.name);
        printDBStoreState()
        const sampleData = SAMPLE_DATA.find(data => data.key === "orders");
        if (sampleData) {
          // await useDBStore.getState().import(sampleData);
          // console.log("Sample data imported successfully");
          // Query the orders table
          // console.log("dbs:", dbs)
          // console.log("active:", active)
          // const result = await useDBStore.getState().execute("SELECT *, event_start_time AT TIME ZONE 'UTC' AS event_start_time, event_end_time AT TIME ZONE 'UTC' AS event_end_time FROM user_events;");
          const result = await useDBStore.getState().execute("SELECT * from user_events;");


          // const result = await useDBStore.getState().execute("SELECT * FROM students;");
          console.log("chatresults:", result)
          setOrders(result || []);
        }
      } catch (err) {
        setError('Error importing sample data or querying orders');
        console.error('Error:', err);
      }
    };

    importAndQueryData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col bg-white shadow-lg rounded-lg overflow-hidden">
      <div 
        className="flex-1 p-4 overflow-y-auto"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {orders.map((order, index) => (
          <Message
            key={index}
            content={JSON.stringify(order)}
            role="user"
            timestamp={new Date()}
          />
        ))}
        
        <div ref={messagesEndRef} className="h-0" />
      </div>
      
      {/* New message indicator that appears when user has scrolled up */}
      {!isScrollLocked && orders.length > 0 && (
        <button 
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-1"
          onClick={() => {
            scrollToBottom();
            setIsScrollLocked(true);
          }}
        >
          <span className="text-lg">↓</span>
          <span>New messages</span>
        </button>
      )}
      
      {/* Your input component */}
    </div>
  );
};

export default ChatUI;