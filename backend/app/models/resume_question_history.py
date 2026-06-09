from pydantic import BaseModel, ConfigDict, Field

from app.models.resume_questions import ResumeQuestion


class ResumeQuestionHistoryListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resume_id: str = Field(alias="resumeId")
    questions: list[ResumeQuestion]


class ResumeQuestionHistoryUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    is_favorite: bool | None = Field(default=None, alias="isFavorite")
    mark_practiced: bool = Field(default=False, alias="markPracticed")


class ResumeQuestionHistoryDeleteResponse(BaseModel):
    deleted: bool
    id: str
