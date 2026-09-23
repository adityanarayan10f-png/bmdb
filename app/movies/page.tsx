"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Movie = {
  id: string;
  title: string;
  slug: string;
  release_date: string | null;
  language: string | null;
  poster_url: string | null;
  synopsis: string | null;
};

type Genre = {
  id: string;
  name: string;
};

type MovieGenre = {
  movie_id: string;
  genre_id: string;
};

type RatingStats = {
  average: number;
  count: number;
};

const MOVIES_PER_PAGE = 24;

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [movieGenres, setMovieGenres] = useState<MovieGenre[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingStats>>({});

  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedLanguage, setSelectedLanguage] =
    useState("all");

  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      setErrorMessage("");

      try {
        // -------------------------
        // MOVIES
        // -------------------------

        const { data: movieData, error: movieError } =
          await supabase
            .from("movies")
            .select(
              "id, title, slug, release_date, language, poster_url, synopsis"
            )
            .order("release_date", {
              ascending: false,
              nullsFirst: false,
            });

        if (movieError) {
          console.error(
            "Movie loading error:",
            movieError
          );

          setErrorMessage(
            "Could not load the movie catalogue."
          );

          setLoading(false);
          return;
        }

        // -------------------------
        // GENRES
        // -------------------------

        const { data: genreData, error: genreError } =
          await supabase
            .from("genres")
            .select("id, name")
            .order("name", {
              ascending: true,
            });

        if (genreError) {
          console.error(
            "Genre loading error:",
            genreError
          );
        }

        // -------------------------
        // MOVIE GENRES
        // -------------------------

        const {
          data: movieGenreData,
          error: movieGenreError,
        } = await supabase
          .from("movie_genres")
          .select("movie_id, genre_id");

        if (movieGenreError) {
          console.error(
            "Movie genre loading error:",
            movieGenreError
          );
        }

        // -------------------------
        // RATINGS
        // -------------------------

        const { data: ratingData, error: ratingError } =
          await supabase
            .from("ratings")
            .select("movie_id, rating");

        if (ratingError) {
          console.error(
            "Rating loading error:",
            ratingError
          );
        }

        // -------------------------
        // SAVE MOVIES
        // -------------------------

        if (movieData) {
          setMovies(movieData);
        }

        // -------------------------
        // SAVE GENRES
        // -------------------------

        if (genreData) {
          setGenres(genreData);
        }

        // -------------------------
        // SAVE MOVIE GENRES
        // -------------------------

        if (movieGenreData) {
          setMovieGenres(movieGenreData);
        }

        // -------------------------
        // BUILD RATING MAP
        // -------------------------

        if (ratingData) {
          const ratingMap: Record<
            string,
            RatingStats
          > = {};

          ratingData.forEach((item) => {
            if (!ratingMap[item.movie_id]) {
              ratingMap[item.movie_id] = {
                average: 0,
                count: 0,
              };
            }

            ratingMap[item.movie_id].average +=
              item.rating;

            ratingMap[item.movie_id].count += 1;
          });

          Object.keys(ratingMap).forEach(
            (movieId) => {
              const item = ratingMap[movieId];

              if (item.count > 0) {
                item.average =
                  item.average / item.count;
              }
            }
          );

          setRatings(ratingMap);
        }
      } catch (error) {
        console.error(
          "Catalogue loading error:",
          error
        );

        setErrorMessage(
          "Something went wrong while loading the catalogue."
        );
      }

      setLoading(false);
    }

    loadMovies();
  }, []);

  // -------------------------
  // YEAR OPTIONS
  // -------------------------

  const years = useMemo(() => {
    const yearSet = new Set<number>();

    movies.forEach((movie) => {
      if (movie.release_date) {
        const year = new Date(
          movie.release_date
        ).getFullYear();

        if (!Number.isNaN(year)) {
          yearSet.add(year);
        }
      }
    });

    return Array.from(yearSet).sort(
      (a, b) => b - a
    );
  }, [movies]);

  // -------------------------
  // LANGUAGE OPTIONS
  // -------------------------

  const languages = useMemo(() => {
    const languageSet = new Set<string>();

    movies.forEach((movie) => {
      if (movie.language?.trim()) {
        languageSet.add(movie.language.trim());
      }
    });

    return Array.from(languageSet).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [movies]);

  // -------------------------
  // MOVIE → GENRES MAP
  // -------------------------

  const movieGenreMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    movieGenres.forEach((item) => {
      if (!map[item.movie_id]) {
        map[item.movie_id] = [];
      }

      const genre = genres.find(
        (itemGenre) =>
          itemGenre.id === item.genre_id
      );

      if (genre) {
        map[item.movie_id].push(genre.name);
      }
    });

    return map;
  }, [movieGenres, genres]);

  // -------------------------
  // FILTER + SORT
  // -------------------------

  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // SEARCH
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((movie) =>
        movie.title
          .toLowerCase()
          .includes(query)
      );
    }

    // GENRE
    if (selectedGenre !== "all") {
      result = result.filter((movie) =>
        (movieGenreMap[movie.id] || []).some(
          (genreName) =>
            genreName === selectedGenre
        )
      );
    }

    // YEAR
    if (selectedYear !== "all") {
      result = result.filter((movie) => {
        if (!movie.release_date) {
          return false;
        }

        return (
          new Date(
            movie.release_date
          ).getFullYear().toString() ===
          selectedYear
        );
      });
    }

    // LANGUAGE
    if (selectedLanguage !== "all") {
      result = result.filter(
        (movie) =>
          (movie.language || "") ===
          selectedLanguage
      );
    }

    // SORT
    result.sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = a.release_date
          ? new Date(a.release_date).getTime()
          : 0;

        const dateB = b.release_date
          ? new Date(b.release_date).getTime()
          : 0;

        return dateB - dateA;
      }

      if (sortBy === "oldest") {
        const dateA = a.release_date
          ? new Date(a.release_date).getTime()
          : Number.MAX_SAFE_INTEGER;

        const dateB = b.release_date
          ? new Date(b.release_date).getTime()
          : Number.MAX_SAFE_INTEGER;

        return dateA - dateB;
      }

      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sortBy === "rating") {
        const ratingA =
          ratings[a.id]?.average || 0;

        const ratingB =
          ratings[b.id]?.average || 0;

        return ratingB - ratingA;
      }

      return 0;
    });

    return result;
  }, [
    movies,
    search,
    selectedGenre,
    selectedYear,
    selectedLanguage,
    sortBy,
    movieGenreMap,
    ratings,
  ]);

  // -------------------------
  // PAGINATION
  // -------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredMovies.length /
        MOVIES_PER_PAGE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedMovies =
    filteredMovies.slice(
      (safeCurrentPage - 1) *
        MOVIES_PER_PAGE,
      safeCurrentPage *
        MOVIES_PER_PAGE
    );

  // -------------------------
  // RESET PAGE WHEN FILTERS CHANGE
  // -------------------------

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedGenre,
    selectedYear,
    selectedLanguage,
    sortBy,
  ]);

  // -------------------------
  // CLEAR FILTERS
  // -------------------------

  function clearFilters() {
    setSearch("");
    setSelectedGenre("all");
    setSelectedYear("all");
    setSelectedLanguage("all");
    setSortBy("newest");
    setCurrentPage(1);
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedGenre !== "all" ||
    selectedYear !== "all" ||
    selectedLanguage !== "all";

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      {/* NAVBAR */}

      <nav className="border-b border-gray-800 bg-[#080d18]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-3xl font-black tracking-tight"
          >
            <span className="text-yellow-400">
              B
            </span>
            MDB
          </a>

          <div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
            <a
              href="/"
              className="transition hover:text-yellow-400"
            >
              Home
            </a>

            <a
              href="/movies"
              className="text-yellow-400"
            >
              Movies
            </a>

            <a
              href="/#actors"
              className="transition hover:text-yellow-400"
            >
              Actors
            </a>

            <a
              href="/auth/login"
              className="rounded-lg border border-gray-700 px-4 py-2 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              Sign In
            </a>
          </div>

          <a
            href="/auth/login"
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 md:hidden"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* HEADER */}

      <section className="border-b border-gray-800 bg-[#090e19]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Bhojpuri Cinema
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
            All Movies
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-400">
            Explore the growing BMDB catalogue of
            Bhojpuri movies. Search, filter and
            discover films across different years
            and genres.
          </p>
        </div>
      </section>

      {/* FILTER AREA */}

      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="rounded-2xl border border-gray-800 bg-[#0d1320] p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* SEARCH */}

            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Search
              </label>

              <div className="flex items-center rounded-lg border border-gray-700 bg-[#080d18] px-4 focus-within:border-yellow-400">
                <span className="mr-3 text-lg text-gray-500">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search movies..."
                  className="w-full bg-transparent py-3 text-white outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* GENRE */}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Genre
              </label>

              <select
                value={selectedGenre}
                onChange={(event) =>
                  setSelectedGenre(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-[#080d18] px-3 py-3 text-white outline-none focus:border-yellow-400"
              >
                <option value="all">
                  All Genres
                </option>

                {genres.map((genre) => (
                  <option
                    key={genre.id}
                    value={genre.name}
                  >
                    {genre.name}
                  </option>
                ))}
              </select>
            </div>

            {/* YEAR */}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Year
              </label>

              <select
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-[#080d18] px-3 py-3 text-white outline-none focus:border-yellow-400"
              >
                <option value="all">
                  All Years
                </option>

                {years.map((year) => (
                  <option
                    key={year}
                    value={year.toString()}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* LANGUAGE */}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Language
              </label>

              <select
                value={selectedLanguage}
                onChange={(event) =>
                  setSelectedLanguage(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-[#080d18] px-3 py-3 text-white outline-none focus:border-yellow-400"
              >
                <option value="all">
                  All Languages
                </option>

                {languages.map((language) => (
                  <option
                    key={language}
                    value={language}
                  >
                    {language}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SORT + CLEAR */}

          <div className="mt-5 flex flex-col gap-4 border-t border-gray-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-500">
                Sort by
              </label>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
                className="rounded-lg border border-gray-700 bg-[#080d18] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
              >
                <option value="newest">
                  Newest First
                </option>

                <option value="oldest">
                  Oldest First
                </option>

                <option value="title">
                  Title A–Z
                </option>

                <option value="rating">
                  Highest Rated
                </option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-fit rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-yellow-400 hover:text-yellow-400"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* RESULTS */}

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-yellow-400">
              Catalogue
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              {hasActiveFilters
                ? "Filtered Movies"
                : "All Movies"}
            </h2>
          </div>

          <p className="text-sm text-gray-500">
            Showing{" "}
            {filteredMovies.length === 0
              ? 0
              : (safeCurrentPage - 1) *
                  MOVIES_PER_PAGE +
                1}
            –
            {Math.min(
              safeCurrentPage *
                MOVIES_PER_PAGE,
              filteredMovies.length
            )}{" "}
            of {filteredMovies.length} movies
          </p>
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-8 rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-300">
            {errorMessage}
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="py-20 text-center text-gray-500">
            Loading movie catalogue...
          </div>
        ) : filteredMovies.length === 0 ? (
          /* NO RESULTS */

          <div className="mt-10 rounded-2xl border border-gray-800 bg-[#0d1320] px-6 py-16 text-center">
            <div className="text-5xl">🎬</div>

            <h3 className="mt-5 text-xl font-bold">
              No movies found
            </h3>

            <p className="mt-2 text-gray-500">
              Try changing your search or filters.
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* MOVIE GRID */}

            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {paginatedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  rating={ratings[movie.id]}
                  genres={
                    movieGenreMap[movie.id] ||
                    []
                  }
                />
              ))}
            </div>

            {/* PAGINATION */}

            {totalPages > 1 && (
              <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.max(
                          1,
                          page - 1
                        )
                    )
                  }
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-yellow-400 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Previous
                </button>

                {Array.from(
                  {
                    length: totalPages,
                  },
                  (_, index) =>
                    index + 1
                )
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(
                        page -
                          safeCurrentPage
                      ) <= 2
                    );
                  })
                  .map((page, index, pages) => {
                    const previousPage =
                      pages[index - 1];

                    const showEllipsis =
                      previousPage &&
                      page -
                        previousPage >
                        1;

                    return (
                      <div
                        key={page}
                        className="flex items-center gap-2"
                      >
                        {showEllipsis && (
                          <span className="px-1 text-gray-600">
                            …
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage(
                              page
                            )
                          }
                          className={
                            page ===
                            safeCurrentPage
                              ? "h-10 min-w-10 rounded-lg bg-yellow-400 px-3 text-sm font-bold text-black"
                              : "h-10 min-w-10 rounded-lg border border-gray-700 px-3 text-sm text-gray-300 transition hover:border-yellow-400 hover:text-yellow-400"
                          }
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}

                <button
                  type="button"
                  disabled={
                    safeCurrentPage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.min(
                          totalPages,
                          page + 1
                        )
                    )
                  }
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-yellow-400 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* FOOTER */}

      <footer className="border-t border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-bold text-white">
              BMDB
            </span>

            <span className="ml-2">
              Bhojpuri Cinema, All in One Place.
            </span>
          </div>

          <p>
            A growing database for Bhojpuri cinema.
          </p>
        </div>
      </footer>
    </main>
  );
}

// =====================================================
// MOVIE CARD
// =====================================================

function MovieCard({
  movie,
  rating,
  genres,
}: {
  movie: Movie;
  rating?: RatingStats;
  genres: string[];
}) {
  return (
    <a
      href={`/movies/${movie.slug}`}
      className="group overflow-hidden rounded-xl border border-gray-800 bg-[#0d1320] transition duration-300 hover:-translate-y-1 hover:border-yellow-400"
    >
      {/* POSTER */}

      <div className="overflow-hidden">
        <img
          src={
            movie.poster_url ||
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80"
          }
          alt={`${movie.title} poster`}
          className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      {/* INFORMATION */}

      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold transition group-hover:text-yellow-400">
          {movie.title}
        </h3>

        <p className="mt-2 text-xs text-gray-500">
          {movie.release_date
            ? new Date(
                movie.release_date
              ).getFullYear()
            : "Unknown"}{" "}
          • {movie.language || "Bhojpuri"}
        </p>

        {/* GENRES */}

        {genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {genres.slice(0, 2).map(
              (genre) => (
                <span
                  key={genre}
                  className="rounded-md border border-gray-700 bg-[#080d18] px-2 py-1 text-[10px] text-gray-400"
                >
                  {genre}
                </span>
              )
            )}
          </div>
        )}

        {/* RATING */}

        <div className="mt-3 flex items-center justify-between">
          {rating ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">
                  ★
                </span>

                <span className="font-semibold">
                  {rating.average.toFixed(1)}
                </span>
              </div>

              <span className="text-xs text-gray-500">
                {rating.count}{" "}
                {rating.count === 1
                  ? "rating"
                  : "ratings"}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-600">
              No ratings yet
            </span>
          )}
        </div>
      </div>
    </a>
  );
}