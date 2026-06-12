"""
Message Template Model - 消息模板
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class MessageTemplate(Base):
    """Message template model for business communication"""
    __tablename__ = "message_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    subject = Column(String(200))
    content = Column(Text, nullable=False)
    variables = Column(String(500))
    description = Column(String(200))
    sort_order = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    creator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    creator = relationship("User", foreign_keys=[creator_id])
