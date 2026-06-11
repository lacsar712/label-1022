"""
Brands Router - 品牌方管理
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from ..database import get_db
from ..models.brand import Brand, BrandCollaborationAuthorization
from ..models.collaboration import Collaboration
from ..models.user import User
from ..schemas.brand import (
    BrandCreate,
    BrandUpdate,
    BrandResponse,
    BrandListResponse,
    BrandAuthorizationCreate,
    BrandAuthorizationBatchCreate,
    BrandAuthorizationResponse
)
from ..utils.security import get_admin_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/brands", tags=["品牌方管理"])


@router.get("", response_model=BrandListResponse, summary="获取品牌方列表")
async def get_brands(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    获取品牌方列表
    - 支持分页
    - 支持关键字搜索（名称、行业、联系人）
    - 支持状态筛选
    """
    query = db.query(Brand)

    if keyword:
        query = query.filter(
            (Brand.name.contains(keyword)) |
            (Brand.industry.contains(keyword)) |
            (Brand.contact_name.contains(keyword))
        )

    if status:
        query = query.filter(Brand.status == status)

    total = query.count()
    brands = query.order_by(Brand.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    brand_ids = [b.id for b in brands]
    if brand_ids:
        from sqlalchemy import func
        auth_counts = db.query(
            BrandCollaborationAuthorization.brand_id,
            func.count(BrandCollaborationAuthorization.id).label('cnt')
        ).filter(
            BrandCollaborationAuthorization.brand_id.in_(brand_ids)
        ).group_by(BrandCollaborationAuthorization.brand_id).all()
        count_map = {r[0]: r[1] for r in auth_counts}
        for b in brands:
            b.authorization_count = count_map.get(b.id, 0)

    return BrandListResponse(
        items=brands,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=BrandResponse, summary="创建品牌方")
async def create_brand(
    brand_data: BrandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """创建品牌方"""
    existing = db.query(Brand).filter(Brand.name == brand_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="品牌方名称已存在"
        )

    new_brand = Brand(**brand_data.model_dump())
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)

    logger.info(f"Brand created: {new_brand.name} by admin {current_user.username}")

    return new_brand


@router.get("/{brand_id}", response_model=BrandResponse, summary="获取品牌方详情")
async def get_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """获取品牌方详情"""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="品牌方不存在"
        )
    return brand


@router.put("/{brand_id}", response_model=BrandResponse, summary="更新品牌方")
async def update_brand(
    brand_id: int,
    brand_data: BrandUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """更新品牌方"""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="品牌方不存在"
        )

    update_data = brand_data.model_dump(exclude_unset=True)

    if 'name' in update_data and update_data['name'] != brand.name:
        existing = db.query(Brand).filter(Brand.name == update_data['name']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="品牌方名称已存在"
            )

    for field, value in update_data.items():
        setattr(brand, field, value)

    db.commit()
    db.refresh(brand)

    logger.info(f"Brand updated: {brand.name} by admin {current_user.username}")

    return brand


@router.delete("/{brand_id}", summary="删除品牌方")
async def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """删除品牌方"""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="品牌方不存在"
        )

    brand_name = brand.name
    db.delete(brand)
    db.commit()

    logger.info(f"Brand deleted: {brand_name} by admin {current_user.username}")

    return {"message": "品牌方已删除"}


@router.get("/{brand_id}/authorizations", response_model=List[BrandAuthorizationResponse], summary="获取品牌已授权的合作列表")
async def get_brand_authorizations(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """获取该品牌已授权的合作列表"""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="品牌方不存在"
        )

    authorizations = db.query(BrandCollaborationAuthorization).options(
        joinedload(BrandCollaborationAuthorization.collaboration),
        joinedload(BrandCollaborationAuthorization.granter)
    ).filter(BrandCollaborationAuthorization.brand_id == brand_id).order_by(
        BrandCollaborationAuthorization.created_at.desc()
    ).all()

    return authorizations


@router.post("/{brand_id}/authorizations", response_model=List[BrandAuthorizationResponse], summary="批量授权合作给该品牌")
async def batch_create_authorizations(
    brand_id: int,
    auth_data: BrandAuthorizationBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """批量授权合作给该品牌"""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="品牌方不存在"
        )

    existing_auths = db.query(BrandCollaborationAuthorization).filter(
        BrandCollaborationAuthorization.brand_id == brand_id,
        BrandCollaborationAuthorization.collaboration_id.in_(auth_data.collaboration_ids)
    ).all()
    existing_collab_ids = {a.collaboration_id for a in existing_auths}

    valid_collab_ids = []
    for collab_id in auth_data.collaboration_ids:
        if collab_id in existing_collab_ids:
            continue
        collaboration = db.query(Collaboration).filter(Collaboration.id == collab_id).first()
        if not collaboration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"合作ID {collab_id} 不存在"
            )
        valid_collab_ids.append(collab_id)

    new_authorizations = []
    for collab_id in valid_collab_ids:
        auth = BrandCollaborationAuthorization(
            brand_id=brand_id,
            collaboration_id=collab_id,
            granted_by=current_user.id,
            notes=auth_data.notes
        )
        db.add(auth)
        new_authorizations.append(auth)

    db.commit()

    all_auth_ids = [a.id for a in existing_auths] + [a.id for a in new_authorizations]
    result = db.query(BrandCollaborationAuthorization).options(
        joinedload(BrandCollaborationAuthorization.collaboration),
        joinedload(BrandCollaborationAuthorization.granter)
    ).filter(BrandCollaborationAuthorization.id.in_(all_auth_ids)).order_by(
        BrandCollaborationAuthorization.created_at.desc()
    ).all()

    logger.info(f"Brand authorizations created for brand {brand.name}: {len(valid_collab_ids)} new by admin {current_user.username}")

    return result


@router.delete("/{brand_id}/authorizations/{auth_id}", summary="撤销某个授权")
async def delete_authorization(
    brand_id: int,
    auth_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """撤销某个授权"""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="品牌方不存在"
        )

    authorization = db.query(BrandCollaborationAuthorization).filter(
        BrandCollaborationAuthorization.id == auth_id,
        BrandCollaborationAuthorization.brand_id == brand_id
    ).first()
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="授权记录不存在"
        )

    db.delete(authorization)
    db.commit()

    logger.info(f"Brand authorization deleted: brand={brand.name}, auth_id={auth_id} by admin {current_user.username}")

    return {"message": "授权已撤销"}


# 在 main.py 中注册路由方式：
# from app.routers.brands import router as brands_router
# app.include_router(brands_router)
