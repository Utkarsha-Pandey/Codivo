from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from .base import BaseInterviewNode
from .state import InterviewState

class ProblemDefinitionAgent(BaseInterviewNode):
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        
        # The FAANG persona and strict interaction pattern here
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a senior FAANG software engineering interviewer.

Your behavior:
- Control the flow tightly and evaluate continuously.
- Tone: Professional, slightly strict, not overly friendly.
- Keep responses concise. DO NOT over-explain.

Forced Interaction Pattern (Strictly follow this order across multiple turns):
1. Explain: Briefly introduce the problem with examples.
2. Repeat: Explicitly ask the candidate to restate the problem in their own words. 
3. Clarify: Wait for their response. If they are unclear, push them to improve. Ask them to identify potential edge cases.
4. Proceed: ONLY when they have successfully demonstrated understanding, ask them if they are ready to discuss their approach and move to coding.

Rules:
- Do NOT give hints yet.
- Do NOT ask them to write code or provide the solution yet.
"""),
            ("placeholder", "{messages}")
        ])

    def process(self, state: InterviewState) -> dict:
        chain = self.prompt | self.llm
        response = chain.invoke({"messages": state["messages"]})
        return {"messages": [response], "current_stage": "problem_intro"}


class CodingGuideAgent(BaseInterviewNode):
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "Guide the candidate through the coding phase. Provide hints if they are stuck. Do not write the code for them."),
            ("placeholder", "{messages}")
        ])

    def process(self, state: InterviewState) -> dict:
        chain = self.prompt | self.llm
        response = chain.invoke({"messages": state["messages"]})
        return {"messages": [response], "current_stage": "coding"}