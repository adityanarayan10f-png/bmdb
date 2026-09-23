"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type MovieImport = {
  title: string;
  slug: string;
  release_date?: string | null;
  language?: string | null;
  country?: string | null;
  runtime?: number | null;
  synopsis?: string | null;
  poster_url?: string | null;
};

export default function AdminMoviesPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select('"role"')
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (profile?.role === "admin") {
      setAllowed(true);
    }

    setLoading(false);
  }

  async function importMovies() {
    setMessage("");

    if (!jsonText.trim()) {
      setMessage("Paste your movie JSON first.");
      return;
    }

    let movies: MovieImport[];

    try {
      movies = JSON.parse(jsonText);
    } catch {
      setMessage("Invalid JSON. Check the format and try again.");
      return;
    }

    if (!Array.isArray(movies)) {
      setMessage("The JSON must contain an array of movies.");
      return;
    }

    if (movies.length === 0) {
      setMessage("No movies found in the JSON.");
      return;
    }

    for (const movie of movies) {
      if (!movie.title || !movie.slug) {
        setMessage(
          "Every movie needs at least title and slug."
        );
        return;
      }
    }

    setImporting(true);

    const uniqueMovies = Array.from(
      new Map(
        movies.map((movie) => [movie.slug, movie])
      ).values()
    );

    const { error } = await supabase
      .from("movies")
      .upsert(uniqueMovies, {
        onConflict: "slug",
      });

    setImporting(false);

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setMessage(
      `${uniqueMovies.length} movies added/updated successfully in BMDB!`
    );

    setJsonText("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] text-white">
        <p className="text-gray-400">
          Checking admin access...
        </p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0d1320] p-8 text-center">
          <div className="text-5xl">🔒</div>

          <h1 className="mt-5 text-2xl font-black">
            Admin Access Required
          </h1>

          <p className="mt-3 text-gray-400">
            You must be logged in with an administrator account
            to access this page.
          </p>

          <a
            href="/auth/login"
            className="mt-6 inline-block rounded-lg bg-yellow-400 px-6 py-3 font-bold text-black hover:bg-yellow-300"
          >
            Go to Login
          </a>

          <a
            href="/"
            className="mt-4 block text-sm text-gray-500 hover:text-white"
          >
            ← Back to BMDB
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">

        <a
          href="/"
          className="text-sm text-yellow-400 hover:text-yellow-300"
        >
          ← Back to BMDB
        </a>

        <div className="mt-8">
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-400">
            Admin
          </span>

          <h1 className="mt-4 text-4xl font-black">
            Movie Manager
          </h1>

          <p className="mt-2 text-gray-500">
            Add or update multiple Bhojpuri movies at once.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-800 bg-[#0d1320] p-6">

          <h2 className="text-xl font-bold">
            Bulk Import Movies
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Paste a JSON array containing your movies.
          </p>

          <div className="mt-5 rounded-lg border border-gray-800 bg-[#080d18] p-4 text-sm text-gray-400">

            <p className="font-semibold text-gray-300">
              Required:
            </p>

            <p className="mt-1">
              title, slug
            </p>

            <p className="mt-4 font-semibold text-gray-300">
              Optional:
            </p>

            <p className="mt-1">
              release_date, language, country, runtime,
              synopsis, poster_url
            </p>

          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={24}
            placeholder={`[
  {
    "title": "Example Bhojpuri Movie",
    "slug": "example-bhojpuri-movie",
    "release_date": "2026-01-01",
    "language": "Bhojpuri",
    "country": "India",
    "runtime": 140,
    "synopsis": "Movie synopsis...",
    "poster_url": "https://example.com/poster.jpg"
  }
]`}
            className="mt-5 w-full rounded-xl border border-gray-700 bg-[#080d18] px-4 py-4 font-mono text-sm text-gray-200 outline-none focus:border-yellow-400"
          />

          <button
            onClick={importMovies}
            disabled={importing}
            className="mt-5 w-full rounded-lg bg-yellow-400 px-5 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing
              ? "Importing..."
              : "Import Movies to BMDB"}
          </button>

          {message && (
            <div className="mt-5 rounded-lg border border-gray-800 bg-[#080d18] p-4 text-sm text-gray-300">
              {message}
            </div>
          )}

        </div>

        <div className="mt-8 rounded-2xl border border-gray-800 bg-[#0d1320] p-6">

          <h2 className="text-xl font-bold">
            Example Format
          </h2>

          <pre className="mt-4 overflow-x-auto rounded-lg bg-[#080d18] p-4 text-xs leading-6 text-gray-400">
{`[
  {
    "title": "Movie Name",
    "slug": "movie-name",
    "release_date": "2025-01-01",
    "language": "Bhojpuri",
    "country": "India",
    "runtime": 140,
    "synopsis": "Movie synopsis...",
    "poster_url": null
  },
  {
    "title": "Another Movie",
    "slug": "another-movie",
    "release_date": "2024-06-15",
    "language": "Bhojpuri",
    "country": "India",
    "runtime": 135,
    "synopsis": "Another movie synopsis...",
    "poster_url": null
  }
]`}
          </pre>

        </div>

      </div>
    </main>
  );
}