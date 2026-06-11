"""
Price History Schemas - 报价历史
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class OperatorBrief(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    
    class Config:
        from_attributes = True


class PriceHistoryResponse(BaseModel):
    id: int
    influencer_id: int
    old_price: Decimal
    new_price: Decimal
    change_reason: Optional[str] = None
    operator_id: int
    created_at: datetime
    operator: Optional[OperatorBrief] = None
    change_amount: Optional[Decimal] = None
    change_percent: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


class PriceHistoryListResponse(BaseModel):
    items: List[PriceHistoryResponse]
    total: int


class PriceHistoryChartPoint(BaseModel):
    date: str
    price: Decimal
    time: datetime
