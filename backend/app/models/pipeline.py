"""
Influencer Pipeline Model - 达人触达漏斗
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class InfluencerPipeline(Base):
    """Influencer pipeline model - 商务拓展阶段跟进"""
    __tablename__ = "influencer_pipelines"
    
    id = Column(Integer, primary_key=True, index=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False, unique=True)
    stage = Column(String(30), nullable=False, default="to_contact")
    # Stages: to_contact(待联系), communicating(沟通中), quote_confirmed(报价确认), signed(已签约), abandoned(已放弃)
    notes = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    influencer = relationship("Influencer")
    owner = relationship("User")
