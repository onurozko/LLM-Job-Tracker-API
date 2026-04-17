"""
LLM client abstraction. Supports mock (default) and Ollama; no API keys required.
Structured output: fit_bullets, recruiter_message, interview_checklist.
"""
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel

from app.config import get_settings


class JobInsightResult(BaseModel):
    fit_bullets: list[str]
    recruiter_message: str
    interview_checklist: list[str]


class LLMClient(ABC):
    @abstractmethod
    def generate_job_insight(self, application: dict[str, Any]) -> JobInsightResult:
        pass


class MockLLMClient(LLMClient):
    """Deterministic template output; no external calls."""

    def generate_job_insight(self, application: dict[str, Any]) -> JobInsightResult:
        company = application.get("company", "Company")
        role = application.get("role", "Role")
        return JobInsightResult(
            fit_bullets=[
                f"Strong alignment between my experience and {role} at {company}.",
                f"Relevant background for {company}'s industry and goals.",
                "Track record of delivery in similar environments.",
                "Clear interest in the team and product.",
                "Ready to contribute from day one.",
            ],
            recruiter_message=(
                f"Hi, I applied for the {role} position at {company} and would love "
                "to discuss how my experience can add value. Happy to align on a quick call."
            ),
            interview_checklist=[
                "Review job description and company values.",
                "Prepare STAR examples for key competencies.",
                "List 2–3 thoughtful questions for the team.",
                "Test camera and mic if remote.",
            ],
        )


class OllamaLLMClient(LLMClient):
    """Call local Ollama API. Requires Ollama running (e.g. ollama run llama3)."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.generate_path = f"{self.base_url}/api/generate"

    def generate_job_insight(self, application: dict[str, Any]) -> JobInsightResult:
        import json
        import httpx

        company = application.get("company", "Company")
        role = application.get("role", "Role")
        prompt = (
            f"You are a job application assistant. For the role of {role} at {company}, "
            "respond with valid JSON only, no markdown, with exactly these keys: "
            '"fit_bullets" (array of 5 short strings), "recruiter_message" (one string), '
            '"interview_checklist" (array of 4 short strings).'
        )
        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.post(
                    self.generate_path,
                    json={"model": "llama3", "prompt": prompt, "stream": False},
                )
                r.raise_for_status()
                data = r.json()
                text = data.get("response", "")
        except httpx.HTTPError as e:
            raise RuntimeError(f"Ollama request failed: {e}") from e

        # Try to parse JSON from response (model might wrap in markdown)
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(
                line for line in lines if not line.strip().startswith("```")
            )
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Ollama returned invalid JSON: {e}") from e

        return JobInsightResult(
            fit_bullets=parsed.get("fit_bullets", [])[:5] or [],
            recruiter_message=parsed.get(
                "recruiter_message", "Generated insight unavailable"
            ),
            interview_checklist=parsed.get("interview_checklist", [])[:4] or [],
        )


def get_llm_client() -> LLMClient:
    settings = get_settings()
    backend = (settings.llm_backend or "mock").strip().lower()
    if backend == "ollama":
        url = settings.ollama_base_url or "http://localhost:11434"
        return OllamaLLMClient(url)
    return MockLLMClient()
