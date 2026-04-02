from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from .state import InterviewState
from .nodes import ProblemDefinitionAgent, ThoughtEvaluatorAgent, CodingGuideAgent
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
    
    # 1. From Intro -> Evaluation
    if state["current_stage"] == "problem_intro":
        # If they start discussing their approach or say they are ready
        if any(word in last_human_message for word in ["approach", "think", "solve", "ready"]):
            return "thought_evaluator"
        return END
        
    # 2. From Evaluation -> Coding
    elif state["current_stage"] == "evaluating_thought":
        # If they have refined their approach and are ready to type
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
    
    # Initialize all three agents
    problem_agent = ProblemDefinitionAgent(llm)
    thought_evaluator = ThoughtEvaluatorAgent(llm)
    coding_agent = CodingGuideAgent(llm)
    
    workflow = StateGraph(InterviewState)
    
    # Add nodes
    workflow.add_node("problem_agent", problem_agent)
    workflow.add_node("thought_evaluator", thought_evaluator)
    workflow.add_node("coding_agent", coding_agent)
    
    workflow.set_entry_point("problem_agent")
    
    # Add conditional edges to route between stages based on candidate input
    workflow.add_conditional_edges("problem_agent", route_interview)
    workflow.add_conditional_edges("thought_evaluator", route_interview)
    workflow.add_conditional_edges("coding_agent", route_interview)
    
    return workflow.compile()

interview_app = build_interview_graph()