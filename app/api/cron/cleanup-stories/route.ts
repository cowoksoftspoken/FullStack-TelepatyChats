import { NextRequest, NextResponse } from "next/server";
import { adminDB, adminStorage } from "@/lib/firebase-admin";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const bucket = adminStorage.bucket();
    const snapshot = await adminDB
      .collection("stories")
      .where("expiresAt", "<", now)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "No expired stories found" });
    }

    const deletePromises: Promise<any>[] = [];
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.mediaUrl) {
        try {
          const urlObj = new URL(data.mediaUrl);
          const pathName = urlObj.pathname.split("/o/")[1];

          if (pathName) {
            const decodedPath = decodeURIComponent(pathName);
            deletePromises.push(
              bucket
                .file(decodedPath)
                .delete()
                .catch((err) =>
                  console.warn(
                    `failed to delete file ${decodedPath}:`,
                    err.message
                  )
                )
            );
          }
        } catch (error) {
          console.error("Error parsing media url", error);
        }
      }

      deletePromises.push(doc.ref.delete());
      deletedCount++;
    }

    await Promise.all(deletePromises);
    return NextResponse.json({
      succes: true,
      message: `Deleted ${deletedCount} stories and associated media`,
    });
  } catch (error: any) {
    console.error("Cron Job error", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
