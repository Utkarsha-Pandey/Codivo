import { useState, useRef, useEffect } from 'react';
import { startInterview, sendChatMessage, transcribeAudio } from './services/api';
import './index.css';

function App() {
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState([]); 
  const [userInput, setUserInput] = useState("");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const chatEndRef = useRef(null);

  // Audio State Management
  const [playingIndex, setPlayingIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Advanced Audio Controller (Now supports instant speed override) ---
  const triggerAudio = (text, index, action = 'play', overrideRate = null) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Text-to-speech is not supported.");
      return;
    }

    if (action === 'toggle') {
      if (playingIndex === index) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
        }
        return;
      } else {
        action = 'play'; 
      }
    }

    if (action === 'replay' || action === 'play') {
      window.speechSynthesis.cancel(); 
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Use the override speed if we just changed the dropdown, otherwise use state
      utterance.rate = overrideRate !== null ? overrideRate : playbackRate; 
      utterance.pitch = 0.9; 
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoices = ['Samantha', 'Alex', 'Daniel', 'Karen'];
      let selectedVoice = null;

      for (let name of preferredVoices) {
        selectedVoice = voices.find(v => v.name.includes(name));
        if (selectedVoice) break;
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => { setPlayingIndex(index); setIsPaused(false); };
      utterance.onend = () => { setPlayingIndex(null); setIsPaused(false); };
      utterance.onerror = () => { setPlayingIndex(null); setIsPaused(false); };
      
      window.speechSynthesis.speak(utterance);
    }
  };
  // ------------------------------------

  const handleRestart = () => {
    const confirmRestart = window.confirm("Start over? Your current progress will be lost.");
    
    if (confirmRestart) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingIndex(null);
      setIsPaused(false);

      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      setMessages([]);
      setUserInput("");
      setIsInterviewActive(false);
      setStatus("Ready");
    }
  };

  const openMicSetupPage = async () => {
    const optionsUrl = chrome.runtime.getURL('options.html');
    try {
      if (chrome.runtime.openOptionsPage) {
        await chrome.runtime.openOptionsPage();
        return;
      }
    } catch (error) {
      console.warn("Failed to open options page:", error);
    }
    window.open(optionsUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
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
          setStatus("Transcribing...");
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          try {
            const text = await transcribeAudio(audioBlob);
            setUserInput(prev => prev + (prev ? " " : "") + text);
            setStatus("Interview Active");
          } catch (error) {
            console.error("Transcription failed:", error);
            setStatus("Transcription error.");
          }

          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setStatus("Recording...");

      } catch (err) {
        console.warn("Mic permission missing...");
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
            setStatus("Error: Refresh page."); return;
          }
          if (response?.error) {
            setStatus(response.error); return;
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
        
        <div className="header-actions">
          <span className="status-badge">{status}</span>
          
          {isInterviewActive && (
            <button 
              onClick={handleRestart}
              className="restart-btn"
              title="Start Over"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
            </button>
          )}
        </div>
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
              <div className="message-content">{msg.text}</div>
              
              {msg.sender === "ai" && (
                <div className="audio-controls">
                  
                  {/* --- Inline Speed Selector --- */}
                  <select 
                    className="audio-speed-select"
                    value={playbackRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value);
                      setPlaybackRate(newRate);
                      
                      // If changing speed while THIS message is actively playing, restart it instantly
                      if (playingIndex === idx && !isPaused) {
                        triggerAudio(msg.text, idx, 'replay', newRate);
                      }
                    }}
                    title="Playback Speed"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                  {/* ---------------------------------- */}

                  {playingIndex === idx && (
                    <button 
                      className="audio-btn" 
                      onClick={() => triggerAudio(msg.text, idx, 'replay')}
                      title="Start message over"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                      </svg>
                    </button>
                  )}

                  <button 
                    className="audio-btn" 
                    onClick={() => triggerAudio(msg.text, idx, 'toggle')}
                    title={playingIndex === idx && !isPaused ? "Pause" : "Play"}
                  >
                    {playingIndex === idx && !isPaused ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    ) : playingIndex === idx && isPaused ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                      </svg>
                    )}
                  </button>

                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {isInterviewActive && (
        <div className="input-area">
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