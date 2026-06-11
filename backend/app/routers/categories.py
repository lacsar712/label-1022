"""
Categories Router - Category Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from ..database import get_db
from ..models.category import Category
from ..models.influencer import Influencer
from ..models.user import User
from ..schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger

router = APIRouter(prefix="/api/categories", tags=["分类管理"])


@router.get("", response_model=List[CategoryResponse], summary="获取分类列表")
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有分类"""
    categories = db.query(Category).order_by(Category.sort_order, Category.id).all()
    
    # Add influencer count for each category
    result = []
    for cat in categories:
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "parent_id": cat.parent_id,
            "sort_order": cat.sort_order,
            "created_at": cat.created_at,
            "influencer_count": db.query(Influencer).filter(Influencer.category_id == cat.id).count()
        }
        result.append(CategoryResponse(**cat_dict))
    
    return result


@router.post("", response_model=CategoryResponse, summary="创建分类")
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建分类"""
    # Check if name exists
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类名称已存在"
        )
    
    # Check parent exists if provided
    if category_data.parent_id:
        parent = db.query(Category).filter(Category.id == category_data.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="父分类不存在"
            )
    
    new_category = Category(**category_data.model_dump())
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    logger.info(f"Category created: {new_category.name} by {current_user.username}")
    
    return CategoryResponse(
        id=new_category.id,
        name=new_category.name,
        description=new_category.description,
        parent_id=new_category.parent_id,
        sort_order=new_category.sort_order,
        created_at=new_category.created_at,
        influencer_count=0
    )


@router.get("/{category_id}", response_model=CategoryResponse, summary="获取分类详情")
async def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取分类详情"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    influencer_count = db.query(Influencer).filter(Influencer.category_id == category_id).count()
    
    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        parent_id=category.parent_id,
        sort_order=category.sort_order,
        created_at=category.created_at,
        influencer_count=influencer_count
    )


@router.put("/{category_id}", response_model=CategoryResponse, summary="更新分类")
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新分类"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    # Check if name exists (exclude current)
    if category_data.name:
        existing = db.query(Category).filter(
            Category.name == category_data.name,
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类名称已存在"
            )
    
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    logger.info(f"Category updated: {category.name} by {current_user.username}")
    
    influencer_count = db.query(Influencer).filter(Influencer.category_id == category_id).count()
    
    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        parent_id=category.parent_id,
        sort_order=category.sort_order,
        created_at=category.created_at,
        influencer_count=influencer_count
    )


@router.delete("/{category_id}", summary="删除分类")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除分类"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    # Check for influencers in this category
    influencer_count = db.query(Influencer).filter(Influencer.category_id == category_id).count()
    if influencer_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该分类下有 {influencer_count} 个Influencer，无法删除"
        )
    
    # Check for child categories
    child_count = db.query(Category).filter(Category.parent_id == category_id).count()
    if child_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该分类下有 {child_count} 个子分类，无法删除"
        )
    
    db.delete(category)
    db.commit()
    
    logger.info(f"Category deleted: {category.name} by {current_user.username}")
    
    return {"message": "分类已删除"}
