"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Person = {
  id: string;
  name: string;
  slug: string;
  gender: string | null;
  bio: string | null;
  photo_url?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
};

type Film = {
  id: string;
  title: string;
  slug: string;
  release_date: string | null;
  poster_url: string | null;
  character_name: string | null;
};

export default function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [person, setPerson] =
    useState<Person | null>(null);

  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerson();
  }, []);

  async function loadPerson() {
    const { slug } = await params;

    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setPerson(data);

    const {
      data: castData,
      error: castError,
    } = await supabase
      .from("movie_cast")
      .select(`
        character_name,
        billing_order,
        movies (
          id,
          title,
          slug,
          release_date,
          poster_url
        )
      `)
      .eq("person_id", data.id)
      .order("billing_order", {
        ascending: true,
      });

    if (castError) {
      console.error(castError);
    }

    if (castData) {
      const formattedFilms = castData
        .map((item: any) => ({
          id: item.movies?.id,
          title: item.movies?.title,
          slug: item.movies?.slug,
          release_date:
            item.movies?.release_date,
          poster_url:
            item.movies?.poster_url,
          character_name:
            item.character_name,
        }))
        .filter(
          (film: Film) => film.id
        );

      setFilms(formattedFilms);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-gray-400">
            Loading person...
          </p>
        </div>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h1 className="text-3xl font-black">
            Person not found
          </h1>

          <a
            href="/"
            className="mt-5 inline-block text-yellow-400"
          >
            ← Back to BMDB
          </a>
        </div>
      </main>
    );
  }

  const profession =
    person.gender === "female"
      ? "Actress"
      : person.gender === "male"
      ? "Actor"
      : "Cinema Professional";

  return (
    <main className="min-h-screen bg-[#070b14] text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#080d18]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <a
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            BM<span className="text-yellow-400">
              DB
            </span>
          </a>

          <a
            href="/"
            className="text-sm text-gray-400 hover:text-white"
          >
            Home
          </a>

        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">

        <a
          href="/"
          className="text-sm text-yellow-400 hover:text-yellow-300"
        >
          ← Back to BMDB
        </a>

        {/* Profile */}
        <section className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">

          {/* Photo */}
          <div>
            {person.photo_url ? (
              <img
                src={person.photo_url}
                alt={person.name}
                className="aspect-[3/4] w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-gray-800 bg-[#0d1320]">
                <span className="text-7xl font-black text-yellow-400">
                  {person.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Information */}
          <div>

            <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
              {profession}
            </p>

            <h1 className="mt-2 text-4xl font-black md:text-5xl">
              {person.name}
            </h1>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              {person.birth_date && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Born
                  </p>

                  <p className="mt-1 text-gray-200">
                    {new Date(
                      person.birth_date
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>
              )}

              {person.birth_place && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Birthplace
                  </p>

                  <p className="mt-1 text-gray-200">
                    {person.birth_place}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Movies in BMDB
                </p>

                <p className="mt-1 text-gray-200">
                  {films.length}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Biography */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            About {person.name}
          </h2>

          <div className="mt-4 max-w-4xl rounded-2xl border border-gray-800 bg-[#0d1320] p-6">
            {person.bio ? (
              <p className="whitespace-pre-line leading-8 text-gray-300">
                {person.bio}
              </p>
            ) : (
              <p className="leading-8 text-gray-500">
                Biography coming soon. BMDB is
                continuously expanding its
                database.
              </p>
            )}
          </div>
        </section>

        {/* Filmography */}
        <section className="mt-12">

          <h2 className="text-2xl font-bold">
            Filmography
          </h2>

          {films.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-gray-800 bg-[#0d1320] p-6 text-gray-500">
              No movies added yet.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">

              {films.map((film) => (
                <a
                  key={film.id}
                  href={`/movies/${film.slug}`}
                  className="group"
                >

                  <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0d1320]">

                    {film.poster_url ? (
                      <img
                        src={film.poster_url}
                        alt={film.title}
                        className="aspect-[2/3] w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex aspect-[2/3] items-center justify-center bg-[#111827] text-center text-sm text-gray-500">
                        No Poster
                      </div>
                    )}

                  </div>

                  <h3 className="mt-3 font-bold group-hover:text-yellow-400">
                    {film.title}
                  </h3>

                  {film.release_date && (
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(
                        film.release_date
                      ).getFullYear()}
                    </p>
                  )}

                  {film.character_name && (
                    <p className="mt-1 text-xs text-gray-500">
                      as{" "}
                      {film.character_name}
                    </p>
                  )}

                </a>
              ))}

            </div>
          )}

        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-800 bg-[#080d18]">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-gray-500">
          BMDB — Bhojpuri Cinema, All in One Place.
        </div>
      </footer>

    </main>
  );
}