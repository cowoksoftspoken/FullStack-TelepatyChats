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
      if (!decodedToken.superAdmin && !decodedToken.admin) {
        throw new Error("Unauthorized: Requestor isn't admin");
      }

      if (newStatus == false && !decodedToken.superAdmin) {
        throw new Error(
          "Unauthorized: Only superAdmin can revoke another admin's role."
        );
      }
    } catch (error) {
      console.log(error);
      throw new Error("Unauthorized: Failed to identify admin.");
    }

    const user = adminAuth.getUser(targetUserId);
    const userClaims = await user;

    await adminAuth.setCustomUserClaims(targetUserId, {
      admin: newStatus,
      superAdmin: userClaims.customClaims?.superAdmin == true,
    });

    await adminDB.collection("users").doc(targetUserId).update({
      isAdmin: newStatus,
      roleChangeAt: new Date(),
    });

    return {
      success: true,
      message: `User ${targetUserId} admin status: ${newStatus}`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
