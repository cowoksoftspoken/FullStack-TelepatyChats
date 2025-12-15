import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebase-admin";
import { getRoleClaims } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { userId, disable, idToken } = await request.json();

    if (!userId || typeof disable !== "boolean" || !idToken) {
      return NextResponse.json(
        { error: "Missing or invalid data" },
        { status: 400 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (decodedToken.uid === userId) {
      return NextResponse.json(
        { error: "You can't disable your own account" },
        { status: 400 }
      );
    }

    const requesterRecord = await adminAuth.getUser(decodedToken.uid);
    const { isAdmin, isSuperAdmin } = getRoleClaims(
      requesterRecord.customClaims
    );

    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin only" },
        { status: 403 }
      );
    }

    let targetRecord;
    try {
      targetRecord = await adminAuth.getUser(userId);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }
      throw err;
    }

    const targetClaims = targetRecord.customClaims || {};
    const targetIsAdmin = targetClaims.admin === true;
    const targetIsSuperAdmin = targetClaims.superAdmin === true;

    if (!isSuperAdmin && (targetIsAdmin || targetIsSuperAdmin)) {
      return NextResponse.json(
        { error: "Forbidden: You can't disable admin or superAdmin" },
        { status: 403 }
      );
    }

    await adminAuth.updateUser(userId, { disabled: disable });

    await adminDB
      .collection("users")
      .doc(userId)
      .update({
        disabled: disable,
        disabledAt: disable ? new Date() : null,
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
