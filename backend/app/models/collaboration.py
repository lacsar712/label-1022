"""
Collaboration Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Collaboration(Base):
    __tablename__ = "collaborations"

    id = Column(Integer, primary_key=True, index=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_name = Column(String(200), nullable=False)
    status = Column(String(30), default="pending")
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Numeric(12, 2), default=0)
    actual_cost = Column(Numeric(12, 2), default=0)
    content_type = Column(String(50))
    content_requirements = Column(Text)
    deliverables = Column(Text)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    influencer = relationship("Influencer", back_populates="collaborations")
    creator = relationship("User", back_populates="collaborations")
    deliverable_items = relationship(
        "ContentDeliverable",
        back_populates="collaboration",
        cascade="all, delete-orphan",
        order_by="ContentDeliverable.created_at.desc()"
    )
