import { useState, useRef, useEffect } from 'react';
import { startInterview, sendChatMessage, transcribeAudio } from './services/api';
import './index.css';

function App() {
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState([]); 
  const [userInput, setUserInput] = useState("");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  
  // 🎤 FAANG-Grade Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const chatEndRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openMicSetupPage = async () => {
    const optionsUrl = chrome.runtime.getURL('options.html');

    try {
      if (chrome.runtime.openOptionsPage) {
        await chrome.runtime.openOptionsPage();
        return;
      }
    } catch (error) {
      console.warn("Failed to open extension options page:", error);
    }

    window.open(optionsUrl, '_blank', 'noopener,noreferrer');
  };

  // 🎤 Toggle voice input (MediaRecorder -> FastAPI Whisper)
  const toggleRecording = async () => {
    if (isRecording) {
      // STOP RECORDING
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // START RECORDING
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setStatus("Transcribing with Groq...");
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          try {
            // Send the blob to FastAPI -> Groq Whisper
            const text = await transcribeAudio(audioBlob);
            // Append transcribed text to the input box cleanly
            setUserInput(prev => prev + (prev ? " " : "") + text);
            setStatus("Interview Active");
          } catch (error) {
            console.error("Transcription failed:", error);
            setStatus("Transcription error. Try again.");
          }

          // Release the microphone
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setStatus("Recording...");

      } catch (err) {
        console.warn("Mic permission missing. Opening setup page...");
        setStatus("Opening mic setup...");
        await openMicSetupPage();
      }
    }
  };

  const handleStartInterview = async () => {
    setStatus("Scanning...");
    setMessages([]);
    setIsInterviewActive(false);

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "READ_PAGE" }, async (response) => {
          if (chrome.runtime.lastError) {
            setStatus("Error: Refresh page.");
            return;
          }

          if (response?.error) {
            setStatus(response.error);
            return;
          }

          if (response?.data) {
            setStatus("Starting AI...");
            try {
              const answer = await startInterview(response.data);
              setMessages([{ sender: "ai", text: answer }]);
              setIsInterviewActive(true);
              setStatus("Interview Active");
            } catch (error) {
              setStatus("Backend Error");
            }
          } else {
            setStatus("Problem data not found.");
          }
        });
      }, 200);
    });
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userText = userInput.trim();

    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setUserInput("");
    setStatus("Thinking...");

    try {
      const aiResponseText = await sendChatMessage(userText);
      setMessages(prev => [...prev, { sender: "ai", text: aiResponseText }]);
      setStatus("Interview Active");
    } catch (error) {
      setStatus("Message failed");
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">AI Interviewer</h1>
        <span className="status-badge">{status}</span>
      </header>

      {!isInterviewActive ? (
        <div className="empty-state">
          <h3 style={{ marginBottom: '8px' }}>Ready to Practice?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
            Open a LeetCode problem, then click below to begin your mock interview.
          </p>
          <button className="btn" style={{ width: '100%' }} onClick={handleStartInterview}>
            Scan Problem & Start
          </button>
        </div>
      ) : (
        <div className="chat-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {isInterviewActive && (
        <div className="input-area">
          {/* 🎤 Mic Button */}
          <button 
            className={`mic-btn ${isRecording ? 'listening' : ''}`}
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Click to speak"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          </button>

          <input 
            type="text" 
            className="chat-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isRecording ? "Recording..." : "Type your answer..."}
            autoFocus
            disabled={isRecording}
          />

          <button className="btn" onClick={handleSendMessage} disabled={isRecording}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
