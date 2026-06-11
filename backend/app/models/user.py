"""
User and Role Models
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Role(Base):
    """Role model"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(200))
    permissions = Column(Text)
    
    users = relationship("User", back_populates="role")


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(100))
    phone = Column(String(20))
    nickname = Column(String(50))
    avatar = Column(String(255))
    role_id = Column(Integer, ForeignKey("roles.id"), default=3)
    status = Column(String(20), default="active")  # active, inactive
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    role = relationship("Role", back_populates="users")
    collaborations = relationship("Collaboration", back_populates="creator")
