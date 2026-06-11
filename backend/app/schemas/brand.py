"""
Brand Schemas - 品牌方数据结构
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    industry: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"
    
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


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    industry: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    
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


class BrandBrief(BaseModel):
    id: int
    name: str
    industry: Optional[str] = None
    logo: Optional[str] = None
    
    class Config:
        from_attributes = True


class BrandResponse(BrandBase):
    id: int
    authorization_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class BrandListResponse(BaseModel):
    items: List[BrandResponse]
    total: int
    page: int
    page_size: int


class BrandAuthorizationBase(BaseModel):
    collaboration_id: int
    notes: Optional[str] = None


class BrandAuthorizationCreate(BrandAuthorizationBase):
    pass


class BrandAuthorizationBatchCreate(BaseModel):
    collaboration_ids: List[int]
    notes: Optional[str] = None


class BrandAuthorizationResponse(BaseModel):
    id: int
    brand_id: int
    collaboration_id: int
    granted_by: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserBrandAssign(BaseModel):
    brand_id: Optional[int] = None
