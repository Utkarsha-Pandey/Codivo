from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from .base import BaseInterviewNode
from .state import InterviewState

class ProblemDefinitionAgent(BaseInterviewNode):
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert DSA interviewer. Introduce the problem and ask for clarifying questions. Do not ask them to code yet."),
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