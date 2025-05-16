import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaPaperPlane, FaInfoCircle, FaStop } from 'react-icons/fa';
import { Message } from 'ai';
import { aiServiceAPI } from '../Ai/Ai';
import useAppStore from '../state-utils/state-management';
import { useTTS } from '../../context/TTSContext';


import { FaVolumeUp, FaVolumeMute, FaPause, FaPlay } from 'react-icons/fa';

interface ExtendedMessage extends Message {
  steps?: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showSteps, setShowSteps] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef(null);
  const { incrementDataVersion, lastAiSteps, setLastAiSteps } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioData, setAudioData] = useState<number[]>(new Array(10).fill(0));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { isTtsOn, setIsTtsOn, synth } = useTTS();
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // how much of the current assistant message we have spoken already
  const spokenLengthRef = useRef(0);
  // buffer any partial sentence we’re still waiting to finish
  const partialRef = useRef<string>('');
  // simple queue flag so we don’t overlap utterances
  const speakingRef = useRef(false);

  // Scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const enqueueSpeech = (text: string) => {
    if (!isTtsOn || !synth || !text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => {
      speakingRef.current = false;               // free the channel
      // if new text accumulated while we were talking, speak it now
      if (partialRef.current && isTtsOn) {
        const next = partialRef.current;
        partialRef.current = '';
        enqueueSpeech(next);
      }
    };

    speakingRef.current = true;
    synth.speak(u);
  };


  useEffect(() => {
    if (!isTtsOn || !synth) return;
    if (!isAiTyping && partialRef.current.trim()) {
      if (speakingRef.current) {
      } else {
        enqueueSpeech(partialRef.current);
        partialRef.current = '';
      }
    }
  }, [isAiTyping, isTtsOn, synth]);



  // Adjust the height of the textarea
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const maxHeight = 500; // Match the max-height in CSS
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  // Handle sending a message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);

    setIsAiTyping(true);

    spokenLengthRef.current = 0;
    partialRef.current = '';
    speakingRef.current = false;
    synth?.cancel();

    const userMessage: ExtendedMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await aiServiceAPI.getAIResponse(newMessages);
      console.log("ai response", response)
      const reader = response.body?.getReader();
      let result = '';

      // Add an initial AI message
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '', steps: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const content = chunk.split('\n')
          .filter(line => line.startsWith('0:'))
          .map(line => line.slice(3).replace(/^"|"$/g, ''))
          .join('');

        result += content.replace(/\\n/g, '\n').replace(/\n/g, '\n');

        const newPortion = result.slice(spokenLengthRef.current);
        spokenLengthRef.current = result.length;

        const pieces = newPortion.split(/([.!?]\s|\n)/g);

        const finished = pieces.slice(0, -1).join('');
        const unfinished = pieces.slice(-1)[0] ?? '';

        if (finished) {
          if (speakingRef.current) {         // currently talking → queue
            partialRef.current += finished;
          } else {
            enqueueSpeech(finished);
          }
        }
        partialRef.current += unfinished;

        // Update the AI's message in real-time as chunks arrive
        setMessages(prevMessages => [
          ...prevMessages.slice(0, -1),
          { role: 'assistant', content: result, steps: '' }
        ]);
      }

      if (partialRef.current.trim()) {
        if (speakingRef.current) {

        } else {
          enqueueSpeech(partialRef.current);
        }
        partialRef.current = '';
      }


      // Update steps for the last message after processing is complete
      //   updateStepsTaken("Step 1: Analyzed user input\nStep 2: Generated response\nStep 3: Formatted output");
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setIsAiTyping(false);
      incrementDataVersion();
    }

    // Force scroll to bottom after sending
    setTimeout(() => {
      scrollToBottom('auto');
    }, 10);
  };

  const toggleSteps = (index: number) => {
    setShowSteps(prevState => prevState === index ? null : index);
  };

  const updateStepsTaken = (steps: string) => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.steps = steps;
      }
      return newMessages;
    });
  };

  useEffect(() => {
    console.log("lastAiSteps", lastAiSteps)
    if (lastAiSteps && lastAiSteps !== null) {
      updateStepsTaken(lastAiSteps);
      setLastAiSteps(null); // Reset lastAiSteps after updating
    }
  }, [lastAiSteps]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        await transcribeAndSetInput(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      visualizeAudio();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const audioData = Array.from(dataArray.slice(0, 10)).map(value => value / 255);
    setAudioData(audioData);

    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  const transcribeAndSetInput = async (blob: Blob) => {
    console.log("transcribeAndSetInput")
    try {
      const transcription = await aiServiceAPI.transcribeAudio(blob);
      setInput(transcription);
    } catch (error) {
      console.error('Error transcribing audio:', error);
    }
  };

  const submitAudio = async () => {
    console.log("submitAudio")
    if (!audioBlob) return;

    setIsLoading(true);
    setIsAiTyping(true);

    try {
      // First, transcribe the audio
      const transcription = await aiServiceAPI.transcribeAudio(audioBlob);

      // Add the transcription as a user message
      const userMessage: ExtendedMessage = { role: 'user', content: transcription };
      setMessages(prevMessages => [...prevMessages, userMessage]);

      // Now, get AI response for the transcription
      const response = await aiServiceAPI.getAIResponse([...messages, userMessage]);

      // Process the response similar to text submissions
      const reader = response.body?.getReader();
      let result = '';

      // Add an initial AI message
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '', steps: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const content = chunk.split('\n')
          .filter(line => line.startsWith('0:'))
          .map(line => line.slice(3).replace(/^"|"$/g, ''))
          .join('');

        result += content.replace(/\\n/g, '\n').replace(/\n/g, '\n');

        // Update the AI's message in real-time as chunks arrive
        setMessages(prevMessages => [
          ...prevMessages.slice(0, -1),
          { role: 'assistant', content: result, steps: '' }
        ]);
      }

    } catch (error) {
      console.error('Error submitting audio:', error);
    } finally {
      setIsLoading(false);
      setIsAiTyping(false);
      setAudioBlob(null);
      incrementDataVersion();
    }
  };

  // Add this function to handle smooth scrolling
  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior,
        block: 'end'
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // Only scroll smoothly if AI is not currently typing
    // This prevents constant scrolling during streaming responses
    if (!isAiTyping) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      // When AI is typing, only scroll if we're near the bottom already
      // This prevents jittering when user has scrolled up to read history
      const chatContainer = chatContainerRef.current;
      if (chatContainer) {
        const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
        if (isNearBottom) {
          scrollToBottom('auto'); // Use 'auto' for smoother updates during typing
        }
      }
    }
  }, [messages, isAiTyping]); // Added isAiTyping as a dependency

  // Handle initial scroll on component mount
  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[90vh] relative bg-white rounded-xl shadow-md overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-200">
            Start typing or use the microphone to talk to CashCow
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 max-w-[80%] break-words p-3 rounded-2xl relative animate-[messageAppear_0.3s_ease-out] ${message.role === 'user'
                ? 'bg-gradient-to-br from-[#e6f0ff] to-[#d4e6ff] text-[#2c3e50] ml-auto rounded-br-sm shadow-sm'
                : 'bg-gradient-to-br from-[#4a86e8] to-[#3a76d8] text-white mr-auto rounded-bl-sm shadow-sm'
                }`}
            >
              {message.content}

              {showSteps === index && message.role === 'assistant' && (
                <div className="mt-2 p-2 bg-gray-100 rounded-md">
                  <h4 className="font-medium">Steps taken:</h4>
                  <p className="text-sm">{message.steps || 'No steps recorded.'}</p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="h-px mb-4" />
      </div>

      <div className="flex items-center p-5 bg-gray-100 border-t border-gray-200 rounded-b-xl">
        <button
          className={`flex items-center justify-center w-8 h-8 text-gray-600 transition-all duration-300 hover:scale-110 hover:text-gray-800 ${isRecording ? 'text-red-500 hover:text-red-700' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <FaStop className="w-4 h-4" /> : <FaMicrophone className="w-4 h-4" />}
        </button>
        {!isRecording ? (
          <textarea
            ref={inputRef}
            className="flex-grow p-2.5 border border-gray-300 rounded-full text-sm resize-none overflow-hidden max-h-[200px] mr-1.5 text-gray-800"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your message or click mic"
            rows={1}
            disabled={isLoading}
          />
        ) : (
          <div className="flex-grow h-10 bg-gray-200 rounded-full flex items-center justify-center px-4 mr-1.5">
            <div className="flex items-end h-5 w-full">
              {audioData.map((value, index) => (
                <div
                  key={index}
                  className="flex-grow bg-blue-500 mx-px rounded-px transition-all duration-100"
                  style={{ height: `${value * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}

        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 transition-all duration-300 hover:scale-110 hover:text-gray-800 ml-1.5 disabled:text-gray-300 disabled:hover:transform-none disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={isLoading || isRecording || !input.trim()}
        >
          <FaPaperPlane className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Chat;
