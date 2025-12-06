import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = await request.json();
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "No token provided" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data = await response.json();
    const score = data.score ?? 0;

    if (data.success && score > 0.5) {
      return NextResponse.json({ success: true, score }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, score, message: "Bot detected" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error verifying reCAPTCHA" },
      { status: 500 }
    );
  }
}
