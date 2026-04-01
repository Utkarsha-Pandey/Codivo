import { useState } from 'react';
import { startInterview } from './services/api';

function App() {
  const [status, setStatus] = useState("Ready");
  const [aiResponse, setAiResponse] = useState("");

  const handleStartInterview = async () => {
    setStatus("Scanning problem...");
    setAiResponse(""); 
    
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      
      // The 200ms delay to prevent the race condition
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "READ_PAGE" }, async (response) => {
          
          if (chrome.runtime.lastError) {
             console.error("Chrome Runtime Error:", chrome.runtime.lastError.message);
             setStatus("Error: Could not connect to the page. Try refreshing.");
             return;
          }

          if (response && response.error) {
            setStatus(`Error: ${response.error}`);
            return;
          }

          if (response && response.data) {
            setStatus(`Sending "${response.data.title}" to AI...`);
            
            try {
              const answer = await startInterview(response.data);
              setAiResponse(answer);
              setStatus("Interview Started!");
            } catch (error) {
              console.error(error);
              setStatus("Error connecting to backend.");
            }
          } else {
            setStatus("Could not fetch problem data.");
          }
        });
      }, 200); 
      
    });
  };

  return (
    <div style={{ width: '350px', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>AI Interviewer</h2>
      <button 
        onClick={handleStartInterview}
        style={{ width: '100%', padding: '10px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
      >
        Scan Problem & Start
      </button>
      
      <p><strong>Status:</strong> {status}</p>
      
      {aiResponse && (
        <div style={{ marginTop: '15px', padding: '10px', background: '#f4f4f4', borderRadius: '5px', maxHeight: '300px', overflowY: 'auto' }}>
          <strong>Interviewer Says:</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{aiResponse}</p>
        </div>
      )}
    </div>
  );
}

// THIS IS THE LINE THAT WENT MISSING
export default App;