from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from .state import InterviewState
from .nodes import ProblemDefinitionAgent, CodingGuideAgent
import os

def route_interview(state: InterviewState) -> str:
    last_human_message = next(
        (
            message.content.lower()
            for message in reversed(state["messages"])
            if isinstance(message, HumanMessage)
        ),
        "",
    )
    
    if state["current_stage"] == "problem_intro":
        if "ready to code" in last_human_message:
            return "coding_agent"
        return END
        
    elif state["current_stage"] == "coding":
        if "finished" in last_human_message:
            return END
        return END
        
    return END

def build_interview_graph():
    # Inject the LLM
    llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant")
    
    problem_agent = ProblemDefinitionAgent(llm)
    coding_agent = CodingGuideAgent(llm)
    
    workflow = StateGraph(InterviewState)
    
    workflow.add_node("problem_agent", problem_agent)
    workflow.add_node("coding_agent", coding_agent)
    
    workflow.set_entry_point("problem_agent")
    
    workflow.add_conditional_edges("problem_agent", route_interview)
    workflow.add_conditional_edges("coding_agent", route_interview)
    
    return workflow.compile()

# Export the compiled graph
interview_app = build_interview_graph()
