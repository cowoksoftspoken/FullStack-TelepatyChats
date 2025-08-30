"use client";
import { useEffect } from "react";

export function ServiceWorkerReg() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((fallback) =>
          console.info(
            `SW Registered ${
              (fallback.active,
              fallback.scope,
              fallback.cookies.getSubscriptions.name)
            }`
          )
        )
        .catch((err) => console.error(err));
    }
  }, []);
  return null;
}
