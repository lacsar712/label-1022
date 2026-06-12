"""
Influencer Pipeline Router - 达人触达漏斗管理
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database import get_db
from ..models.pipeline import InfluencerPipeline
from ..models.influencer import Influencer
from ..models.user import User
from ..schemas.pipeline import (
    InfluencerPipelineCreate,
    InfluencerPipelineUpdate,
    InfluencerPipelineResponse,
    InfluencerPipelineListResponse,
    InfluencerBrief,
    OwnerBrief
)
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger

router = APIRouter(prefix="/api/pipelines", tags=["触达Pipeline"])

STAGE_ORDER = ["to_contact", "communicating", "quote_confirmed", "signed", "abandoned"]
STAGE_LABELS = {
    "to_contact": "待联系",
    "communicating": "沟通中",
    "quote_confirmed": "报价确认",
    "signed": "已签约",
    "abandoned": "已放弃"
}


def build_response(pipeline):
    influencer_brief = None
    if pipeline.influencer:
        influencer_brief = InfluencerBrief(
            id=pipeline.influencer.id,
            name=pipeline.influencer.name,
            platform=pipeline.influencer.platform,
            followers=pipeline.influencer.followers,
            avatar=pipeline.influencer.avatar,
            cost_per_post=float(pipeline.influencer.cost_per_post) if pipeline.influencer.cost_per_post else 0
        )

    owner_brief = None
    if pipeline.owner:
        owner_brief = OwnerBrief(
            id=pipeline.owner.id,
            username=pipeline.owner.username,
            nickname=pipeline.owner.nickname
        )

    return InfluencerPipelineResponse(
        id=pipeline.id,
        influencer_id=pipeline.influencer_id,
        stage=pipeline.stage,
        notes=pipeline.notes,
        owner_id=pipeline.owner_id,
        created_at=pipeline.created_at,
        updated_at=pipeline.updated_at,
        influencer=influencer_brief,
        owner=owner_brief
    )


@router.get("", response_model=InfluencerPipelineListResponse, summary="获取Pipeline列表")
async def get_pipelines(
    stage: Optional[str] = None,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有Pipeline记录，支持按阶段和负责人筛选"""
    query = db.query(InfluencerPipeline).options(
        joinedload(InfluencerPipeline.influencer),
        joinedload(InfluencerPipeline.owner)
    )

    if stage:
        if stage not in STAGE_ORDER:
            raise HTTPException(status_code=400, detail=f"无效的阶段: {stage}")
        query = query.filter(InfluencerPipeline.stage == stage)

    if owner_id is not None:
        query = query.filter(InfluencerPipeline.owner_id == owner_id)

    pipelines = query.order_by(InfluencerPipeline.updated_at.desc()).all()
    total = len(pipelines)

    items = [build_response(p) for p in pipelines]
    return InfluencerPipelineListResponse(items=items, total=total)


@router.get("/stages", summary="获取所有阶段定义")
async def get_stages(
    current_user: User = Depends(get_current_user)
):
    """获取Pipeline的所有阶段定义"""
    return [
        {"key": "to_contact", "label": "待联系", "color": "#6b7280"},
        {"key": "communicating", "label": "沟通中", "color": "#3b82f6"},
        {"key": "quote_confirmed", "label": "报价确认", "color": "#f59e0b"},
        {"key": "signed", "label": "已签约", "color": "#10b981"},
        {"key": "abandoned", "label": "已放弃", "color": "#ef4444"}
    ]


@router.get("/owners/options", summary="获取可选负责人列表")
async def get_owner_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取可选的负责人列表（内部用户：管理员、运营、普通用户）"""
    users = db.query(User).filter(
        User.status == "active"
    ).all()
    
    return [
        {
            "id": u.id,
            "label": u.nickname or u.username,
            "username": u.username,
            "nickname": u.nickname
        }
        for u in users
    ]


@router.post("", response_model=InfluencerPipelineResponse, summary="创建Pipeline记录")
async def create_pipeline(
    data: InfluencerPipelineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """为达人创建Pipeline跟进记录"""
    if data.stage not in STAGE_ORDER:
        raise HTTPException(status_code=400, detail=f"无效的阶段: {data.stage}")

    influencer = db.query(Influencer).filter(Influencer.id == data.influencer_id).first()
    if not influencer:
        raise HTTPException(status_code=404, detail="达人不存在")

    existing = db.query(InfluencerPipeline).filter(
        InfluencerPipeline.influencer_id == data.influencer_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该达人已存在Pipeline记录")

    if data.owner_id is not None:
        owner = db.query(User).filter(User.id == data.owner_id).first()
        if not owner:
            raise HTTPException(status_code=404, detail="负责人不存在")

    pipeline = InfluencerPipeline(**data.model_dump())
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)

    pipeline = db.query(InfluencerPipeline).options(
        joinedload(InfluencerPipeline.influencer),
        joinedload(InfluencerPipeline.owner)
    ).filter(InfluencerPipeline.id == pipeline.id).first()

    logger.info(f"Pipeline created for influencer {influencer.name} by {current_user.username}")
    return build_response(pipeline)


@router.get("/{pipeline_id}", response_model=InfluencerPipelineResponse, summary="获取Pipeline详情")
async def get_pipeline(
    pipeline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单条Pipeline记录详情"""
    pipeline = db.query(InfluencerPipeline).options(
        joinedload(InfluencerPipeline.influencer),
        joinedload(InfluencerPipeline.owner)
    ).filter(InfluencerPipeline.id == pipeline_id).first()

    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline记录不存在")

    return build_response(pipeline)


@router.put("/{pipeline_id}", response_model=InfluencerPipelineResponse, summary="更新Pipeline")
async def update_pipeline(
    pipeline_id: int,
    data: InfluencerPipelineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新Pipeline记录，包括阶段、备注、负责人"""
    pipeline = db.query(InfluencerPipeline).filter(InfluencerPipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline记录不存在")

    update_data = data.model_dump(exclude_unset=True)

    if 'stage' in update_data and update_data['stage'] not in STAGE_ORDER:
        raise HTTPException(status_code=400, detail=f"无效的阶段: {update_data['stage']}")

    if 'owner_id' in update_data and update_data['owner_id'] is not None:
        owner = db.query(User).filter(User.id == update_data['owner_id']).first()
        if not owner:
            raise HTTPException(status_code=404, detail="负责人不存在")

    for field, value in update_data.items():
        setattr(pipeline, field, value)

    db.commit()
    db.refresh(pipeline)

    pipeline = db.query(InfluencerPipeline).options(
        joinedload(InfluencerPipeline.influencer),
        joinedload(InfluencerPipeline.owner)
    ).filter(InfluencerPipeline.id == pipeline_id).first()

    stage_label = STAGE_LABELS.get(pipeline.stage, pipeline.stage)
    logger.info(f"Pipeline {pipeline_id} updated to stage '{stage_label}' by {current_user.username}")
    return build_response(pipeline)


@router.patch("/{pipeline_id}/stage", response_model=InfluencerPipelineResponse, summary="变更Pipeline阶段")
async def change_pipeline_stage(
    pipeline_id: int,
    stage: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """快速变更Pipeline阶段（拖拽后调用）"""
    if stage not in STAGE_ORDER:
        raise HTTPException(status_code=400, detail=f"无效的阶段: {stage}")

    pipeline = db.query(InfluencerPipeline).filter(InfluencerPipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline记录不存在")

    pipeline.stage = stage
    db.commit()
    db.refresh(pipeline)

    pipeline = db.query(InfluencerPipeline).options(
        joinedload(InfluencerPipeline.influencer),
        joinedload(InfluencerPipeline.owner)
    ).filter(InfluencerPipeline.id == pipeline_id).first()

    stage_label = STAGE_LABELS.get(stage, stage)
    logger.info(f"Pipeline {pipeline_id} stage changed to '{stage_label}' by {current_user.username}")
    return build_response(pipeline)


@router.delete("/{pipeline_id}", summary="删除Pipeline记录")
async def delete_pipeline(
    pipeline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除Pipeline记录"""
    pipeline = db.query(InfluencerPipeline).filter(InfluencerPipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline记录不存在")

    db.delete(pipeline)
    db.commit()

    logger.info(f"Pipeline {pipeline_id} deleted by {current_user.username}")
    return {"message": "Pipeline记录已删除"}
