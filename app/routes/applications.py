"""
Job application CRUD and generate trigger.
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorCollection

from app.db import get_collection
from app.models import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.models import ApplicationStatus, LocationType

router = APIRouter(prefix="/applications", tags=["applications"])


def _doc_to_response(doc: dict) -> ApplicationResponse:
    doc["id"] = str(doc.pop("_id"))
    doc["location_type"] = LocationType(doc["location_type"])
    doc["status"] = ApplicationStatus(doc["status"])
    doc.setdefault("fit_bullets", [])
    doc.setdefault("recruiter_message", "")
    doc.setdefault("interview_checklist", [])
    return ApplicationResponse(**doc)


@router.post("", response_model=ApplicationResponse)
async def create_application(
    body: ApplicationCreate,
    coll: AsyncIOMotorCollection = Depends(get_collection),
):
    now = datetime.utcnow()
    doc = {
        "company": body.company,
        "role": body.role,
        "location_type": body.location_type.value,
        "location": body.location,
        "url": body.url,
        "status": body.status.value,
        "created_at": now,
        "updated_at": now,
        "fit_bullets": [],
        "recruiter_message": "",
        "interview_checklist": [],
    }
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    status: Optional[ApplicationStatus] = None,
    limit: int = 50,
    skip: int = 0,
    coll: AsyncIOMotorCollection = Depends(get_collection),
):
    q = {} if status is None else {"status": status.value}
    cursor = coll.find(q).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_doc_to_response({**d, "_id": d["_id"]}) for d in docs]


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: str,
    coll: AsyncIOMotorCollection = Depends(get_collection),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    doc = await coll.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return _doc_to_response({**doc, "_id": doc["_id"]})


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: str,
    body: ApplicationUpdate,
    coll: AsyncIOMotorCollection = Depends(get_collection),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    update = body.model_dump(exclude_unset=True)
    for k, v in update.items():
        if hasattr(v, "value"):
            update[k] = v.value
    if update:
        update["updated_at"] = datetime.utcnow()
        await coll.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": update},
        )
    doc = await coll.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return _doc_to_response({**doc, "_id": doc["_id"]})


@router.post("/{application_id}/generate")
async def trigger_generate(
    application_id: str,
    coll: AsyncIOMotorCollection = Depends(get_collection),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    doc = await coll.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    from worker.tasks import generate_job_insight

    task = generate_job_insight.delay(application_id)
    return {"task_id": task.id}
