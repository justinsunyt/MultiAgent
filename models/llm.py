import os
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel
from groq import Groq

load_dotenv(True)


class LLM(BaseModel):
    model: str
    max_tokens: int
    temperature: float
    system: str

    def __init__(self, **data):
        super().__init__(**data)
        object.__setattr__(
            self,
            "client",
            Groq(api_key=os.getenv("GROQ_API_KEY")),
        )

    def run(self, messages: List[dict]):
        completion = self.client.chat.completions.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            messages=[{"role": "system", "content": self.system}] + messages,
        )
        output = completion.choices[0].message.content
        return output
