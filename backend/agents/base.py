from abc import ABC, abstractmethod
from .state import InterviewState

class BaseInterviewNode(ABC):
    @abstractmethod
    def process(self, state: InterviewState) -> dict:
        pass
    
    def __call__(self, state: InterviewState) -> dict:
        return self.process(state)

class ICodeEvaluator(ABC):
    @abstractmethod
    def evaluate_complexity(self, code: str) -> dict:
        pass