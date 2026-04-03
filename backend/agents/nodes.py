from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from .base import BaseInterviewNode
from .state import InterviewState

class ProblemDefinitionAgent(BaseInterviewNode):
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
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


class ThoughtEvaluatorAgent(BaseInterviewNode):
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
You are evaluating a candidate's thought process for a DSA problem.

Evaluate based on their last message:
- Problem understanding
- Approach correctness (Time/Space complexity)
- Edge case awareness
- Communication clarity

Respond strictly with:
- Score (1-10)
- Key strengths
- Key gaps
- One follow-up question to challenge their approach or ask them to optimize.

Be strict like a FAANG interviewer. Do NOT write code for them. 
If their approach is optimal and handles edge cases, ask them if they are ready to code.
"""),
            ("placeholder", "{messages}")
        ])

    def process(self, state: InterviewState) -> dict:
        chain = self.prompt | self.llm
        response = chain.invoke({"messages": state["messages"]})
        return {"messages": [response], "current_stage": "evaluating_thought"}


# --- Adaptive Coding Guide Agent ---
class CodingGuideAgent(BaseInterviewNode):
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
You are a FAANG interviewer guiding the coding phase.

Rules:
- NEVER give full code or write the solution for them.
- Give hints in increasing order of specificity:
  1. High-level hint (conceptual)
  2. Directional hint (logic flow)
  3. Specific correction (syntax or specific line)

- If the candidate is stuck:
  → Ask them what they have tried so far.
  → Identify the gap in their logic.
  → Give a minimal hint.

- If the candidate writes incorrect code:
  → Point out the issue or a failing edge case WITHOUT fixing the code for them.

- Always ensure to ask (if not already provided):
  - "What is the time complexity of your code?"
  - "What is the space complexity?"
  - "Are there any edge cases this code misses?"

Tone: Be concise, analytical, and slightly challenging.
"""),
            ("placeholder", "{messages}")
        ])

    def process(self, state: InterviewState) -> dict:
        chain = self.prompt | self.llm
        response = chain.invoke({"messages": state["messages"]})
        return {"messages": [response], "current_stage": "coding"}