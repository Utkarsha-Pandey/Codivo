import { useState } from 'react';
import { startInterview } from './services/api';

function App() {
  const [status, setStatus] = useState("Ready");
  const [aiResponse, setAiResponse] = useState("");

  const handleStartInterview = async () => {
    setStatus("Scanning page...");
    
    // 1. Ask Chrome which tab we are currently looking at
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Inject our content.js reader into that tab
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      
      // 3. Send a message to content.js asking for the text
      chrome.tabs.sendMessage(tab.id, { action: "READ_PAGE" }, async (response) => {
        if (response && response.data) {
          setStatus(`Sending "${response.data.title}" to AI...`);
          
          try {
            // 4. Send the JSON object to FastAPI
            const answer = await startInterview(response.data);
            setAiResponse(answer);
            setStatus("Interview Started!");
          } catch (error) {
            setStatus("Error connecting to backend.");
          }
        } else {
          setStatus("Could not read page structure.");
        }
      });
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
        <div style={{ marginTop: '15px', padding: '10px', background: '#f4f4f4', borderRadius: '5px', maxHeight: '200px', overflowY: 'auto' }}>
          <strong>AI Says:</strong>
          <p>{aiResponse}</p>
        </div>
      )}
    </div>
  );
}

export default App;