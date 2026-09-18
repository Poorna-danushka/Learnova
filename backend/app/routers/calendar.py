import logging

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.calendar_event import CalendarEvent
from app.models.module import Module
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["calendar"])


def ensure_module_owner(module_id: int | None, user: User, db: Session) -> None:
    if module_id is not None and not db.query(Module).filter(
        Module.id == module_id, Module.owner_id == user.id
    ).first():
        raise HTTPException(status_code=404, detail="Module not found.")


def get_owned_event(event_id: int, user: User, db: Session) -> CalendarEvent:
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.owner_id == user.id
    ).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    return event


def validate_update_times(event: CalendarEvent, updates: dict) -> None:
    starts_at = updates.get("starts_at", event.starts_at)
    ends_at = updates.get("ends_at", event.ends_at)
    def as_utc(value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

    if as_utc(ends_at) <= as_utc(starts_at):
        raise HTTPException(status_code=422, detail="Event end must be after event start.")


@router.post("/calendar-events", response_model=CalendarEventResponse, status_code=201)
def create_event(
    data: CalendarEventCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        logger.info(f"Creating calendar event for user {user.id}, module_id: {data.module_id}")
        ensure_module_owner(data.module_id, user, db)
        event = CalendarEvent(owner_id=user.id, **data.model_dump())
        db.add(event)
        db.commit()
        db.refresh(event)
        logger.info(f"Calendar event {event.id} created successfully")
        return event
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error creating calendar event for user {user.id}: {exc}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create calendar event. Please try again."
        ) from exc


@router.get("/calendar-events", response_model=list[CalendarEventResponse])
def list_events(
    upcoming_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.owner_id == user.id)
    if upcoming_only:
        query = query.filter(CalendarEvent.ends_at >= datetime.now(timezone.utc))
    return query.order_by(CalendarEvent.starts_at).all()


@router.get("/calendar-events/{event_id}", response_model=CalendarEventResponse)
def get_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_event(event_id, user, db)


@router.patch("/calendar-events/{event_id}", response_model=CalendarEventResponse)
def update_event(
    event_id: int,
    data: CalendarEventUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        event = get_owned_event(event_id, user, db)
        updates = data.model_dump(exclude_unset=True)
        ensure_module_owner(updates.get("module_id"), user, db)
        validate_update_times(event, updates)
        for field, value in updates.items():
            setattr(event, field, value)
        db.commit()
        db.refresh(event)
        return event
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error updating calendar event {event_id}: {exc}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update calendar event.") from exc


@router.delete("/calendar-events/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = get_owned_event(event_id, user, db)
    db.delete(event)
    db.commit()
