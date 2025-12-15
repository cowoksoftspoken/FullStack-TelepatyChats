"use server";

import { adminAuth, adminDB } from "@/lib/firebase-admin";
import { getRoleClaims } from "@/lib/utils";

export async function toggleAdminStatus(
  targetUserId: string,
  newStatus: boolean,
  idToken: string
) {
  try {
    if (!targetUserId || typeof newStatus !== "boolean" || !idToken) {
      throw new Error("Invalid request data");
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const requester = await adminAuth.getUser(decoded.uid);

    const { isAdmin: requesterIsAdmin, isSuperAdmin: requesterIsSuperAdmin } =
      getRoleClaims(requester.customClaims);

    if (!requesterIsAdmin && !requesterIsSuperAdmin) {
      throw new Error("Unauthorized: Admin only");
    }

    if (decoded.uid === targetUserId) {
      throw new Error("You can't change your own role");
    }

    const target = await adminAuth.getUser(targetUserId);
    const { isAdmin: targetIsAdmin, isSuperAdmin: targetIsSuperAdmin } =
      getRoleClaims(target.customClaims);

    if (!requesterIsSuperAdmin && (targetIsAdmin || targetIsSuperAdmin)) {
      throw new Error("Only superAdmin can modify admin roles");
    }

    if (!requesterIsSuperAdmin && targetIsSuperAdmin) {
      throw new Error("Cannot modify superAdmin");
    }

    await adminAuth.setCustomUserClaims(targetUserId, {
      admin: newStatus,
      superAdmin: targetIsSuperAdmin,
    });

    await adminDB.collection("users").doc(targetUserId).update({
      isAdmin: newStatus,
      roleChangedBy: decoded.uid,
      roleChangedAt: new Date(),
    });

    await adminAuth.revokeRefreshTokens(targetUserId);

    return {
      success: true,
      message: newStatus ? "User promoted to admin" : "Admin role revoked",
    };
  } catch (error: any) {
    console.error("[toggleAdminStatus]", error);
    return { success: false, error: error.message };
  }
}
