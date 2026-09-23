"use client";

import { useState } from "react";
import { supabase } from "../../../../lib/supabase";

type CastMember = {
  name: string;
  slug: string;
  character_name?: string | null;
  billing_order?: number;
};

type CrewMember = {
  name: string;
  slug: string;
  job: string;
};

type MovieData = {
  slug: string;
  release_date?: string | null;
  language?: string | null;
  country?: string | null;
  runtime?: number | null;
  synopsis?: string | null;
  poster_url?: string | null;
  cast?: CastMember[];
  crew?: CrewMember[];
};

export default function BulkMovieEnrichment() {
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function findOrCreatePerson(
    name: string,
    slug: string
  ): Promise<string> {
    const { data: existing, error: searchError } =
      await supabase
        .from("people")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    if (searchError) {
      throw new Error(
        `Person search failed for ${name}: ${searchError.message}`
      );
    }

    if (existing) {
      return existing.id;
    }

    const { data: created, error: createError } =
      await supabase
        .from("people")
        .insert({
          name,
          slug,
        })
        .select("id")
        .single();

    if (createError) {
      throw new Error(
        `Could not create ${name}: ${createError.message}`
      );
    }

    return created.id;
  }

  async function importMovies() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (profile?.role !== "admin") {
        throw new Error("Admin access required.");
      }

      const parsed: MovieData[] = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error(
          "JSON must contain an array of movies."
        );
      }

      let movieCount = 0;
      let castCount = 0;
      let crewCount = 0;

      for (const movie of parsed) {
        if (!movie.slug) {
          throw new Error(
            "Every movie must have a slug."
          );
        }

        /*
         * IMPORTANT:
         * Only update fields that actually exist in the JSON.
         * This prevents missing fields from being changed to NULL.
         */
        const movieUpdate: Record<string, unknown> = {};

        if (movie.release_date !== undefined) {
          movieUpdate.release_date = movie.release_date;
        }

        if (movie.language !== undefined) {
          movieUpdate.language = movie.language;
        }

        if (movie.country !== undefined) {
          movieUpdate.country = movie.country;
        }

        if (movie.runtime !== undefined) {
          movieUpdate.runtime = movie.runtime;
        }

        if (movie.synopsis !== undefined) {
          movieUpdate.synopsis = movie.synopsis;
        }

        if (movie.poster_url !== undefined) {
          movieUpdate.poster_url = movie.poster_url;
        }

        /*
         * Update the movie.
         */
        const { data: movieRow, error: movieError } =
          await supabase
            .from("movies")
            .update(movieUpdate)
            .eq("slug", movie.slug)
            .select("id")
            .single();

        if (movieError) {
          throw new Error(
            `Movie ${movie.slug} failed: ${movieError.message}`
          );
        }

        movieCount++;

        /*
         * Save cast.
         */
        if (movie.cast) {
          for (const member of movie.cast) {
            const personId =
              await findOrCreatePerson(
                member.name,
                member.slug
              );

            const { error } = await supabase
              .from("movie_cast")
              .upsert(
                {
                  movie_id: movieRow.id,
                  person_id: personId,
                  character_name:
                    member.character_name ?? null,
                  billing_order:
                    member.billing_order ?? 0,
                },
                {
                  onConflict:
                    "movie_id,person_id",
                }
              );

            if (error) {
              throw new Error(
                `Cast failed for ${member.name} in ${movie.slug}: ${error.message}`
              );
            }

            castCount++;
          }
        }

        /*
         * Save crew.
         */
        if (movie.crew) {
          for (const member of movie.crew) {
            const personId =
              await findOrCreatePerson(
                member.name,
                member.slug
              );

            const { error } = await supabase
              .from("movie_crew")
              .upsert(
                {
                  movie_id: movieRow.id,
                  person_id: personId,
                  job: member.job,
                },
                {
                  onConflict:
                    "movie_id,person_id,job",
                }
              );

            if (error) {
              throw new Error(
                `Crew failed for ${member.name} in ${movie.slug}: ${error.message}`
              );
            }

            crewCount++;
          }
        }
      }

      setMessage(
        `✓ ${movieCount} movies updated • ${castCount} cast credits • ${crewCount} crew credits`
      );
    } catch (error) {
      console.error(error);

      if (error instanceof SyntaxError) {
        setMessage(
          "Invalid JSON. Please check your JSON format."
        );
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-yellow-400">
          BMDB Bulk Movie Enrichment
        </h1>

        <p className="text-gray-400 mt-2">
          Update multiple movies with metadata, cast and crew.
        </p>

        {message && (
          <div className="mt-6 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
            {message}
          </div>
        )}

        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <textarea
            value={jsonText}
            onChange={(e) =>
              setJsonText(e.target.value)
            }
            placeholder={`[
  {
    "slug": "sasura-bada-paisawala",
    "release_date": "2003-01-01",
    "language": "Bhojpuri",
    "country": "India",
    "runtime": 164,
    "synopsis": "Movie synopsis",
    "cast": [
      {
        "name": "Manoj Tiwari",
        "slug": "manoj-tiwari",
        "character_name": null,
        "billing_order": 1
      }
    ],
    "crew": [
      {
        "name": "Ajay Sinha",
        "slug": "ajay-sinha",
        "job": "Director"
      }
    ]
  }
]`}
            className="w-full min-h-[650px] bg-black border border-gray-700 rounded-lg p-5 text-sm font-mono text-green-300 focus:outline-none focus:border-yellow-400"
            spellCheck={false}
          />

          <button
            type="button"
            onClick={importMovies}
            disabled={loading}
            className="w-full mt-5 py-3 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading
              ? "Importing..."
              : "Import Movie Data"}
          </button>
        </div>
      </div>
    </main>
  );
}