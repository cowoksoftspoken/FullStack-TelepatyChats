// app/api/send-notification/route.ts
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(request: Request) {
  try {
    const { receiverId, title, body, icon } = await request.json();

    if (!receiverId || !title || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const userRef = admin.firestore().collection("users").doc(receiverId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens || [];

    if (tokens.length === 0) {
      return NextResponse.json({ message: "No tokens found for user" });
    }

    const message = {
      data: {
        title: title,
        body: body,
        icon: icon || "/android-chrome-192x192.png",
        url: "/dashboard",
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === "messaging/invalid-registration-token" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await userRef.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
        });
        console.log(
          `🧹 Cleaned up ${tokensToRemove.length} invalid tokens for user ${receiverId}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: response.successCount,
      cleanedCount: response.failureCount,
    });
  } catch (error) {
    console.error("Notification Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
