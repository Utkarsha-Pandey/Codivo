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