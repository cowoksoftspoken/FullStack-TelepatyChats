import { NextResponse } from "next/server";
import { adminAuth, adminDB, adminStorage } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { userId, idToken } = await request.json();

    if (!userId || !idToken) {
      return NextResponse.json({ error: "Missing Data" }, { status: 500 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const requesterDoc = await adminDB
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!requesterDoc.exists || !requesterDoc.data()?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admins only" },
        { status: 403 }
      );
    }

    console.log(`Starting cleanup for user: ${userId}`);
    const storiesSnapshot = await adminDB
      .collection("stories")
      .where("userId", "==", userId)
      .get();
    const bucket = adminStorage.bucket();
    const storyDeletePromises: Promise<any>[] = [];

    storiesSnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.mediaUrl) {
        try {
          const urlObj = new URL(data.mediaUrl);
          const pathSegment = urlObj.pathname.split("/o/")[1];
          if (pathSegment) {
            const decodedPath = decodeURIComponent(pathSegment);
            storyDeletePromises.push(
              bucket
                .file(decodedPath)
                .delete()
                .catch((err) => {
                  if (err.code !== 404)
                    console.warn("Storage delete error:", err.message);
                })
            );
          }
        } catch (e) {
          console.error("Error parsing media URL:", e);
        }
      }

      storyDeletePromises.push(doc.ref.delete());
    });

    const messagesSnapshot = await adminDB
      .collection("messages")
      .where("senderId", "==", userId)
      .get();
    const messageDeletePromises: Promise<any>[] = [];

    messagesSnapshot.forEach((doc) => {
      messageDeletePromises.push(doc.ref.delete());
    });

    try {
      await adminAuth.deleteUser(userId);
      console.log(`Auth status updated for ${userId}`);
    } catch (authError: any) {
      if (authError.code === "auth/user-not-found") {
        console.warn(
          `User ${userId} not found in Auth (Ghost User). Continue updating the db.`
        );
      } else {
        throw authError;
      }
    }

    const userDocPromise = adminDB.collection("users").doc(userId).delete();

    await Promise.all([
      ...storyDeletePromises,
      ...messageDeletePromises,
      userDocPromise,
    ]);

    return NextResponse.json({
      success: true,
      message: "Deleted completely",
    });
  } catch (error: any) {
    console.error("Delete user error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
