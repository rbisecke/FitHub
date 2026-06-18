# Skill: new-endpoint

Add a new FastAPI route.

## Steps

1. Create/update the router in `apps/api/app/routers/<resource>.py`
2. Add request/response Pydantic models — no `Any`, explicit fields
3. Wire auth dependency: `user_id = Depends(require_auth)`
4. Scope all DB queries to `user_id` — never return other users' data
5. Return 404 (not 403) when the resource doesn't exist or belongs to another user
6. Register the router in `apps/api/app/main.py`
7. Write tests:
   - `test_<resource>_unauthenticated` → 401
   - `test_<resource>_other_user` → 404
   - `test_<resource>_happy_path` → expected response

## Rules

- Explicit response model on every route — no raw DB row exposure.
- No `except: pass` — raise `HTTPException` with appropriate status.
- Functions < 40 lines.
