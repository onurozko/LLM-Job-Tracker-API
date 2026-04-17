"""
Task status endpoint: GET /tasks/{task_id}
"""
from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException

from worker.tasks import celery_app

router = APIRouter(prefix="/tasks", tags=["tasks"])


_STATUS_MAP = {"PENDING": "pending", "STARTED": "running", "SUCCESS": "done", "FAILURE": "failed"}


@router.get("/{task_id}")
async def get_task(task_id: str):
    result = AsyncResult(task_id, app=celery_app)
    state = result.state
    status = _STATUS_MAP.get(state, state.lower() if state else "pending")
    out = {"task_id": task_id, "status": status}
    if state == "FAILURE":
        out["error"] = str(result.result) if result.result else "Unknown error"
    elif state == "SUCCESS" and result.result:
        out["result"] = result.result
    return out
