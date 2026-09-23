import { MetadataRoute } from "next";
import { supabase } from "../lib/supabase";

const BASE_URL = "https://bmdb-drab.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const { data: movies } = await supabase
    .from("movies")
    .select("slug, updated_at");

  if (movies) {
    for (const movie of movies) {
      urls.push({
        url: `${BASE_URL}/movies/${movie.slug}`,
        lastModified: movie.updated_at
          ? new Date(movie.updated_at)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  const { data: people } = await supabase
    .from("people")
    .select("slug, updated_at");

  if (people) {
    for (const person of people) {
      urls.push({
        url: `${BASE_URL}/people/${person.slug}`,
        lastModified: person.updated_at
          ? new Date(person.updated_at)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return urls;
}