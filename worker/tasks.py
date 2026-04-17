"""
Celery app and background task: generate job insight via LLM and store in MongoDB.
Worker uses sync MongoDB (pymongo); config from env.
"""
from celery import Celery
from pymongo import MongoClient

from app.config import get_settings
from app.llm import get_llm_client

settings = get_settings()
celery_app = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]


@celery_app.task(bind=True)
def generate_job_insight(self, application_id: str) -> dict:
    from bson import ObjectId

    if not ObjectId.is_valid(application_id):
        return {"status": "failed", "error": "Invalid application id"}

    s = get_settings()
    client = MongoClient(s.mongodb_uri)
    coll = client[s.mongodb_db][s.mongodb_collection]
    oid = ObjectId(application_id)
    doc = coll.find_one({"_id": oid})
    if not doc:
        client.close()
        return {"status": "failed", "error": "Application not found"}

    application = {
        "company": doc.get("company", ""),
        "role": doc.get("role", ""),
        "location": doc.get("location", ""),
        "url": doc.get("url", ""),
    }

    try:
        llm = get_llm_client()
        result = llm.generate_job_insight(application)
    except Exception as e:
        client.close()
        return {"status": "failed", "error": str(e)}

    coll.update_one(
        {"_id": oid},
        {
            "$set": {
                "fit_bullets": result.fit_bullets,
                "recruiter_message": result.recruiter_message,
                "interview_checklist": result.interview_checklist,
                "updated_at": __import__("datetime").datetime.utcnow(),
            }
        },
    )
    client.close()
    return {
        "status": "done",
        "application_id": application_id,
        "fit_bullets": result.fit_bullets,
        "recruiter_message": result.recruiter_message,
        "interview_checklist": result.interview_checklist,
    }
