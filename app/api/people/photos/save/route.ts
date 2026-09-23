import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const personId = body?.personId;
    const personSlug = body?.personSlug;
    const imageUrl = body?.imageUrl;

    if (!personId || !personSlug || !imageUrl) {
      return NextResponse.json(
        {
          error:
            "personId, personSlug and imageUrl are required.",
        },
        { status: 400 }
      );
    }

    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "BMDB/1.0 Bhojpuri Movie Database",
      },
      cache: "no-store",
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        {
          error:
            "The image source refused the download.",
        },
        { status: 502 }
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") ||
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "The selected URL is not an image.",
        },
        { status: 400 }
      );
    }

    const buffer =
      await imageResponse.arrayBuffer();

    let extension = "jpg";

    if (contentType.includes("png")) {
      extension = "png";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    }

    const filePath = `${personSlug}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("people-photo")
        .upload(filePath, buffer, {
          contentType,
          upsert: true,
        });

    if (uploadError) {
      console.error(
        "People photo upload error:",
        uploadError
      );

      return NextResponse.json(
        {
          error: uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data: publicData } =
      supabase.storage
        .from("people-photo")
        .getPublicUrl(filePath);

    const publicUrl =
      publicData.publicUrl;

    const { error: personError } =
      await supabase
        .from("people")
        .update({
          photo_url: publicUrl,
        })
        .eq("id", personId);

    if (personError) {
      console.error(
        "Person photo update error:",
        personError
      );

      return NextResponse.json(
        {
          error: personError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      publicUrl,
    });
  } catch (error) {
    console.error(
      "Save people photo error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save person photo.",
      },
      { status: 500 }
    );
  }
}