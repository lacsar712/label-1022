"""
Message Template Schemas - 消息模板
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MessageTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    subject: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=1)
    variables: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_active: int = 1


class MessageTemplateCreate(MessageTemplateBase):
    pass


class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    subject: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    variables: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[int] = None


class MessageTemplatePreviewRequest(BaseModel):
    template_id: int
    variables: dict


class MessageTemplateResponse(MessageTemplateBase):
    id: int
    creator_id: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MessageTemplateCategory(BaseModel):
    category: str
    count: int
