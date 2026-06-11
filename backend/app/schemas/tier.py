"""
Tier Schemas - 达人等级
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class TierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = "#1890ff"
    min_followers: int = 0
    max_followers: int = 0
    sort_order: int = 0
    description: Optional[str] = None
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v):
        if not v:
            return "#1890ff"
        if not v.startswith('#'):
            raise ValueError('颜色必须以#开头')
        if len(v) not in [4, 7]:
            raise ValueError('颜色格式不正确')
        return v


class TierCreate(TierBase):
    pass


class TierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = None
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    sort_order: Optional[int] = None
    description: Optional[str] = None
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v):
        if v is None:
            return v
        if not v.startswith('#'):
            raise ValueError('颜色必须以#开头')
        if len(v) not in [4, 7]:
            raise ValueError('颜色格式不正确')
        return v


class TierBrief(BaseModel):
    id: int
    name: str
    color: str
    
    class Config:
        from_attributes = True


class TierResponse(TierBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    influencer_count: int = 0
    
    class Config:
        from_attributes = True
