"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Genre = {
  id: string;
  name: string;
};

type Movie = {
  id: string;
  title: string;
  slug: string;
  release_date: string | null;
  language: string | null;
  poster_url: string | null;
  synopsis: string | null;
  genreIds: string[];
};

type MovieGenreRow = {
  movie_id: string;
  genre_id: string;
};

const fallbackGenres: Genre[] = [
  { id: "1", name: "Action" },
  { id: "2", name: "Comedy" },
  { id: "3", name: "Crime" },
  { id: "4", name: "Drama" },
  { id: "5", name: "Family" },
  { id: "6", name: "Historical" },
  { id: "7", name: "Musical" },
  { id: "8", name: "Romance" },
  { id: "9", name: "Social" },
  { id: "10", name: "Thriller" },
];

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    setLoading(true);

    try {
      // Load movies
      const moviesResult = await supabase
        .from("movies")
        .select(
          "id,title,slug,release_date,language,poster_url,synopsis"
        )
        .order("release_date", {
          ascending: false,
          nullsFirst: false,
        });

      if (moviesResult.error) {
        console.error(
          "Movie loading error:",
          moviesResult.error
        );
        setLoading(false);
        return;
      }

      // Load genres
      const genresResult = await supabase
        .from("genres")
        .select("id,name")
        .order("name", {
          ascending: true,
        });

      if (genresResult.error) {
        console.error(
          "Genre loading error:",
          genresResult.error
        );
      }

      // Load movie/genre relationships
      const movieGenresResult = await supabase
        .from("movie_genres")
        .select("movie_id,genre_id");

      if (movieGenresResult.error) {
        console.error(
          "Movie genre loading error:",
          movieGenresResult.error
        );
      }

      const movieGenreRows =
        (movieGenresResult.data || []) as MovieGenreRow[];

      const genreMap: Record<string, string[]> = {};

      for (const row of movieGenreRows) {
        if (!genreMap[row.movie_id]) {
          genreMap[row.movie_id] = [];
        }

        genreMap[row.movie_id].push(row.genre_id);
      }

      const formattedMovies: Movie[] = (
        moviesResult.data || []
      ).map((movie) => ({
        id: movie.id,
        title: movie.title,
        slug: movie.slug,
        release_date: movie.release_date,
        language: movie.language,
        poster_url: movie.poster_url,
        synopsis: movie.synopsis,
        genreIds: genreMap[movie.id] || [],
      }));

      setMovies(formattedMovies);

      if (genresResult.data) {
        setGenres(genresResult.data as Genre[]);
      }
    } catch (error) {
      console.error("Homepage loading error:", error);
    }

    setLoading(false);
  }

  const availableGenres =
    genres.length > 0 ? genres : fallbackGenres;

  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // Genre filtering
    if (selectedGenre !== "All") {
      const selectedGenreObject = availableGenres.find(
        (genre) =>
          genre.name.toLowerCase() ===
          selectedGenre.toLowerCase()
      );

      if (selectedGenreObject) {
        result = result.filter((movie) =>
          movie.genreIds.includes(selectedGenreObject.id)
        );
      }
    }

    // Search filtering
    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((movie) =>
        movie.title.toLowerCase().includes(query)
      );
    }

    return result;
  }, [
    movies,
    genres,
    selectedGenre,
    search,
    availableGenres,
  ]);

  const latestMovies = filteredMovies.slice(0, 12);

  return (
    <main className="min-h-screen bg-[#070a10] text-white">
      {/* NAVBAR */}
      <nav className="border-b border-white/10 bg-[#080b12]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500 font-black text-black">
              B
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">
                BMDB
              </div>

              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                Bhojpuri Movie Database
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm text-gray-300 md:flex">
            <Link
              href="/"
              className="transition hover:text-yellow-400"
            >
              Home
            </Link>

            <Link
              href="/movies"
              className="transition hover:text-yellow-400"
            >
              Movies
            </Link>

            <Link
              href="/people"
              className="transition hover:text-yellow-400"
            >
              Actors
            </Link>

            <Link
              href="/admin"
              className="transition hover:text-yellow-400"
            >
              Admin
            </Link>
          </div>

          <Link
            href="/login"
            className="rounded-lg border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(234,179,8,0.12),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
              Bhojpuri Cinema • All in One Place
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
              Discover
              <span className="block text-yellow-400">
                Bhojpuri Cinema
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Explore Bhojpuri movies, actors, directors,
              genres, ratings and stories — all in one place.
            </p>

            {/* SEARCH */}
            <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
                <span className="mr-3 text-gray-500">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search Bhojpuri movies..."
                  className="w-full bg-transparent py-4 text-white outline-none placeholder:text-gray-600"
                />
              </div>

              <Link
                href="/movies"
                className="rounded-xl bg-yellow-500 px-7 py-4 text-center font-bold text-black transition hover:bg-yellow-400"
              >
                Browse Movies
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DATABASE STATS */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-3xl font-black text-yellow-400">
              {movies.length}
            </div>

            <div className="mt-1 text-sm text-gray-500">
              Movies in Database
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-3xl font-black text-yellow-400">
              {genres.length || fallbackGenres.length}
            </div>

            <div className="mt-1 text-sm text-gray-500">
              Genres
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-3xl font-black text-yellow-400">
              BMDB
            </div>

            <div className="mt-1 text-sm text-gray-500">
              Bhojpuri Cinema Database
            </div>
          </div>
        </div>
      </section>

      {/* BROWSE BY GENRE */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
              Explore
            </p>

            <h2 className="text-3xl font-black">
              Browse by Genre
            </h2>
          </div>

          <Link
            href="/movies"
            className="hidden text-sm font-semibold text-yellow-400 hover:underline sm:block"
          >
            View all movies →
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedGenre("All")}
            className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
              selectedGenre === "All"
                ? "border-yellow-500 bg-yellow-500 text-black"
                : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-yellow-500/50 hover:text-yellow-400"
            }`}
          >
            All Movies
          </button>

          {availableGenres.map((genre) => (
            <button
              key={genre.id}
              onClick={() =>
                setSelectedGenre(genre.name)
              }
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                selectedGenre === genre.name
                  ? "border-yellow-500 bg-yellow-500 text-black"
                  : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-yellow-500/50 hover:text-yellow-400"
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </section>

      {/* ALL MOVIES */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
              BMDB Catalogue
            </p>

            <h2 className="text-3xl font-black">
              {selectedGenre === "All"
                ? "All Movies"
                : `${selectedGenre} Movies`}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {filteredMovies.length} movie
              {filteredMovies.length === 1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>

          <Link
            href="/movies"
            className="rounded-lg border border-yellow-500/30 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
          >
            View Full Catalogue →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-gray-500">
            Loading BMDB catalogue...
          </div>
        ) : latestMovies.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <div className="text-lg font-semibold">
              No movies found
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Try another search or genre.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setSelectedGenre("All");
              }}
              className="mt-5 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-bold text-black"
            >
              Show All Movies
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {latestMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-8 md:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
              The BMDB Catalogue
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              Bhojpuri Cinema, All in One Place.
            </h2>

            <p className="mt-4 leading-7 text-gray-400">
              Browse the complete BMDB catalogue and
              discover movies across every genre, year and
              language.
            </p>

            <Link
              href="/movies"
              className="mt-7 inline-flex rounded-xl bg-yellow-500 px-6 py-3 font-bold text-black transition hover:bg-yellow-400"
            >
              Explore All Movies →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-gray-500 md:flex-row">
          <div>
            © {new Date().getFullYear()} BMDB — Bhojpuri Movie
            Database
          </div>

          <div>
            Bhojpuri Cinema, All in One Place.
          </div>
        </div>
      </footer>
    </main>
  );
}

function MovieCard({
  movie,
}: {
  movie: Movie;
}) {
  const year = movie.release_date
    ? movie.release_date.substring(0, 4)
    : "";

  return (
    <Link
      href={`/movies/${movie.slug}`}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#10141d] transition duration-300 hover:-translate-y-1 hover:border-yellow-500/40"
    >
      <div className="aspect-[2/3] overflow-hidden bg-[#171b25]">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <div className="text-3xl font-black text-yellow-500/40">
                BMDB
              </div>

              <div className="mt-2 text-xs text-gray-600">
                No Poster
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-white transition group-hover:text-yellow-400">
          {movie.title}
        </h3>

        {year && (
          <p className="mt-1 text-xs text-gray-500">
            {year}
          </p>
        )}

        {movie.language && (
          <p className="mt-1 text-xs text-gray-600">
            {movie.language}
          </p>
        )}
      </div>
    </Link>
  );
}