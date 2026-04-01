import { useState, useRef, useEffect } from 'react';
import { startInterview, sendChatMessage } from './services/api';
import './index.css';

function App() {
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState([]); 
  const [userInput, setUserInput] = useState("");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    const userText = userInput;
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
      {/* Header section */}
      <header className="header">
        <h1 className="header-title">AI Interviewer</h1>
        <span className="status-badge">{status}</span>
      </header>

      {/* Main Content Area */}
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

      {/* Input Area */}
      {isInterviewActive && (
        <div className="input-area">
          <input 
            type="text" 
            className="chat-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your answer..."
            autoFocus
          />
          <button className="btn" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default App;