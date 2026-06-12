"""
Influencer Pipeline Schemas - 达人触达漏斗
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InfluencerPipelineBase(BaseModel):
    influencer_id: int
    stage: str = Field(default="to_contact", description="阶段: to_contact, communicating, quote_confirmed, signed, abandoned")
    notes: Optional[str] = None
    owner_id: Optional[int] = None


class InfluencerPipelineCreate(InfluencerPipelineBase):
    pass


class InfluencerPipelineUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    owner_id: Optional[int] = None


class InfluencerBrief(BaseModel):
    id: int
    name: str
    platform: str
    followers: int
    avatar: Optional[str] = None
    cost_per_post: Optional[float] = None

    class Config:
        from_attributes = True


class OwnerBrief(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None

    class Config:
        from_attributes = True


class InfluencerPipelineResponse(BaseModel):
    id: int
    influencer_id: int
    stage: str
    notes: Optional[str] = None
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    influencer: Optional[InfluencerBrief] = None
    owner: Optional[OwnerBrief] = None

    class Config:
        from_attributes = True


class InfluencerPipelineListResponse(BaseModel):
    items: List[InfluencerPipelineResponse]
    total: int
