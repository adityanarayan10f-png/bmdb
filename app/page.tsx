"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Movie = {
  id: string;
  title: string;
  slug: string;
  release_date: string | null;
  language: string | null;
  poster_url: string | null;
  synopsis: string | null;
};

type Person = {
  id: string;
  name: string;
  slug: string;
};

type RatingStats = {
  average: number;
  count: number;
};

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingStats>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: movieData } = await supabase
        .from("movies")
        .select(
          "id, title, slug, release_date, language, poster_url, synopsis"
        )
        .order("release_date", { ascending: false });

      const { data: peopleData } = await supabase
        .from("people")
        .select("id, name, slug")
        .order("name", { ascending: true });

      const { data: ratingData } = await supabase
        .from("ratings")
        .select("movie_id, rating");

      if (movieData) {
        setMovies(movieData);
      }

      if (peopleData) {
        setPeople(peopleData);
      }

      if (ratingData) {
        const ratingMap: Record<string, RatingStats> = {};

        ratingData.forEach((item) => {
          if (!ratingMap[item.movie_id]) {
            ratingMap[item.movie_id] = {
              average: 0,
              count: 0,
            };
          }

          ratingMap[item.movie_id].average += item.rating;
          ratingMap[item.movie_id].count += 1;
        });

        Object.keys(ratingMap).forEach((movieId) => {
          ratingMap[movieId].average =
            ratingMap[movieId].average /
            ratingMap[movieId].count;
        });

        setRatings(ratingMap);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const filteredMovies = useMemo(() => {
    if (!search.trim()) {
      return movies;
    }

    const query = search.toLowerCase();

    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(query)
    );
  }, [movies, search]);

  const featuredMovie =
    movies.find((movie) => movie.slug === "sasura-bada-paisawala") ||
    movies[0];

  const latestMovies = movies.slice(0, 8);

  const popularActors = people.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      {/* NAVBAR */}
      <nav className="border-b border-gray-800 bg-[#080d18]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-3xl font-black tracking-tight">
            <span className="text-yellow-400">B</span>MDB
          </a>

          <div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
            <a href="/" className="transition hover:text-yellow-400">
              Home
            </a>

            <a
              href="#movies"
              className="transition hover:text-yellow-400"
            >
              Movies
            </a>

            <a
              href="#actors"
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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(234,179,8,0.14),_transparent_40%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
              Bhojpuri Cinema Database
            </p>

            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
              Bhojpuri Cinema,
              <br />
              <span className="text-yellow-400">
                All in One Place.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Discover Bhojpuri movies, actors, ratings and
              filmographies in one growing database.
            </p>

            {/* SEARCH */}
            <div className="mt-9 max-w-2xl">
              <div className="flex items-center rounded-xl border border-gray-700 bg-[#0d1320] px-4 shadow-2xl focus-within:border-yellow-400">
                <span className="mr-3 text-xl text-gray-500">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Bhojpuri movies..."
                  className="w-full bg-transparent py-4 text-white outline-none placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH RESULTS */}
      {search.trim() && (
        <section className="mx-auto max-w-7xl px-6 pt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-yellow-400">
                Search
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                Results for "{search}"
              </h2>
            </div>

            <p className="text-sm text-gray-500">
              {filteredMovies.length} movies
            </p>
          </div>

          {filteredMovies.length === 0 ? (
            <p className="mt-8 text-gray-500">
              No movies found.
            </p>
          ) : (
            <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  rating={ratings[movie.id]}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* FEATURED MOVIE */}
      {!search.trim() && featuredMovie && (
        <section className="mx-auto max-w-7xl px-6 pt-14">
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#0d1320]">
            <div className="grid md:grid-cols-2">
              <div className="relative min-h-[380px]">
                <img
                  src={
                    featuredMovie.poster_url ||
                    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80"
                  }
                  alt={featuredMovie.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1320] via-transparent to-transparent md:bg-gradient-to-r" />
              </div>

              <div className="flex flex-col justify-center p-8 md:p-12">
                <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
                  Featured Movie
                </p>

                <h2 className="mt-3 text-4xl font-black md:text-5xl">
                  {featuredMovie.title}
                </h2>

                <p className="mt-3 text-gray-500">
                  {featuredMovie.release_date
                    ? new Date(
                        featuredMovie.release_date
                      ).getFullYear()
                    : "Unknown"}{" "}
                  • {featuredMovie.language || "Bhojpuri"}
                </p>

                {ratings[featuredMovie.id] && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-lg text-yellow-400">
                      ★
                    </span>

                    <span className="font-bold">
                      {ratings[featuredMovie.id].average.toFixed(1)}
                    </span>

                    <span className="text-sm text-gray-500">
                      ({ratings[featuredMovie.id].count} ratings)
                    </span>
                  </div>
                )}

                <p className="mt-6 leading-7 text-gray-400">
                  {featuredMovie.synopsis ||
                    "Explore this film and discover more about its cast, story and place in Bhojpuri cinema."}
                </p>

                <a
                  href={`/movies/${featuredMovie.slug}`}
                  className="mt-8 inline-flex w-fit rounded-lg bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300"
                >
                  View Movie
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LATEST MOVIES */}
      {!search.trim() && (
        <section
          id="movies"
          className="mx-auto max-w-7xl px-6 py-16"
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-yellow-400">
                Explore
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                Latest Movies
              </h2>
            </div>

            <span className="text-sm text-gray-500">
              {movies.length} movies in BMDB
            </span>
          </div>

          {loading ? (
            <p className="mt-8 text-gray-500">
              Loading movies...
            </p>
          ) : (
            <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {latestMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  rating={ratings[movie.id]}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ACTORS */}
      {!search.trim() && (
        <section
          id="actors"
          className="border-y border-gray-800 bg-[#090e19]"
        >
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div>
              <p className="text-sm uppercase tracking-widest text-yellow-400">
                People
              </p>

              <h2 className="mt-1 text-3xl font-bold">
                Actors & Artists
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {popularActors.map((person) => (
                <a
                  key={person.id}
                  href={`/people/${person.slug}`}
                  className="rounded-xl border border-gray-800 bg-[#0d1320] p-5 transition hover:-translate-y-1 hover:border-yellow-400"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#151d2d] text-xl font-bold text-yellow-400">
                    {person.name.charAt(0)}
                  </div>

                  <h3 className="mt-4 font-semibold">
                    {person.name}
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    View filmography →
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

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

function MovieCard({
  movie,
  rating,
}: {
  movie: Movie;
  rating?: RatingStats;
}) {
  return (
    <a
      href={`/movies/${movie.slug}`}
      className="group overflow-hidden rounded-xl border border-gray-800 bg-[#0d1320] transition duration-300 hover:-translate-y-1 hover:border-yellow-400"
    >
      <div className="overflow-hidden">
        <img
          src={
            movie.poster_url ||
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80"
          }
          alt={movie.title}
          className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold transition group-hover:text-yellow-400">
          {movie.title}
        </h3>

        <p className="mt-2 text-xs text-gray-500">
          {movie.release_date
            ? new Date(movie.release_date).getFullYear()
            : "Unknown"}{" "}
          • {movie.language || "Bhojpuri"}
        </p>

        <div className="mt-3 flex items-center justify-between">
          {rating ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>

                <span className="font-semibold">
                  {rating.average.toFixed(1)}
                </span>
              </div>

              <span className="text-xs text-gray-500">
                {rating.count}{" "}
                {rating.count === 1 ? "rating" : "ratings"}
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