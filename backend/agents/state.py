from typing import Annotated, TypedDict, List
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class InterviewState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    current_stage: str
    candidate_code: str