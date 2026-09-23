import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

type TMDBMovie = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  original_language?: string;
  vote_average?: number;
  popularity?: number;
};

type TMDBImage = {
  file_path: string;
  width: number;
  height: number;
  vote_average?: number;
  vote_count?: number;
  iso_639_1?: string | null;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(searchTitle: string, movie: TMDBMovie) {
  const target = normalize(searchTitle);

  const titles = [
    movie.title,
    movie.original_title || "",
  ].map(normalize);

  if (titles.includes(target)) return 100;

  if (
    titles.some(
      (title) =>
        title.includes(target) ||
        target.includes(title)
    )
  ) {
    return 85;
  }

  const targetWords = new Set(target.split(" "));
  let best = 0;

  for (const title of titles) {
    const words = title.split(" ");
    const matches = words.filter((word) =>
      targetWords.has(word)
    ).length;

    if (words.length > 0) {
      best = Math.max(best, (matches / words.length) * 70);
    }
  }

  return best;
}

async function tmdbFetch(
  endpoint: string,
  params: Record<string, string>
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

  Object.entries(params).forEach(
    ([key, value]) => {
      url.searchParams.set(key, value);
    }
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `TMDB request failed (${response.status}): ${text}`
    );
  }

  return response.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const query =
      searchParams.get("query")?.trim() || "";

    const year =
      searchParams.get("year")?.trim() || "";

    if (!query) {
      return NextResponse.json(
        {
          error: "Movie title is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Search TMDB using the exact title.
     *
     * We intentionally do several searches because
     * Bhojpuri titles are sometimes indexed differently.
     */

    const searches: TMDBMovie[][] = [];

    const exactSearch = await tmdbFetch(
      "/search/movie",
      {
        query,
        language: "en-US",
        include_adult: "false",
        page: "1",
      }
    );

    searches.push(exactSearch.results || []);

    if (year) {
      const yearSearch = await tmdbFetch(
        "/search/movie",
        {
          query,
          language: "en-US",
          include_adult: "false",
          primary_release_year: year,
          page: "1",
        }
      );

      searches.push(yearSearch.results || []);
    }

    /*
     * Combine and remove duplicate TMDB movies.
     */
    const movieMap = new Map<
      number,
      TMDBMovie
    >();

    for (const results of searches) {
      for (const movie of results) {
        if (!movieMap.has(movie.id)) {
          movieMap.set(movie.id, movie);
        }
      }
    }

    const candidates = Array.from(
      movieMap.values()
    )
      .map((movie) => {
        const similarity =
          titleSimilarity(query, movie);

        let yearScore = 0;

        if (
          year &&
          movie.release_date
        ) {
          const movieYear =
            movie.release_date.substring(0, 4);

          if (movieYear === year) {
            yearScore = 30;
          } else {
            const difference = Math.abs(
              Number(movieYear) -
                Number(year)
            );

            if (difference === 1) {
              yearScore = 15;
            }
          }
        }

        return {
          movie,
          score:
            similarity + yearScore,
        };
      })
      .sort(
        (a, b) => b.score - a.score
      )
      .slice(0, 5);

    /*
     * Only use reasonably matching movies.
     */
    const usableCandidates =
      candidates.filter(
        (candidate) =>
          candidate.score >= 45
      );

    const posterResults: Array<{
      imageUrl: string;
      tmdbMovieId: number;
      tmdbTitle: string;
      releaseDate: string | null;
      source: string;
      score: number;
    }> = [];

    /*
     * Get multiple posters from the best
     * matching TMDB movies.
     */
    for (const candidate of usableCandidates) {
      const movie =
        candidate.movie;

      try {
        const images =
          await tmdbFetch(
            `/movie/${movie.id}/images`,
            {
              include_image_language:
                "en,null",
            }
          );

        const posters: TMDBImage[] =
          images.posters || [];

        /*
         * Sort by TMDB's image rating.
         */
        posters.sort(
          (a, b) =>
            (b.vote_average || 0) -
            (a.vote_average || 0)
        );

        /*
         * Keep the first few posters.
         */
        for (const poster of posters.slice(
          0,
          5
        )) {
          posterResults.push({
            imageUrl:
              `${TMDB_IMAGE_BASE_URL}${poster.file_path}`,
            tmdbMovieId: movie.id,
            tmdbTitle: movie.title,
            releaseDate:
              movie.release_date || null,
            source: "TMDB",
            score: candidate.score,
          });
        }

        /*
         * If the image endpoint doesn't contain
         * posters but the search result itself has
         * a poster, use that.
         */
        if (
          posters.length === 0 &&
          movie.poster_path
        ) {
          posterResults.push({
            imageUrl:
              `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`,
            tmdbMovieId: movie.id,
            tmdbTitle: movie.title,
            releaseDate:
              movie.release_date || null,
            source: "TMDB",
            score: candidate.score,
          });
        }
      } catch {
        /*
         * Don't let one bad movie result stop
         * the remaining candidates.
         */
        if (movie.poster_path) {
          posterResults.push({
            imageUrl:
              `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`,
            tmdbMovieId: movie.id,
            tmdbTitle: movie.title,
            releaseDate:
              movie.release_date || null,
            source: "TMDB",
            score: candidate.score,
          });
        }
      }
    }

    /*
     * Remove duplicate poster URLs.
     */
    const uniquePosters =
      Array.from(
        new Map(
          posterResults.map(
            (poster) => [
              poster.imageUrl,
              poster,
            ]
          )
        ).values()
      );

    return NextResponse.json({
      success: true,
      query,
      year: year || null,
      candidates: uniquePosters.slice(
        0,
        15
      ),
    });
  } catch (error) {
    console.error(
      "Poster search error:",
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