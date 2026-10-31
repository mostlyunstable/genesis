from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    username: str = Field(..., description="Analyst email or username")
    password: str = Field(..., description="Analyst plaintext password")


class UserResponse(BaseModel):
    id: str
    username: str
    fullName: str
    role: str
    isActive: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
