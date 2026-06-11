"""
Collaboration Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Collaboration(Base):
    """Collaboration model - records of cooperation with influencers"""
    __tablename__ = "collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 创建人
    project_name = Column(String(200), nullable=False)  # 项目名称
    status = Column(String(30), default="pending")  # pending, in_progress, completed, cancelled
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Numeric(12, 2), default=0)  # 预算
    actual_cost = Column(Numeric(12, 2), default=0)  # 实际花费
    content_type = Column(String(50))  # 内容类型: 图文, 视频, 直播
    content_requirements = Column(Text)  # 内容要求
    deliverables = Column(Text)  # 交付物
    views = Column(Integer, default=0)  # 播放/阅读量
    likes = Column(Integer, default=0)  # 点赞数
    comments = Column(Integer, default=0)  # 评论数
    shares = Column(Integer, default=0)  # 分享数
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    influencer = relationship("Influencer", back_populates="collaborations")
    creator = relationship("User", back_populates="collaborations")
