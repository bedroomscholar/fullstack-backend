const express = require("express");
const morgan = require("morgan");
 
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(morgan("dev"));

/*function simpleLogger(req, res, next) {
  console.log(req.method, req.originalUrl);
  next();
}
app.use(simpleLogger);*/

// in-memory data
let movies = [
  { id: 1, title: "Inception", year: 2010, genre: "Sci-Fi" },
  { id: 2, title: "The Matrix", year: 1999, genre: "Sci-Fi" },
  { id: 3, title: "Parasite", year: 2019, genre: "Thriller" },
];

function validateMovie(body, partial = false) {
  const errors = [];
  const maximumYear = new Date().getFullYear() + 5;

  if (!partial && body.title === undefined) {
    errors.push("title is required");
  }
  if (
    body.title !== undefined &&
    (typeof body.title !== "string" || body.title.trim().length === 0)
  ) {
    errors.push("title must be a non-empty string");
  }

  if (!partial && body.year === undefined) {
    errors.push("year is required");
  }
  if (
    body.year !== undefined &&
    (!Number.isInteger(body.year) ||
      body.year < 1888 ||
      body.year > maximumYear)
  ) {
    errors.push(`year must be an integer between 1888 and ${maximumYear}`);
  }

  if (!partial && body.genre === undefined) {
    errors.push("genre is required");
  }
  if (
    body.genre !== undefined &&
    (typeof body.genre !== "string" || body.genre.trim().length === 0)
  ) {
    errors.push("genre must be a non-empty string");
  }

  return errors;
}

function sendValidationError(res, details) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Movie data is invalid",
      details,
    },
  });
}

function sendMovieNotFound(res) {
  return res.status(404).json({
    error: {
      code: "MOVIE_NOT_FOUND",
      message: "Movie not found",
    },
  });
}

// GET /movies: return all
app.get("/movies", (req, res) => {
  const { genre, minYear, sort } = req.query;
  const errors = [];

  if (genre !== undefined && typeof genre !== "string") {
    errors.push("genre must be a single value");
  }

  let minYearNumber;
  if (minYear !== undefined) {
    minYearNumber = Number(minYear);
    if (
      typeof minYear !== "string" ||
      minYear.trim() === "" ||
      !Number.isInteger(minYearNumber)
    ) {
      errors.push("minYear must be an integer");
    }
  }

  const allowedSorts = ["year", "title"];
  if (sort !== undefined && !allowedSorts.includes(sort)) {
    errors.push("sort must be one of: year, title");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: "INVALID_QUERY",
        message: "Query parameters are invalid",
        details: errors,
      },
    });
  }

  // Work on a copy so the original array order never changes
  let result = [...movies];

  if (genre !== undefined) {
    result = result.filter(
      (m) => m.genre.toLowerCase() === genre.toLowerCase()
    );
  }
  if (minYear !== undefined) {
    result = result.filter((m) => m.year >= minYearNumber);
  }
  if (sort === "year") {
    result.sort((a, b) => a.year - b.year);
  } else if (sort === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  res.status(200).json(result);
});

// GET /movies/:id：return single
app.get("/movies/:id", (req, res) => {
  const movie = movies.find((m) => m.id === Number(req.params.id));
  if (!movie) return sendMovieNotFound(res);
  res.status(200).json(movie);
});

// POST /movies: new add
app.post("/movies", (req, res) => {
  const body = req.body ?? {};
  const errors = validateMovie(body, false);
  if (errors.length > 0) return sendValidationError(res, errors);

  const newId =
    movies.length > 0 ? Math.max(...movies.map((m) => m.id)) + 1 : 1;
  const newMovie = {
    id: newId,
    title: body.title,
    year: body.year,
    genre: body.genre,
  };

  movies.push(newMovie);
  res.status(201).json(newMovie);
});

app.put("/movies/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = movies.findIndex((m) => m.id === id);
  if (index === -1) return sendMovieNotFound(res);

  const body = req.body ?? {};
  const errors = validateMovie(body, false);
  if (errors.length > 0) return sendValidationError(res, errors);

  const replacedMovie = {
    id,
    title: body.title,
    year: body.year,
    genre: body.genre,
  };
  movies[index] = replacedMovie;
  res.status(200).json(replacedMovie);
});

app.patch("/movies/:id", (req, res) => {
  const movie = movies.find((m) => m.id === Number(req.params.id));
  if (!movie) return sendMovieNotFound(res);

  const body = req.body ?? {};
  const errors = validateMovie(body, true);
  if (errors.length > 0) return sendValidationError(res, errors);

  if (body.title !== undefined) movie.title = body.title;
  if (body.year !== undefined) movie.year = body.year;
  if (body.genre !== undefined) movie.genre = body.genre;

  res.status(200).json(movie);
});

app.delete("/movies/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = movies.some((m) => m.id === id);
  if (!exists) return sendMovieNotFound(res);

  movies = movies.filter((m) => m.id !== id);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested route does not exist",
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

