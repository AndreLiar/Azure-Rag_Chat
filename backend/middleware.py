import jwt
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from database import tenant_id_context
from services.auth_service import SECRET_KEY, ALGORITHM


class TenantContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Public endpoints that don't require tenant context
        public_paths = [
            "/docs",
            "/openapi.json",
            "/auth/login",
            "/auth/register",
            "/health",
            "/",
        ]
        if request.url.path in public_paths:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            tenant_id = payload.get("organization_id")
            if not tenant_id:
                raise HTTPException(
                    status_code=401, detail="Invalid token: organization_id missing"
                )

            # Set tenant_id in context variable
            tenant_id_context.set(tenant_id)

        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

        response = await call_next(request)
        return response
