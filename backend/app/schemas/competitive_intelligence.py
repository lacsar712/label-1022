"""
Competitive Intelligence Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class CompetitiveIntelligenceBase(BaseModel):
    competitor_name: str = Field(..., min_length=1, max_length=200)
    influencer_id: int
    estimated_amount: Decimal = Decimal('0')
    source: Optional[str] = Field(None, max_length=500)
    discovery_date: Optional[date] = None
    notes: Optional[str] = None


class CompetitiveIntelligenceCreate(CompetitiveIntelligenceBase):
    pass


class CompetitiveIntelligenceUpdate(BaseModel):
    competitor_name: Optional[str] = Field(None, min_length=1, max_length=200)
    influencer_id: Optional[int] = None
    estimated_amount: Optional[Decimal] = None
    source: Optional[str] = Field(None, max_length=500)
    discovery_date: Optional[date] = None
    notes: Optional[str] = None


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


class CompetitiveIntelligenceResponse(BaseModel):
    id: int
    competitor_name: str
    influencer_id: int
    estimated_amount: Decimal
    source: Optional[str] = None
    discovery_date: Optional[date] = None
    notes: Optional[str] = None
    creator_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    influencer: Optional[InfluencerBrief] = None
    creator: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class CompetitiveIntelligenceListResponse(BaseModel):
    items: List[CompetitiveIntelligenceResponse]
    total: int
    page: int
    page_size: int
