# InkNest FastAPI backend

Writing-focused social backend with JWT authentication, post CRUD, follows and a personalised feed, likes, comments, and stored in-app notifications for the post author.

## Run

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Windows PowerShell: Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for Swagger UI. Login takes form data: put the user's **email** in `username`, then use the returned token via Swagger's **Authorize** button.

## Main endpoints

| Action | Endpoint |
|---|---|
| Register / login | `POST /auth/register`, `POST /auth/login` |
| Create/update/delete post | `POST /posts`, `PATCH /posts/{id}`, `DELETE /posts/{id}` |
| Follow/unfollow | `POST` / `DELETE /users/{user_id}/follow` |
| Followed users' posts | `GET /feed` |
| Like/unlike | `POST` / `DELETE /posts/{id}/like` |
| Comment | `POST /posts/{id}/comments` |
| Read notifications | `GET /notifications` |

## Notes for production

- Change `SECRET_KEY`, use PostgreSQL, and run migrations with Alembic.
- Add pagination, rate limiting, image storage (S3), input moderation, and async push/email workers for real notifications.
- Notifications here are persisted in the database and fetched from `/notifications`; they are not mobile push notifications yet.
