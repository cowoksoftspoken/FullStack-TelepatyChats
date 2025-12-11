import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { userId, disable, idToken } = await request.json();

    if (!userId || !idToken) {
      return NextResponse.json(
        { error: "Missing data: userId or idToken" },
        { status: 400 }
      );
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

    try {
      await adminAuth.updateUser(userId, {
        disabled: disable,
      });
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

    await adminDB.collection("users").doc(userId).update({
      disabled: disable,
    });

    return NextResponse.json({
      success: true,
      message: disable ? "User disabled" : "User enabled",
    });
  } catch (error: any) {
    console.error("Toggle Status Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
