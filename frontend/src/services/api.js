export async function startInterview(problemData) {
    // We send a POST request with the structured JSON body
    const response = await fetch("http://127.0.0.1:8000/start-interview", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(problemData)
    });

    if (!response.ok) throw new Error("Failed to reach backend");
    
    const data = await response.json();
    return data.ai_answer;
}