"""
Price History Model - 报价历史记录
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class PriceHistory(Base):
    """Price history model - 网红单次报价变更历史"""
    __tablename__ = "price_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False, index=True)
    old_price = Column(Numeric(12, 2), nullable=False)
    new_price = Column(Numeric(12, 2), nullable=False)
    change_reason = Column(Text)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    influencer = relationship("Influencer", back_populates="price_histories")
    operator = relationship("User")
