import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

type TMDBPerson = {
  id: number;
  name: string;
  known_for_department?: string;
  profile_path?: string | null;
  popularity?: number;
};

type TMDBProfile = {
  file_path: string;
  width: number;
  height: number;
  vote_average?: number;
  vote_count?: number;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(
  searchName: string,
  person: TMDBPerson
) {
  const target = normalize(searchName);
  const personName = normalize(person.name);

  if (target === personName) {
    return 100;
  }

  if (
    personName.includes(target) ||
    target.includes(personName)
  ) {
    return 85;
  }

  const targetWords = new Set(
    target.split(" ")
  );

  const personWords = personName.split(" ");

  const matches = personWords.filter((word) =>
    targetWords.has(word)
  ).length;

  if (personWords.length === 0) {
    return 0;
  }

  return (
    (matches / personWords.length) * 70
  );
}

async function tmdbFetch(
  endpoint: string,
  params: Record<string, string> = {}
) {
  const token =
    process.env.TMDB_API_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "TMDB_API_READ_ACCESS_TOKEN is missing from .env.local"
    );
  }

  const url = new URL(
    `${TMDB_BASE_URL}${endpoint}`
  );

  for (const [key, value] of Object.entries(
    params
  )) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `TMDB request failed (${response.status}): ${responseText}`
    );
  }

  if (!responseText) {
    throw new Error(
      "TMDB returned an empty response."
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      "TMDB returned an invalid JSON response."
    );
  }
}

export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url);

    const query =
      url.searchParams
        .get("query")
        ?.trim() || "";

    if (!query) {
      return NextResponse.json(
        {
          error:
            "Person name is required.",
        },
        { status: 400 }
      );
    }

    const searchData =
      await tmdbFetch(
        "/search/person",
        {
          query,
          include_adult: "false",
          language: "en-US",
          page: "1",
        }
      );

    const people: TMDBPerson[] =
      searchData?.results || [];

    const candidates = people
      .map((person) => ({
        person,
        score: nameSimilarity(
          query,
          person
        ),
      }))
      .sort(
        (a, b) => b.score - a.score
      )
      .slice(0, 8);

    const results: Array<{
      imageUrl: string;
      tmdbPersonId: number;
      tmdbName: string;
      department: string | null;
      score: number;
    }> = [];

    for (const candidate of candidates) {
      if (candidate.score < 40) {
        continue;
      }

      const person =
        candidate.person;

      try {
        const imageData =
          await tmdbFetch(
            `/person/${person.id}/images`
          );

        const profiles: TMDBProfile[] =
          imageData?.profiles || [];

        profiles.sort(
          (a, b) =>
            (b.vote_average || 0) -
            (a.vote_average || 0)
        );

        for (const profile of profiles.slice(
          0,
          6
        )) {
          results.push({
            imageUrl:
              `${TMDB_IMAGE_BASE_URL}${profile.file_path}`,
            tmdbPersonId:
              person.id,
            tmdbName:
              person.name,
            department:
              person.known_for_department ||
              null,
            score:
              candidate.score,
          });
        }

        if (
          profiles.length === 0 &&
          person.profile_path
        ) {
          results.push({
            imageUrl:
              `${TMDB_IMAGE_BASE_URL}${person.profile_path}`,
            tmdbPersonId:
              person.id,
            tmdbName:
              person.name,
            department:
              person.known_for_department ||
              null,
            score:
              candidate.score,
          });
        }
      } catch {
        if (person.profile_path) {
          results.push({
            imageUrl:
              `${TMDB_IMAGE_BASE_URL}${person.profile_path}`,
            tmdbPersonId:
              person.id,
            tmdbName:
              person.name,
            department:
              person.known_for_department ||
              null,
            score:
              candidate.score,
          });
        }
      }
    }

    const uniqueResults =
      Array.from(
        new Map(
          results.map((item) => [
            item.imageUrl,
            item,
          ])
        ).values()
      );

    return NextResponse.json({
      success: true,
      query,
      candidates:
        uniqueResults.slice(0, 30),
    });
  } catch (error) {
    console.error(
      "People photo search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search TMDB.",
      },
      { status: 500 }
    );
  }
}