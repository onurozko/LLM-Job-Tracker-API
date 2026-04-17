"""
Pydantic models and enums for job applications and API payloads.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class LocationType(str, Enum):
    remote = "remote"
    onsite = "onsite"
    hybrid = "hybrid"


class ApplicationStatus(str, Enum):
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"
    archived = "archived"


# --- Request models ---


class ApplicationCreate(BaseModel):
    company: str
    role: str
    location_type: LocationType
    location: str = ""
    url: str = ""
    status: ApplicationStatus = ApplicationStatus.applied


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    location_type: Optional[LocationType] = None
    location: Optional[str] = None
    url: Optional[str] = None
    status: Optional[ApplicationStatus] = None


# --- Response / document shape ---


class ApplicationResponse(BaseModel):
    id: str
    company: str
    role: str
    location_type: LocationType
    location: str
    url: str
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime
    fit_bullets: list[str] = Field(default_factory=list)
    recruiter_message: str = ""
    interview_checklist: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
