from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from .state import InterviewState
from .nodes import ProblemDefinitionAgent, ThoughtEvaluatorAgent, CodingGuideAgent
import os

# --- NEW: The Front Door Router ---
def determine_start_node(state: InterviewState) -> str:
    """
    Reads the current_stage from the database injection 
    and starts the graph at the correct agent.
    """
    stage = state.get("current_stage", "problem_intro")
    
    if stage == "evaluating_thought":
        return "thought_evaluator"
    elif stage == "coding":
        return "coding_agent"
    
    # Default fallback
    return "problem_agent"
# ----------------------------------

def route_interview(state: InterviewState) -> str:
    last_human_message = next(
        (
            message.content.lower()
            for message in reversed(state["messages"])
            if isinstance(message, HumanMessage)
        ),
        "",
    )
    
    # 1. From Intro -> Evaluation
    if state["current_stage"] == "problem_intro":
        if any(word in last_human_message for word in ["approach", "think", "solve", "ready"]):
            return "thought_evaluator"
        return END
        
    # 2. From Evaluation -> Coding
    elif state["current_stage"] == "evaluating_thought":
        if "code" in last_human_message or "ready" in last_human_message:
            return "coding_agent"
        return END
        
    # 3. From Coding -> End
    elif state["current_stage"] == "coding":
        if "finished" in last_human_message or "done" in last_human_message:
            return END
        return END
        
    return END

def build_interview_graph():
    llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant")
    
    problem_agent = ProblemDefinitionAgent(llm)
    thought_evaluator = ThoughtEvaluatorAgent(llm)
    coding_agent = CodingGuideAgent(llm)
    
    workflow = StateGraph(InterviewState)
    
    workflow.add_node("problem_agent", problem_agent)
    workflow.add_node("thought_evaluator", thought_evaluator)
    workflow.add_node("coding_agent", coding_agent)
    
    # conditional edge from START 
    workflow.add_conditional_edges(START, determine_start_node)
    # -----------------------------------------------------------------------------------------
    
    workflow.add_conditional_edges("problem_agent", route_interview)
    workflow.add_conditional_edges("thought_evaluator", route_interview)
    workflow.add_conditional_edges("coding_agent", route_interview)
    
    return workflow.compile()

interview_app = build_interview_graph()