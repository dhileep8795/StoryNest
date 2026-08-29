from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .database import Base, engine, get_db
from .models import Comment, Follow, Like, Notification, Post, User
from .schemas import CommentCreate, CommentOut, NotificationOut, PostCreate, PostOut, PostUpdate, Token, UserCreate, UserOut, PublicUserOut
from .security import create_access_token, get_current_user, hash_password, verify_password

Base.metadata.create_all(bind=engine)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="InkNest API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://storynest.dmunige.workers.dev"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def post_out(db: Session, post: Post) -> PostOut:
    return PostOut(id=post.id, body=post.body, author_id=post.author_id, author_username=post.author.username,
                   like_count=db.scalar(select(func.count(Like.id)).where(Like.post_id == post.id)) or 0,
                   comment_count=db.scalar(select(func.count(Comment.id)).where(Comment.post_id == post.id)) or 0,
                   created_at=post.created_at, updated_at=post.updated_at)


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    return post


@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where((User.email == data.email) | (User.username == data.username))):
        raise HTTPException(409, "Email or username is already registered")
    print(f"Registering user: {data.username}, email: {data.email}")  # Debugging line
    print(f"Password length: {len(data.password)}")  # Debugging line
    user = User(username=data.username, email=data.email, password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return user


@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return Token(access_token=create_access_token(user.id))


@app.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(data: PostCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    post = Post(body=data.body, author_id=current.id)
    db.add(post); db.commit(); db.refresh(post)
    return post_out(db, post)


@app.patch("/posts/{post_id}", response_model=PostOut)
def update_post(post_id: int, data: PostUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    if post.author_id != current.id:
        raise HTTPException(403, "You can update only your own post")
    post.body = data.body; db.commit(); db.refresh(post)
    return post_out(db, post)


@app.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    if post.author_id != current.id:
        raise HTTPException(403, "You can delete only your own post")
    db.delete(post); db.commit()


@app.post("/users/{user_id}/follow", status_code=status.HTTP_201_CREATED)
def follow(user_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if user_id == current.id: raise HTTPException(400, "You cannot follow yourself")
    if not db.get(User, user_id): raise HTTPException(404, "User not found")
    if db.scalar(select(Follow).where(Follow.follower_id == current.id, Follow.following_id == user_id)):
        raise HTTPException(409, "Already following this user")
    db.add(Follow(follower_id=current.id, following_id=user_id)); db.commit()
    return {"detail": "Following user"}


@app.delete("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow(user_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    row = db.scalar(select(Follow).where(Follow.follower_id == current.id, Follow.following_id == user_id))
    if not row: raise HTTPException(404, "You do not follow this user")
    db.delete(row); db.commit()


@app.get("/feed", response_model=list[PostOut])
def feed(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    following = select(Follow.following_id).where(Follow.follower_id == current.id)
    posts = db.scalars(select(Post).where(Post.author_id.in_(following)).order_by(Post.created_at.desc())).all()
    return [post_out(db, post) for post in posts]


@app.post("/posts/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    if db.scalar(select(Like).where(Like.post_id == post.id, Like.user_id == current.id)):
        raise HTTPException(409, "Post is already liked")
    db.add(Like(post_id=post.id, user_id=current.id))
    if post.author_id != current.id:
        db.add(Notification(recipient_id=post.author_id, actor_id=current.id, post_id=post.id, kind="like"))
    db.commit()
    return {"detail": "Post liked"}


@app.delete("/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(post_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    like = db.scalar(select(Like).where(Like.post_id == post_id, Like.user_id == current.id))
    if not like: raise HTTPException(404, "Like not found")
    db.delete(like); db.commit()


@app.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def comment(post_id: int, data: CommentCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    new_comment = Comment(body=data.body, user_id=current.id, post_id=post.id)
    db.add(new_comment)
    if post.author_id != current.id:
        db.add(Notification(recipient_id=post.author_id, actor_id=current.id, post_id=post.id, kind="comment"))
    db.commit(); db.refresh(new_comment)
    return CommentOut(
    id=new_comment.id,
    body=new_comment.body,
    user_id=current.id,
    username=current.username,
    post_id=new_comment.post_id,
    created_at=new_comment.created_at,
)


@app.get("/notifications", response_model=list[NotificationOut])
def notifications(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(Notification)
        .where(Notification.recipient_id == current.id)
        .order_by(Notification.created_at.desc())
    ).all()

    return [
        NotificationOut(
            id=row.id,
            kind=row.kind,
            read=row.read,
            actor_id=row.actor_id,
            actor_username=db.get(User, row.actor_id).username,
            post_id=row.post_id,
            created_at=row.created_at,
        )
        for row in rows
    ]

@app.patch("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(notification_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    notification = db.get(Notification, notification_id)
    if not notification or notification.recipient_id != current.id: raise HTTPException(404, "Notification not found")
    notification.read = True; db.commit()

@app.get("/users", response_model=list[PublicUserOut])
def recent_users(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    users = db.scalars(
        select(User)
        .where(User.id != current.id)
        .order_by(User.created_at.desc())
        .limit(50)
    ).all()

    following_ids = set(
        db.scalars(
            select(Follow.following_id).where(
                Follow.follower_id == current.id
            )
        ).all()
    )

    return [
        PublicUserOut(
            id=user.id,
            username=user.username,
            is_following=user.id in following_ids,
        )
        for user in users
    ]


@app.get("/users/{user_id}", response_model=PublicUserOut)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_following = db.scalar(
        select(Follow).where(
            Follow.follower_id == current.id,
            Follow.following_id == user_id,
        )
    ) is not None

    return PublicUserOut(
        id=user.id,
        username=user.username,
        is_following=is_following,
    )
@app.get("/posts/{post_id}/comments", response_model=list[CommentOut])
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    comments = db.scalars(
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
    ).all()

    return [
        CommentOut(
            id=comment.id,
            body=comment.body,
            user_id=comment.user_id,
            username=db.get(User, comment.user_id).username,
            post_id=comment.post_id,
            created_at=comment.created_at,
        )
        for comment in comments
    ]

@app.get("/feed", response_model=list[PostOut])
def feed(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    followed_user_ids = select(Follow.following_id).where(
        Follow.follower_id == current.id
    )

    posts = db.scalars(
        select(Post)
        .where(
            or_(
                Post.author_id == current.id,          # My own posts
                Post.author_id.in_(followed_user_ids), # Followed users' posts
            )
        )
        .order_by(Post.created_at.desc())
        .limit(100)
    ).all()

    return [post_out(db, post) for post in posts]


@app.get("/my-posts", response_model=list[PostOut])
def my_posts(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    posts = db.scalars(
        select(Post)
        .where(Post.author_id == current.id)
        .order_by(Post.created_at.desc())
    ).all()

    return [post_out(db, post) for post in posts]


@app.get("/posts/{post_id}/likes", response_model=list[PublicUserOut])
def get_liked_users(
    post_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    liked_users = db.scalars(
        select(User)
        .join(Like, Like.user_id == User.id)
        .where(Like.post_id == post_id)
        .order_by(Like.created_at.desc())
    ).all()

    following_ids = set(
        db.scalars(
            select(Follow.following_id).where(
                Follow.follower_id == current.id
            )
        ).all()
    )

    return [
        PublicUserOut(
            id=user.id,
            username=user.username,
            is_following=user.id in following_ids,
        )
        for user in liked_users
    ]