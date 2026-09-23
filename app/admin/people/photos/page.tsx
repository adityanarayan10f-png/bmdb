"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Person = {
  id: string;
  name: string;
  slug: string;
  gender: string | null;
  photo_url: string | null;
  birth_date: string | null;
  birth_place: string | null;
};

type PhotoCandidate = {
  imageUrl: string;
  tmdbPersonId: number;
  tmdbName: string;
  department: string | null;
  score: number;
};

export default function PeoplePhotosPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] =
    useState<Person | null>(null);

  const [candidates, setCandidates] =
    useState<PhotoCandidate[]>([]);

  const [searching, setSearching] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    setLoadingPeople(true);
    setError("");

    const { data, error } = await supabase
      .from("people")
      .select(
        "id, name, slug, gender, photo_url, birth_date, birth_place"
      )
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setLoadingPeople(false);
      return;
    }

    setPeople(data || []);
    setLoadingPeople(false);
  }

  const filteredPeople = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return people;
    }

    return people.filter((person) =>
      person.name.toLowerCase().includes(value)
    );
  }, [people, search]);

  const peopleWithPhotos = people.filter(
    (person) => !!person.photo_url
  ).length;

  const peopleWithoutPhotos =
    people.length - peopleWithPhotos;

  function selectPerson(person: Person) {
    setSelectedPerson(person);
    setCandidates([]);
    setMessage("");
    setError("");
  }

  async function findPhotos() {
    if (!selectedPerson) {
      setError("Please select a person first.");
      return;
    }

    setSearching(true);
    setCandidates([]);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/people/photos/search?query=${encodeURIComponent(
          selectedPerson.name
        )}`,
        {
          cache: "no-store",
        }
      );

      const responseText = await response.text();

      let data: {
        success?: boolean;
        candidates?: PhotoCandidate[];
        error?: string;
      } = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          `People photo API returned an invalid response (${response.status}). ${responseText.slice(
            0,
            300
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `People photo search failed (${response.status}).`
        );
      }

      setCandidates(data.candidates || []);

      if (!data.candidates?.length) {
        setMessage(
          "No TMDB photos were found for this person."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search photos."
      );
    } finally {
      setSearching(false);
    }
  }

  async function savePhoto(candidate: PhotoCandidate) {
    if (!selectedPerson) {
      return;
    }

    setSavingUrl(candidate.imageUrl);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/people/photos/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personId: selectedPerson.id,
            personSlug: selectedPerson.slug,
            imageUrl: candidate.imageUrl,
          }),
        }
      );

      const responseText = await response.text();

      let data: {
        success?: boolean;
        publicUrl?: string;
        error?: string;
      } = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          `People photo save API returned an invalid response (${response.status}). ${responseText.slice(
            0,
            300
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to save photo (${response.status}).`
        );
      }

      if (!data.publicUrl) {
        throw new Error(
          "Photo was uploaded but no public URL was returned."
        );
      }

      setPeople((current) =>
        current.map((person) =>
          person.id === selectedPerson.id
            ? {
                ...person,
                photo_url: data.publicUrl!,
              }
            : person
        )
      );

      setSelectedPerson((current) =>
        current
          ? {
              ...current,
              photo_url: data.publicUrl!,
            }
          : current
      );

      setCandidates([]);

      setMessage(
        `Photo saved successfully for ${selectedPerson.name}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save photo."
      );
    } finally {
      setSavingUrl(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <a
              href="/admin/people"
              className="text-sm text-yellow-400 hover:text-yellow-300"
            >
              ← Back to People Admin
            </a>

            <h1 className="mt-3 text-3xl font-bold">
              People Photo Manager
            </h1>

            <p className="mt-2 text-gray-400">
              Find and save actor, director, writer and
              crew photos automatically.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="text-sm text-gray-400">
              People
            </div>

            <div className="mt-1 text-xl font-bold">
              {people.length}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {peopleWithPhotos} with photos ·{" "}
              {peopleWithoutPhotos} missing
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0d111a] p-5">
            <h2 className="text-lg font-semibold">
              Select Person
            </h2>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search people..."
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-gray-600 focus:border-yellow-400"
            />

            <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {loadingPeople ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  Loading people...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  No people found.
                </div>
              ) : (
                filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() =>
                      selectPerson(person)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selectedPerson?.id === person.id
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
                      {person.photo_url ? (
                        <img
                          src={person.photo_url}
                          alt={person.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-500">
                          {person.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {person.name}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {person.photo_url
                          ? "Photo available"
                          : "No photo"}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d111a] p-6">
            {!selectedPerson ? (
              <div className="flex min-h-[500px] items-center justify-center text-center">
                <div>
                  <div className="text-5xl">👤</div>

                  <h2 className="mt-4 text-xl font-semibold">
                    Select a person
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Choose someone from the list to find
                    their TMDB photos.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {selectedPerson.photo_url ? (
                        <img
                          src={selectedPerson.photo_url}
                          alt={selectedPerson.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-500">
                          {selectedPerson.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedPerson.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {selectedPerson.birth_place ||
                          "Bhojpuri cinema database"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={findPhotos}
                    disabled={searching}
                    className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {searching
                      ? "Searching TMDB..."
                      : "Find Photos"}
                  </button>
                </div>

                {searching && (
                  <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
                    <div className="text-3xl">
                      🔎
                    </div>

                    <p className="mt-3 text-sm text-gray-400">
                      Searching TMDB for{" "}
                      {selectedPerson.name}...
                    </p>
                  </div>
                )}

                {!searching &&
                  candidates.length > 0 && (
                    <>
                      <div className="mt-8 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Photo Candidates
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            Select the correct photo for{" "}
                            {selectedPerson.name}.
                          </p>
                        </div>

                        <div className="text-xs text-gray-500">
                          {candidates.length} results
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {candidates.map(
                          (candidate, index) => (
                            <div
                              key={`${candidate.imageUrl}-${index}`}
                              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                            >
                              <div className="aspect-[3/4] bg-white/5">
                                <img
                                  src={
                                    candidate.imageUrl
                                  }
                                  alt={
                                    candidate.tmdbName
                                  }
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="p-3">
                                <div className="truncate text-sm font-medium">
                                  {
                                    candidate.tmdbName
                                  }
                                </div>

                                {candidate.department && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {
                                      candidate.department
                                    }
                                  </div>
                                )}

                                <button
                                  onClick={() =>
                                    savePhoto(
                                      candidate
                                    )
                                  }
                                  disabled={
                                    savingUrl ===
                                    candidate.imageUrl
                                  }
                                  className="mt-3 w-full rounded-lg bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingUrl ===
                                  candidate.imageUrl
                                    ? "Saving..."
                                    : "Use This Photo"}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}

                {!searching &&
                  candidates.length === 0 &&
                  !message && (
                    <div className="mt-10 rounded-2xl border border-dashed border-white/10 py-20 text-center">
                      <div className="text-4xl">
                        📸
                      </div>

                      <p className="mt-4 text-sm text-gray-400">
                        Click “Find Photos” to search
                        TMDB.
                      </p>
                    </div>
                  )}
              </>
            )}
          </section>
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">
          This product uses the TMDB API but is not
          endorsed or certified by TMDB.
        </div>
      </div>
    </main>
  );
}