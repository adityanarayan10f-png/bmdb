"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Movie = {
  id: string;
  title: string;
  slug: string;
  release_date: string | null;
  language: string | null;
  country: string | null;
  runtime: number | null;
  synopsis: string | null;
  poster_url: string | null;
};

type MovieUpdate = {
  slug: string;
  release_date: string | null;
  language: string | null;
  country: string | null;
  runtime: number | null;
  synopsis: string | null;
  poster_url: string | null;
  cast: {
    name: string;
    slug: string;
    character_name?: string | null;
    billing_order?: number;
  }[];
  crew: {
    name: string;
    slug: string;
    job: string;
  }[];
};

export default function MovieEnrichmentPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(`Auth error: ${userError.message}`);
      }

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(`Profile error: ${profileError.message}`);
      }

      if (profile?.role !== "admin") {
        throw new Error("Access denied. Admin account required.");
      }

      const { data, error } = await supabase
        .from("movies")
        .select(
          "id, title, slug, release_date, language, country, runtime, synopsis, poster_url"
        )
        .order("title", { ascending: true });

      if (error) {
        throw new Error(`Movies database error: ${error.message}`);
      }

      setMovies(data || []);
    } catch (error) {
      console.error("LOAD MOVIES ERROR:", error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Unknown error while loading movies.");
      }
    } finally {
      setLoading(false);
    }
  }

  function selectMovie(movie: Movie) {
    setSelectedMovie(movie);

    const data: MovieUpdate = {
      slug: movie.slug,
      release_date: movie.release_date,
      language: movie.language,
      country: movie.country,
      runtime: movie.runtime,
      synopsis: movie.synopsis,
      poster_url: movie.poster_url,
      cast: [],
      crew: [],
    };

    setJsonText(JSON.stringify(data, null, 2));
    setMessage(`Selected: ${movie.title}`);
  }

  async function findOrCreatePerson(
    name: string,
    slug: string
  ): Promise<string> {
    const { data: existingPerson, error: searchError } = await supabase
      .from("people")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (searchError) {
      throw new Error(
        `Could not search for ${name}: ${searchError.message}`
      );
    }

    if (existingPerson) {
      return existingPerson.id;
    }

    const { data: newPerson, error: insertError } = await supabase
      .from("people")
      .insert({
        name,
        slug,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(
        `Could not create person ${name}: ${insertError.message}`
      );
    }

    return newPerson.id;
  }

  async function saveMovie() {
    if (!selectedMovie) {
      setMessage("Please select a movie first.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const parsed: MovieUpdate = JSON.parse(jsonText);

      if (!parsed.slug) {
        throw new Error("Movie slug is required.");
      }

      const { data: movieData, error: movieError } = await supabase
        .from("movies")
        .update({
          release_date: parsed.release_date,
          language: parsed.language,
          country: parsed.country,
          runtime: parsed.runtime,
          synopsis: parsed.synopsis,
          poster_url: parsed.poster_url,
        })
        .eq("slug", parsed.slug)
        .select("id")
        .single();

      if (movieError) {
        throw new Error(
          `Movie update failed: ${movieError.message}`
        );
      }

      const movieId = movieData.id;

      /*
       * CAST
       */

      if (Array.isArray(parsed.cast)) {
        for (const member of parsed.cast) {
          const personId = await findOrCreatePerson(
            member.name,
            member.slug
          );

          const { error: castError } = await supabase
            .from("movie_cast")
            .upsert(
              {
                movie_id: movieId,
                person_id: personId,
                character_name: member.character_name ?? null,
                billing_order: member.billing_order ?? 0,
              },
              {
                onConflict: "movie_id,person_id",
              }
            );

          if (castError) {
            throw new Error(
              `Cast save failed for ${member.name}: ${castError.message}`
            );
          }
        }
      }

      /*
       * CREW
       */

      if (Array.isArray(parsed.crew)) {
        for (const member of parsed.crew) {
          const personId = await findOrCreatePerson(
            member.name,
            member.slug
          );

          const { error: crewError } = await supabase
            .from("movie_crew")
            .upsert(
              {
                movie_id: movieId,
                person_id: personId,
                job: member.job,
              },
              {
                onConflict: "movie_id,person_id,job",
              }
            );

          if (crewError) {
            throw new Error(
              `Crew save failed for ${member.name}: ${crewError.message}`
            );
          }
        }
      }

      setMessage(
        `✓ ${selectedMovie.title} updated successfully!`
      );

      await loadMovies();
    } catch (error) {
      console.error("SAVE MOVIE ERROR:", error);

      if (error instanceof SyntaxError) {
        setMessage("Invalid JSON. Please check the JSON format.");
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Unknown error while saving.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold">
          BMDB Movie Enrichment
        </h1>

        <p className="mt-6 text-gray-400">
          Loading movies...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-3xl md:text-4xl font-bold text-yellow-400">
          BMDB Movie Enrichment
        </h1>

        <p className="text-gray-400 mt-2">
          Select a movie and edit its metadata, cast and crew.
        </p>

        {message && (
          <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

          {/* MOVIE LIST */}

          <section className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">

              <h2 className="text-xl font-bold mb-4">
                Select a Movie
              </h2>

              <div className="space-y-3 max-h-[700px] overflow-y-auto">

                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    className={`rounded-lg p-4 border ${
                      selectedMovie?.id === movie.id
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-gray-800 bg-gray-950"
                    }`}
                  >

                    <h3 className="font-semibold">
                      {movie.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {movie.release_date || "No release date"}
                    </p>

                    <button
                      type="button"
                      onClick={() => selectMovie(movie)}
                      className="w-full mt-3 py-2 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition"
                    >
                      {selectedMovie?.id === movie.id
                        ? "✓ Selected"
                        : "Select Movie"}
                    </button>

                  </div>
                ))}

              </div>
            </div>
          </section>

          {/* EDITOR */}

          <section className="lg:col-span-2">

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">

              <h2 className="text-xl font-bold mb-4">
                Movie Data
              </h2>

              {!selectedMovie ? (
                <div className="rounded-lg bg-gray-950 border border-gray-800 p-10 text-center text-gray-500">
                  Select a movie from the left to begin.
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-yellow-400 font-semibold">
                      Editing: {selectedMovie.title}
                    </p>

                    <p className="text-gray-500 text-sm">
                      Slug: {selectedMovie.slug}
                    </p>
                  </div>

                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    className="w-full min-h-[650px] bg-black border border-gray-700 rounded-lg p-4 text-sm font-mono text-green-300 focus:outline-none focus:border-yellow-400"
                    spellCheck={false}
                  />

                  <button
                    type="button"
                    onClick={saveMovie}
                    disabled={saving}
                    className="w-full mt-4 py-3 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Movie Data"}
                  </button>
                </>
              )}

            </div>

          </section>

        </div>

      </div>
    </main>
  );
}