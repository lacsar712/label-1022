"""
Authentication Router - Login, Register, Current User
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models.user import User, Role
from ..schemas.user import UserCreate, UserLogin, Token, UserResponse
from ..utils.security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user
)
from ..utils.logger import logger
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=UserResponse, summary="用户注册")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    用户注册
    - 检查用户名是否已存在
    - 创建新用户，默认为普通用户角色
    """
    # Check if username exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # Check if email exists (if provided)
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已被注册"
            )
    
    # Get default role (user)
    default_role = db.query(Role).filter(Role.name == "user").first()
    if not default_role:
        default_role = db.query(Role).filter(Role.id == 3).first()
    
    # Create user
    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        email=user_data.email,
        phone=user_data.phone,
        nickname=user_data.nickname or user_data.username,
        role_id=default_role.id if default_role else 3,
        status="active"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"New user registered: {new_user.username}")
    
    return new_user


@router.post("/login", response_model=Token, summary="用户登录")
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    用户登录
    - 验证用户名和密码
    - 返回JWT Token
    """
    # Find user
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    # Check if user is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被禁用，请联系管理员"
        )
    
    # Create access token - sub must be a string per JWT standard
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"User logged in: {user.username}")
    
    return Token(access_token=access_token, user=user)


@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return current_user
