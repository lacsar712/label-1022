from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


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
