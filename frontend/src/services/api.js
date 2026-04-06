export async function startInterview(problemData) {
    const response = await fetch("http://127.0.0.1:8000/start-interview", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(problemData)
    });

    if (!response.ok) {
        const errorDetails = await response.json();
        console.error("FastAPI rejected the data:", errorDetails);
        throw new Error("Validation failed");
    }
    
    const data = await response.json();
    return data.ai_answer;
}

export async function sendChatMessage(message, sessionId = "test_session_123") {
    const url = `http://127.0.0.1:8000/chat?user_message=${encodeURIComponent(message)}&session_id=${encodeURIComponent(sessionId)}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        console.error("Chat API failed");
        throw new Error("Failed to send message");
    }
    
    const data = await response.json();
    return data.response;
}

// --- NEW FUNCTION: Send Audio to Whisper ---
export async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");

    const response = await fetch("http://127.0.0.1:8000/transcribe", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Failed to transcribe audio");
    }
    
    const data = await response.json();
    return data.text;
}