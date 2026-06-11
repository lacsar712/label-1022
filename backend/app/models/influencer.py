"""
Influencer Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Influencer(Base):
    """Influencer model"""
    __tablename__ = "influencers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    platform = Column(String(50), nullable=False)  # 抖音, 小红书, B站, 微博, 快手, 微信, YouTube, Instagram, TikTok
    account_id = Column(String(100))  # 平台账号ID
    avatar = Column(String(255))
    followers = Column(Integer, default=0)  # 粉丝数
    category_id = Column(Integer, ForeignKey("categories.id"))
    contact_name = Column(String(50))  # 联系人
    contact_phone = Column(String(20))  # 联系电话
    contact_email = Column(String(100))  # 联系邮箱
    contact_wechat = Column(String(50))  # 微信号
    tags = Column(String(500))  # 标签，逗号分隔
    cost_per_post = Column(Numeric(12, 2), default=0)  # 单条报价
    engagement_rate = Column(Numeric(5, 2), default=0)  # 互动率
    status = Column(String(20), default="active")  # active, inactive, blacklisted
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    category = relationship("Category", back_populates="influencers")
    collaborations = relationship("Collaboration", back_populates="influencer")
