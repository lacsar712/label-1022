"""
Brand Models - 品牌方模型
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Brand(Base):
    """Brand model - 品牌方"""
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    industry = Column(String(100))
    contact_name = Column(String(50))
    contact_phone = Column(String(20))
    contact_email = Column(String(100))
    logo = Column(String(255))
    description = Column(Text)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    users = relationship("User", back_populates="brand")
    authorizations = relationship(
        "BrandCollaborationAuthorization",
        back_populates="brand",
        cascade="all, delete-orphan"
    )


class BrandCollaborationAuthorization(Base):
    """Brand Collaboration Authorization - 品牌方授权可见的合作"""
    __tablename__ = "brand_collaboration_authorizations"
    
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    collaboration_id = Column(Integer, ForeignKey("collaborations.id"), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    
    brand = relationship("Brand", back_populates="authorizations")
    collaboration = relationship("Collaboration", back_populates="brand_authorizations")
    granter = relationship("User", foreign_keys=[granted_by])
