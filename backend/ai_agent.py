import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate


load_dotenv()

def get_interviewer_chain():
    ai_brain = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model="llama-3.1-8b-instant" 
    )

    interviewer_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a strict, highly experienced Senior Software Engineer conducting a technical mock interview. "
                   "Your goal is to test the candidate on Data Structures, Algorithms, and System Design. "
                   "RULE 1: NEVER give the direct answer or write the full code for them. "
                   "RULE 2: Always ask probing follow-up questions about time and space complexity. "
                   "RULE 3: If they write code, expect it in Python, Java, or C++, and critique their syntax and edge cases strictly. "
                   "Be professional, direct, and slightly intimidating, just like a real interview."),
        ("human", "{question}")
    ])

    return interviewer_prompt | ai_brain

def get_ai_response(user_question: str) -> str:
    chain = get_interviewer_chain()
    response = chain.invoke({"question": user_question})
    return response.content