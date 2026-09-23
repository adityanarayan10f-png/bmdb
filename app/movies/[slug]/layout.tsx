import type { Metadata } from "next";
import { supabase } from "../../../lib/supabase";

const BASE_URL = "https://bmdb-drab.vercel.app";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: movie } = await supabase
    .from("movies")
    .select(
      "title, release_date, language, country, synopsis, poster_url"
    )
    .eq("slug", slug)
    .single();

  if (!movie) {
    return {
      title: "Movie Not Found | BMDB",
      description:
        "Movie information on BMDB — Bhojpuri Movie Database.",
    };
  }

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null;

  const title = year
    ? `${movie.title} (${year})`
    : movie.title;

  const description =
    movie.synopsis ||
    `${title} — cast, ratings, reviews, release information and more on BMDB, the Bhojpuri Movie Database.`;

  const canonicalUrl = `${BASE_URL}/movies/${slug}`;

  return {
    title: `${title} | BMDB`,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: `${title} | BMDB`,
      description,
      url: canonicalUrl,
      siteName: "BMDB",
      type: "website",
      images: movie.poster_url
        ? [
            {
              url: movie.poster_url,
              width: 500,
              height: 750,
              alt: `${movie.title} poster`,
            },
          ]
        : [],
    },

    twitter: {
      card: "summary_large_image",
      title: `${title} | BMDB`,
      description,
      images: movie.poster_url
        ? [movie.poster_url]
        : [],
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function MovieLayout({
  children,
}: Props) {
  return children;
}