"""
Collaboration Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class CollaborationBase(BaseModel):
    influencer_id: int
    project_name: str = Field(..., min_length=1, max_length=200)
    status: str = "pending"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Decimal = Decimal('0')
    actual_cost: Decimal = Decimal('0')
    content_type: Optional[str] = None
    content_requirements: Optional[str] = None
    deliverables: Optional[str] = None
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    notes: Optional[str] = None


class CollaborationCreate(CollaborationBase):
    pass


class CollaborationUpdate(BaseModel):
    influencer_id: Optional[int] = None
    project_name: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    content_type: Optional[str] = None
    content_requirements: Optional[str] = None
    deliverables: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    notes: Optional[str] = None


class CollaborationStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r'^(pending|in_progress|completed|cancelled)$')


class InfluencerBrief(BaseModel):
    id: int
    name: str
    platform: str
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    
    class Config:
        from_attributes = True


class CollaborationResponse(BaseModel):
    id: int
    influencer_id: int
    user_id: int
    project_name: str
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Decimal
    actual_cost: Decimal
    content_type: Optional[str] = None
    content_requirements: Optional[str] = None
    deliverables: Optional[str] = None
    views: int
    likes: int
    comments: int
    shares: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    influencer: Optional[InfluencerBrief] = None
    creator: Optional[UserBrief] = None
    
    class Config:
        from_attributes = True


class CollaborationListResponse(BaseModel):
    items: List[CollaborationResponse]
    total: int
    page: int
    page_size: int
