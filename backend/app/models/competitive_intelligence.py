"""
Competitive Intelligence Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class CompetitiveIntelligence(Base):
    __tablename__ = "competitive_intelligence"

    id = Column(Integer, primary_key=True, index=True)
    competitor_name = Column(String(200), nullable=False, index=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False)
    estimated_amount = Column(Numeric(12, 2), default=0)
    source = Column(String(500))
    discovery_date = Column(Date, nullable=False)
    notes = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    influencer = relationship("Influencer")
    creator = relationship("User")
