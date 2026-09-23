"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Review = {
  id: string;
  body: string | null;
  review_text: string | null;
  created_at: string;
  user_id: string;
};

export default function MoviePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [ratingMessage, setRatingMessage] = useState("");

  const [cast, setCast] = useState<any[]>([]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    async function loadMovie() {
      const { slug } = await params;

      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Movie error:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      setMovie(data);

      // -------------------------
      // RATINGS
      // -------------------------

      const { data: ratings, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating")
        .eq("movie_id", data.id);

      if (!ratingsError && ratings) {
        setRatingCount(ratings.length);

        if (ratings.length > 0) {
          const total = ratings.reduce(
            (sum, item) => sum + item.rating,
            0
          );

          setAverageRating(total / ratings.length);
        }
      }

      // -------------------------
      // USER RATING
      // -------------------------

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: myRating } = await supabase
          .from("ratings")
          .select("rating")
          .eq("movie_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (myRating) {
          setSelectedRating(myRating.rating);
        }
      }

      // -------------------------
      // CAST
      // -------------------------

      const { data: castData, error: castError } = await supabase
        .from("movie_cast")
        .select(`
          character_name,
          billing_order,
          people (
            id,
            name,
            slug,
            photo_url
          )
        `)
        .eq("movie_id", data.id)
        .order("billing_order", { ascending: true });

      if (castError) {
        console.error("Cast error:", castError);
      }

      if (castData) {
        setCast(castData);
      }

      // -------------------------
      // REVIEWS
      // -------------------------

      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .select("id, body, review_text, created_at, user_id")
        .eq("movie_id", data.id)
        .order("created_at", { ascending: false });

      if (reviewError) {
        console.error("Review loading error:", reviewError);
      }

      if (reviewData) {
        setReviews(reviewData);
      }

      setLoading(false);
    }

    loadMovie();
  }, [params]);

  // -------------------------
  // SUBMIT RATING
  // -------------------------

  async function handleRating() {
    if (!selectedRating || !movie) {
      setRatingMessage("Please select a rating first.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRatingMessage("Please log in to rate this movie.");
      return;
    }

    const { error } = await supabase
      .from("ratings")
      .upsert(
        {
          user_id: user.id,
          movie_id: movie.id,
          rating: selectedRating,
        },
        {
          onConflict: "user_id,movie_id",
        }
      );

    if (error) {
      console.error("Rating error:", error);
      setRatingMessage("Could not save your rating.");
      return;
    }

    setRatingMessage("Your rating has been saved!");

    const { data: ratings } = await supabase
      .from("ratings")
      .select("rating")
      .eq("movie_id", movie.id);

    if (ratings) {
      setRatingCount(ratings.length);

      if (ratings.length > 0) {
        const total = ratings.reduce(
          (sum, item) => sum + item.rating,
          0
        );

        setAverageRating(total / ratings.length);
      }
    }
  }

  // -------------------------
  // SUBMIT REVIEW
  // -------------------------

  async function handleReviewSubmit() {
    const text = reviewText.trim();

    if (!text) {
      setReviewMessage("Please write a review first.");
      return;
    }

    if (!movie) {
      return;
    }

    setReviewLoading(true);
    setReviewMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setReviewMessage("Please log in to post a review.");
      setReviewLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        movie_id: movie.id,
        body: text,
        review_text: text,
      })
      .select("id, body, review_text, created_at, user_id")
      .single();

    if (error) {
      console.error("Review error:", error);
      setReviewMessage(
        "Could not save your review: " + error.message
      );
      setReviewLoading(false);
      return;
    }

    if (data) {
      setReviews((current) => [data, ...current]);
    }

    setReviewText("");
    setReviewMessage("Your review has been posted!");
    setReviewLoading(false);
  }

  // -------------------------
  // DELETE REVIEW
  // -------------------------

  async function handleDeleteReview(id: string) {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete review error:", error);
      setReviewMessage("Could not delete the review.");
      return;
    }

    setReviews((current) =>
      current.filter((review) => review.id !== id)
    );
  }

  // -------------------------
  // LOADING
  // -------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        Loading movie...
      </main>
    );
  }

  // -------------------------
  // NOT FOUND
  // -------------------------

  if (!movie) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        Movie not found.
      </main>
    );
  }

  // -------------------------
  // PAGE
  // -------------------------

  return (
    <main className="min-h-screen bg-[#070b14] text-white">

      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* MOVIE HEADER */}

        <div className="grid gap-10 md:grid-cols-[280px_1fr]">

          <div>
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center rounded-2xl border border-gray-800 bg-[#0d1320] text-gray-500">
                No Poster
              </div>
            )}
          </div>

          <div>

            <p className="mb-2 text-sm text-yellow-400">
              {movie.language || "Bhojpuri"} •{" "}
              {movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : "Unknown"}
            </p>

            <h1 className="text-4xl font-bold md:text-5xl">
              {movie.title}
            </h1>

            {/* RATING DISPLAY */}

            <div className="mt-5 flex items-center gap-4">

              <div>
                <span className="text-3xl font-bold text-yellow-400">
                  {averageRating !== null
                    ? averageRating.toFixed(1)
                    : "—"}
                </span>

                <span className="ml-2 text-gray-400">
                  / 10
                </span>
              </div>

              <div className="text-sm text-gray-400">
                {ratingCount}{" "}
                {ratingCount === 1 ? "vote" : "votes"}
              </div>

            </div>

            {/* RATE MOVIE */}

            <div className="mt-6">

              <p className="mb-3 text-sm font-medium text-gray-300">
                Rate this movie
              </p>

              <div className="flex flex-wrap gap-2">

                {Array.from(
                  { length: 10 },
                  (_, index) => index + 1
                ).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() =>
                      setSelectedRating(rating)
                    }
                    className={
                      selectedRating === rating
                        ? "h-10 w-10 rounded-lg border border-yellow-400 bg-yellow-400 text-sm font-semibold text-black"
                        : "h-10 w-10 rounded-lg border border-gray-700 bg-[#0d1320] text-sm font-semibold text-gray-300 hover:border-yellow-400 hover:text-yellow-400"
                    }
                  >
                    {rating}
                  </button>
                ))}

              </div>

              <button
                type="button"
                onClick={handleRating}
                className="mt-4 rounded-lg bg-yellow-400 px-5 py-2.5 font-semibold text-black hover:bg-yellow-300"
              >
                Submit Rating
              </button>

              {ratingMessage && (
                <p className="mt-3 text-sm text-gray-400">
                  {ratingMessage}
                </p>
              )}

            </div>

            {/* SYNOPSIS */}

            <p className="mt-6 leading-7 text-gray-400">
              {movie.synopsis ||
                "No synopsis available yet."}
            </p>

            {/* DETAILS */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              <div>
                <p className="text-sm text-gray-500">
                  Release Date
                </p>
                <p>
                  {movie.release_date || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Country
                </p>
                <p>
                  {movie.country || "India"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Runtime
                </p>
                <p>
                  {movie.runtime_minutes
                    ? `${movie.runtime_minutes} minutes`
                    : movie.runtime
                    ? `${movie.runtime} minutes`
                    : "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Status
                </p>
                <p className="capitalize">
                  {movie.status || "Released"}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* CAST */}

        <section className="mt-12">

          <h2 className="text-2xl font-bold">
            Cast
          </h2>

          {cast.length === 0 ? (
            <p className="mt-4 text-gray-500">
              No cast information available yet.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">

              {cast.map((member, index) => (

                <a
                  key={index}
                  href={`/people/${member.people?.slug}`}
                  className="group rounded-xl border border-gray-800 bg-[#0d1320] p-4 hover:border-yellow-400/40"
                >

                  {member.people?.photo_url ? (
                    <img
                      src={member.people.photo_url}
                      alt={member.people.name}
                      className="mb-4 aspect-[3/4] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-4 flex aspect-[3/4] items-center justify-center rounded-lg bg-[#111827] text-5xl font-black text-yellow-400">
                      {member.people?.name?.charAt(0)}
                    </div>
                  )}

                  <p className="font-semibold group-hover:text-yellow-400">
                    {member.people?.name}
                  </p>

                  {member.character_name && (
                    <p className="mt-1 text-sm text-gray-500">
                      as {member.character_name}
                    </p>
                  )}

                </a>

              ))}

            </div>
          )}

        </section>

        {/* REVIEWS */}

        <section className="mt-16">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-2xl font-bold">
                Reviews
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Share your thoughts about this movie.
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {reviews.length}{" "}
              {reviews.length === 1
                ? "review"
                : "reviews"}
            </span>

          </div>

          {/* REVIEW FORM */}

          <div className="mt-6 rounded-2xl border border-gray-800 bg-[#0d1320] p-6">

            <textarea
              value={reviewText}
              onChange={(event) =>
                setReviewText(event.target.value)
              }
              placeholder="Write your review..."
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-700 bg-[#080d18] p-4 text-white outline-none placeholder:text-gray-600 focus:border-yellow-400"
            />

            <div className="mt-4 flex flex-wrap items-center gap-4">

              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={reviewLoading}
                className="rounded-lg bg-yellow-400 px-5 py-2.5 font-semibold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewLoading
                  ? "Posting..."
                  : "Post Review"}
              </button>

              {reviewMessage && (
                <p className="text-sm text-gray-400">
                  {reviewMessage}
                </p>
              )}

            </div>

          </div>

          {/* REVIEW LIST */}

          <div className="mt-6 space-y-4">

            {reviews.length === 0 ? (

              <div className="rounded-2xl border border-gray-800 bg-[#0d1320] p-6 text-gray-500">
                No reviews yet. Be the first to review
                this movie.
              </div>

            ) : (

              reviews.map((review) => (

                <article
                  key={review.id}
                  className="rounded-2xl border border-gray-800 bg-[#0d1320] p-6"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <p className="font-semibold">
                        BMDB User
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(
                          review.created_at
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

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteReview(review.id)
                      }
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      Delete
                    </button>

                  </div>

                  <p className="mt-4 whitespace-pre-wrap leading-7 text-gray-300">
                    {review.body ||
                      review.review_text ||
                      ""}
                  </p>

                </article>

              ))

            )}

          </div>

        </section>

      </div>

      {/* FOOTER */}

      <footer className="mt-20 border-t border-gray-800 bg-[#080d18]">

        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-gray-500">
          BMDB — Bhojpuri Cinema, All in One Place.
        </div>

      </footer>

    </main>
  );
}