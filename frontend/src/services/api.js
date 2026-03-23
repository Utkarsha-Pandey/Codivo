
export async function startInterview(problemText) {
    const url = `http://127.0.0.1:8000/ask?question=I am looking at this coding problem. Can you act as my interviewer and ask me how I would approach it? Here is the problem: ${encodeURIComponent(problemText.substring(0, 1000))}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to reach backend");
    
    const data = await response.json();
    return data.ai_answer;
}