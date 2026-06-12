from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class DeliverableBase(BaseModel):
    platform: Optional[str] = None
    content_link: Optional[str] = None
    published_at: Optional[datetime] = None
    review_status: str = "pending"
    notes: Optional[str] = None


class DeliverableCreate(DeliverableBase):
    collaboration_id: int


class DeliverableUpdate(BaseModel):
    platform: Optional[str] = None
    content_link: Optional[str] = None
    published_at: Optional[datetime] = None
    review_status: Optional[str] = Field(None, pattern=r'^(pending|approved|rejected)$')
    notes: Optional[str] = None


class DeliverableResponse(DeliverableBase):
    id: int
    collaboration_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeliverableListResponse(BaseModel):
    items: List[DeliverableResponse]
    total: int


class CalendarCollaborationInfo(BaseModel):
    id: int
    project_name: str
    content_type: Optional[str] = None
    influencer_name: Optional[str] = None
    influencer_platform: Optional[str] = None

    class Config:
        from_attributes = True


class CalendarDeliverableItem(BaseModel):
    id: int
    collaboration_id: int
    platform: Optional[str] = None
    content_link: Optional[str] = None
    published_at: Optional[datetime] = None
    review_status: str
    notes: Optional[str] = None
    collaboration: Optional[CalendarCollaborationInfo] = None

    class Config:
        from_attributes = True


class CalendarDeliverableListResponse(BaseModel):
    items: List[CalendarDeliverableItem]
    total: int
