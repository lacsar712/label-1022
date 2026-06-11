from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ContentDeliverable(Base):
    __tablename__ = "collaboration_deliverables"

    id = Column(Integer, primary_key=True, index=True)
    collaboration_id = Column(Integer, ForeignKey("collaborations.id"), nullable=False)
    platform = Column(String(50))
    content_link = Column(String(500))
    published_at = Column(DateTime)
    review_status = Column(String(20), default="pending")
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    collaboration = relationship("Collaboration", back_populates="deliverable_items")
