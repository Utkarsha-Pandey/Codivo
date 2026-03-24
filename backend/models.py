from pydantic import BaseModel, EmailStr

class UserCredentials(BaseModel):
    email: EmailStr
    password: str

class ProblemContext(BaseModel):
    title: str
    description: str
    examples: str
    constraints: str