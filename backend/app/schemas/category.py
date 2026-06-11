"""
Category Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    influencer_count: int = 0
    
    class Config:
        from_attributes = True


class CategoryTreeResponse(CategoryBase):
    id: int
    created_at: datetime
    influencer_count: int = 0
    children: List['CategoryTreeResponse'] = []
    
    class Config:
        from_attributes = True
