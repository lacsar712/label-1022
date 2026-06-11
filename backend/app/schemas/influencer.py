"""
Influencer Schemas
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import re


class InfluencerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    platform: str = Field(..., min_length=1, max_length=50)
    account_id: Optional[str] = None
    avatar: Optional[str] = None
    followers: int = 0
    category_id: Optional[int] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_wechat: Optional[str] = None
    tags: Optional[str] = None
    cost_per_post: Decimal = Decimal('0')
    engagement_rate: Decimal = Decimal('0')
    status: str = "active"
    notes: Optional[str] = None
    
    @field_validator('contact_email')
    @classmethod
    def validate_email(cls, v):
        if v is None or v == '':
            return None
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('邮箱格式不正确')
        return v
    
    @field_validator('contact_phone')
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == '':
            return None
        phone_pattern = r'^1[3-9]\d{9}$'
        if not re.match(phone_pattern, v):
            raise ValueError('手机号格式不正确')
        return v


class InfluencerCreate(InfluencerBase):
    pass


class InfluencerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    platform: Optional[str] = Field(None, min_length=1, max_length=50)
    account_id: Optional[str] = None
    avatar: Optional[str] = None
    followers: Optional[int] = None
    category_id: Optional[int] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_wechat: Optional[str] = None
    tags: Optional[str] = None
    cost_per_post: Optional[Decimal] = None
    engagement_rate: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator('contact_email')
    @classmethod
    def validate_email(cls, v):
        if v is None or v == '':
            return None
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('邮箱格式不正确')
        return v
    
    @field_validator('contact_phone')
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == '':
            return None
        phone_pattern = r'^1[3-9]\d{9}$'
        if not re.match(phone_pattern, v):
            raise ValueError('手机号格式不正确')
        return v


class CategoryBrief(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True


class InfluencerResponse(BaseModel):
    id: int
    name: str
    platform: str
    account_id: Optional[str] = None
    avatar: Optional[str] = None
    followers: int
    category_id: Optional[int] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_wechat: Optional[str] = None
    tags: Optional[str] = None
    cost_per_post: Decimal
    engagement_rate: Decimal
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[CategoryBrief] = None
    collaboration_count: int = 0
    
    class Config:
        from_attributes = True


class InfluencerListResponse(BaseModel):
    items: List[InfluencerResponse]
    total: int
    page: int
    page_size: int
