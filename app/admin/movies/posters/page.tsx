"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Movie = {
  id: string;
  title: string;
  slug: string;
  release_date: string | null;
  poster_url: string | null;
};

type Candidate = {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  source: string;
};

export default function PosterManagerPage() {
  const [movies, setMovies] =
    useState<Movie[]>([]);

  const [filteredMovies, setFilteredMovies] =
    useState<Movie[]>([]);

  const [selectedMovie, setSelectedMovie] =
    useState<Movie | null>(null);

  const [candidates, setCandidates] =
    useState<Candidate[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    const value =
      search.toLowerCase().trim();

    if (!value) {
      setFilteredMovies(movies);
      return;
    }

    setFilteredMovies(
      movies.filter((movie) =>
        movie.title
          .toLowerCase()
          .includes(value)
      )
    );
  }, [search, movies]);

  async function loadMovies() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "You must be logged in."
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role !== "admin") {
        setError(
          "Admin access required."
        );
        return;
      }

      const {
        data,
        error: moviesError,
      } = await supabase
        .from("movies")
        .select(
          "id, title, slug, release_date, poster_url"
        )
        .order("title", {
          ascending: true,
        });

      if (moviesError) {
        throw moviesError;
      }

      setMovies(data || []);
      setFilteredMovies(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load movies."
      );
    } finally {
      setLoading(false);
    }
  }

  async function findPosters(
    movie: Movie
  ) {
    setSelectedMovie(movie);
    setCandidates([]);
    setMessage("");
    setError("");
    setSearching(true);

    try {
      const year = movie.release_date
        ? movie.release_date.substring(
            0,
            4
          )
        : "";

      const response = await fetch(
        `/api/posters/search?query=${encodeURIComponent(
          movie.title
        )}&year=${encodeURIComponent(
          year
        )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Poster search failed."
        );
      }

      const results =
        data?.candidates || [];

      setCandidates(results);

      if (!results.length) {
        setMessage(
          `No poster results found for ${movie.title}.`
        );
      } else {
        setMessage(
          `${results.length} possible images found.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Poster search failed."
      );
    } finally {
      setSearching(false);
    }
  }

  async function usePoster(
    candidate: Candidate
  ) {
    if (!selectedMovie) {
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/posters/save",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              movieId:
                selectedMovie.id,

              movieSlug:
                selectedMovie.slug,

              imageUrl:
                candidate.imageUrl,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not save poster."
        );
      }

      const updatedMovie = {
        ...selectedMovie,
        poster_url:
          data.publicUrl,
      };

      setSelectedMovie(
        updatedMovie
      );

      setMovies((current) =>
        current.map((movie) =>
          movie.id ===
          selectedMovie.id
            ? updatedMovie
            : movie
        )
      );

      setMessage(
        `Poster saved successfully for ${selectedMovie.title}!`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save poster."
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">
            🎬
          </div>

          <p className="text-gray-400">
            Loading BMDB poster manager...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <nav className="border-b border-white/10 bg-black/30">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <a
            href="/"
            className="text-2xl font-black"
          >
            <span className="text-yellow-400">
              B
            </span>
            MDB
          </a>

          <div className="flex gap-5 text-sm">
            <a
              href="/admin"
              className="text-gray-400 hover:text-white"
            >
              Admin
            </a>

            <a
              href="/admin/movies"
              className="text-gray-400 hover:text-white"
            >
              Movies
            </a>

            <a
              href="/admin/movies/enrich"
              className="text-gray-400 hover:text-white"
            >
              Enrich
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-black">
          Movie Poster Manager
        </h1>

        <p className="text-gray-400 mt-2 mb-8">
          Search the web for movie posters
          and save the correct one to BMDB.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-yellow-200">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
          {/* MOVIE LIST */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="p-5 border-b border-white/10">
              <h2 className="text-xl font-bold mb-4">
                Movies
              </h2>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search movie..."
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-yellow-400"
              />
            </div>

            <div className="max-h-[680px] overflow-y-auto">
              {filteredMovies.map(
                (movie) => (
                  <div
                    key={movie.id}
                    className={`p-4 border-b border-white/5 ${
                      selectedMovie?.id ===
                      movie.id
                        ? "bg-yellow-400/10"
                        : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/40 shrink-0">
                        {movie.poster_url ? (
                          <img
                            src={
                              movie.poster_url
                            }
                            alt={
                              movie.title
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            🎬
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">
                          {
                            movie.title
                          }
                        </h3>

                        <p className="text-xs text-gray-500 mt-1">
                          {movie.poster_url
                            ? "✓ Poster exists"
                            : "No poster"}
                        </p>

                        <button
                          onClick={() =>
                            findPosters(
                              movie
                            )
                          }
                          disabled={
                            searching
                          }
                          className="mt-2 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
                        >
                          {searching &&
                          selectedMovie?.id ===
                            movie.id
                            ? "Searching..."
                            : "Find Posters"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {/* RESULTS */}

          <section>
            {!selectedMovie && (
              <div className="min-h-[450px] rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-center">
                <div>
                  <div className="text-6xl mb-4">
                    🖼️
                  </div>

                  <h2 className="text-2xl font-bold">
                    Select a movie
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Click Find Posters beside
                    a movie.
                  </p>
                </div>
              </div>
            )}

            {selectedMovie && (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-500">
                    Selected movie
                  </p>

                  <h2 className="text-3xl font-black">
                    {
                      selectedMovie.title
                    }
                  </h2>

                  {selectedMovie.release_date && (
                    <p className="text-gray-500 mt-1">
                      {
                        selectedMovie.release_date.substring(
                          0,
                          4
                        )
                      }
                    </p>
                  )}
                </div>

                {searching && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-14 text-center">
                    <div className="text-5xl mb-4">
                      🔎
                    </div>

                    <h3 className="text-xl font-bold">
                      Searching the web...
                    </h3>

                    <p className="text-gray-500 mt-2">
                      Looking for the actual
                      movie poster.
                    </p>
                  </div>
                )}

                {!searching &&
                  candidates.length ===
                    0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-14 text-center">
                      <div className="text-5xl mb-4">
                        😕
                      </div>

                      <h3 className="text-xl font-bold">
                        No poster results
                      </h3>

                      <p className="text-gray-500 mt-2">
                        Try another title or
                        spelling.
                      </p>
                    </div>
                  )}

                {!searching &&
                  candidates.length >
                    0 && (
                    <>
                      <div className="mb-5 rounded-xl bg-yellow-400/5 border border-yellow-400/10 p-4">
                        <p className="text-sm text-yellow-200">
                          ⚠️ Choose the actual
                          movie poster. Search
                          results can contain
                          unrelated images.
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {candidates.map(
                          (
                            candidate,
                            index
                          ) => (
                            <div
                              key={`${candidate.imageUrl}-${index}`}
                              className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-yellow-400/50 transition"
                            >
                              <div className="aspect-[2/3] bg-black">
                                <img
                                  src={
                                    candidate.imageUrl
                                  }
                                  alt={
                                    candidate.title
                                  }
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              </div>

                              <div className="p-4">
                                <p className="text-xs text-gray-500 mb-2">
                                  {
                                    candidate.source
                                  }
                                </p>

                                <button
                                  onClick={() =>
                                    usePoster(
                                      candidate
                                    )
                                  }
                                  disabled={
                                    uploading
                                  }
                                  className="w-full rounded-xl bg-yellow-400 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
                                >
                                  {uploading
                                    ? "Saving..."
                                    : "Use This Poster"}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}