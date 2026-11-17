from datetime import date
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Movie API")

MAX_YEAR = date.today().year + 5

# in-memory data (same as the Express version)
movies = [
    {"id": 1, "title": "Inception", "year": 2010, "genre": "Sci-Fi"},
    {"id": 2, "title": "The Matrix", "year": 1999, "genre": "Sci-Fi"},
    {"id": 3, "title": "Parasite", "year": 2019, "genre": "Thriller"},
]


# Used by POST and PUT: every field is required
class MovieCreate(BaseModel):
    title: str = Field(min_length=1)
    year: int = Field(ge=1888, le=MAX_YEAR)
    genre: str = Field(min_length=1)


# Used by PATCH: every field is optional
class MovieUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    year: int | None = Field(default=None, ge=1888, le=MAX_YEAR)
    genre: str | None = Field(default=None, min_length=1)


def find_movie(movie_id: int):
    for movie in movies:
        if movie["id"] == movie_id:
            return movie
    raise HTTPException(status_code=404, detail="Movie not found")


@app.get("/")
def root():
    return {"message": "Hello from FastAPI"}


@app.get("/movies")
def get_movies(
    genre: str | None = None,
    min_year: int | None = None,
    sort: Literal["year", "title"] | None = None,
):
    result = movies

    if genre is not None:
        result = [m for m in result if m["genre"].lower() == genre.lower()]
    if min_year is not None:
        result = [m for m in result if m["year"] >= min_year]
    if sort is not None:
        result = sorted(result, key=lambda m: m[sort])

    return result


@app.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    return find_movie(movie_id)


@app.post("/movies", status_code=201)
def create_movie(data: MovieCreate):
    new_id = max((m["id"] for m in movies), default=0) + 1
    new_movie = {"id": new_id, **data.model_dump()}
    movies.append(new_movie)
    return new_movie


@app.put("/movies/{movie_id}")
def replace_movie(movie_id: int, data: MovieCreate):
    movie = find_movie(movie_id)
    index = movies.index(movie)
    movies[index] = {"id": movie_id, **data.model_dump()}
    return movies[index]


@app.patch("/movies/{movie_id}")
def update_movie(movie_id: int, data: MovieUpdate):
    movie = find_movie(movie_id)
    # exclude_unset=True keeps only the fields the client actually sent
    movie.update(data.model_dump(exclude_unset=True))
    return movie


@app.delete("/movies/{movie_id}", status_code=204)
def delete_movie(movie_id: int):
    movie = find_movie(movie_id)
    movies.remove(movie)
