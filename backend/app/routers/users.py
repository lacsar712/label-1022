"""
Users Router - User Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.user import User, Role
from ..schemas.user import (
    UserResponse, 
    UserUpdate, 
    UserRoleUpdate, 
    UserStatusUpdate,
    PasswordChange,
    RoleResponse
)
from ..utils.security import (
    get_current_user, 
    get_admin_user, 
    get_password_hash,
    verify_password
)
from ..utils.logger import logger

router = APIRouter(prefix="/api/users", tags=["用户管理"])


@router.get("", summary="获取用户列表")
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = None,
    role_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    获取用户列表（管理员）
    - 支持分页
    - 支持按关键词、角色、状态筛选
    """
    query = db.query(User)
    
    if keyword:
        query = query.filter(
            (User.username.contains(keyword)) |
            (User.nickname.contains(keyword)) |
            (User.email.contains(keyword))
        )
    
    if role_id:
        query = query.filter(User.role_id == role_id)
    
    if status:
        query = query.filter(User.status == status)
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return {"items": users, "total": total}


@router.get("/count", summary="获取用户数量")
async def get_users_count(
    keyword: Optional[str] = None,
    role_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """获取用户总数"""
    query = db.query(User)
    
    if keyword:
        query = query.filter(
            (User.username.contains(keyword)) |
            (User.nickname.contains(keyword)) |
            (User.email.contains(keyword))
        )
    
    if role_id:
        query = query.filter(User.role_id == role_id)
    
    if status:
        query = query.filter(User.status == status)
    
    return {"total": query.count()}


@router.get("/roles", response_model=List[RoleResponse], summary="获取角色列表")
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有角色"""
    roles = db.query(Role).all()
    return roles


@router.get("/{user_id}", response_model=UserResponse, summary="获取用户详情")
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """获取指定用户详情"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    return user


@router.put("/{user_id}", response_model=UserResponse, summary="更新用户信息")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """更新用户信息（管理员）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"User updated: {user.username} by admin {current_user.username}")
    
    return user


@router.put("/{user_id}/role", response_model=UserResponse, summary="更新用户角色")
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    更新用户角色（管理员）
    - 管理员不能修改自己的角色
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的角色"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # Check if role exists
    role = db.query(Role).filter(Role.id == role_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="角色不存在"
        )
    
    user.role_id = role_data.role_id
    db.commit()
    db.refresh(user)
    
    logger.info(f"User role updated: {user.username} to {role.name} by admin {current_user.username}")
    
    return user


@router.put("/{user_id}/status", response_model=UserResponse, summary="更新用户状态")
async def update_user_status(
    user_id: int,
    status_data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    更新用户状态（管理员）
    - 管理员不能禁用自己
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的状态"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    user.status = status_data.status
    db.commit()
    db.refresh(user)
    
    logger.info(f"User status updated: {user.username} to {status_data.status} by admin {current_user.username}")
    
    return user


@router.delete("/{user_id}", summary="删除用户")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """删除用户（管理员）"""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # Check for related collaborations
    from ..models.collaboration import Collaboration
    collab_count = db.query(Collaboration).filter(Collaboration.user_id == user_id).count()
    if collab_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该用户有 {collab_count} 条合作记录，无法删除"
        )
    
    db.delete(user)
    db.commit()
    
    logger.info(f"User deleted: {user.username} by admin {current_user.username}")
    
    return {"message": "用户已删除"}
