"""
Tier Model - 达人等级
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Tier(Base):
    """Tier model for influencer grading"""
    __tablename__ = "tiers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    color = Column(String(20), default="#1890ff")
    min_followers = Column(Integer, default=0)
    max_followers = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    description = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    influencers = relationship("Influencer", back_populates="tier")
