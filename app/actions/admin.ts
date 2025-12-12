"use server";

import { adminAuth, adminDB } from "@/lib/firebase-admin";

export async function toggleAdminStatus(
  targetUserId: string,
  newStatus: boolean,
  idToken: string
) {
  try {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);

      if (!decodedToken.admin !== true) {
        throw new Error("Unauthorized: Requestor isn't admin");
      }
    } catch (error) {
      throw new Error("Unauthorized: Failed to identify admin.");
    }

    await adminAuth.setCustomUserClaims(targetUserId, { admin: newStatus });

    await adminDB.collection("users").doc(targetUserId).update({
      isAdmin: newStatus,
    });

    return {
      success: true,
      message: `User ${targetUserId} admin status: ${newStatus}`,
    };
  } catch (error: any) {
    console.error("Set Admin Error:", error);
    return { success: false, error: error.message };
  }
}
