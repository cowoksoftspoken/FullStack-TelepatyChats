"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CopyCheck, Globe, Lock } from "lucide-react";
import React from "react";

export default function UnsupportedBrowserPage() {
  const [isCopied, setIsCopied] = React.useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md text-center shadow-lg border-muted">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl font-bold">
            Unsupported Browser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You're currently viewing this page using the app's built-in browser
            (like Instagram, TikTok, or Facebook). For security and the best
            experience, please open this link using your native browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => {
                window.location.reload();
              }}
            >
              Try Again
            </Button>

            <Button
              variant="outline"
              data-copy-state={isCopied ? "copied" : "idle"}
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              className="transition-all duration-200 data-[copy-state=copied]:border-green-500 data-[copy-state=copied]:text-green-500"
            >
              {isCopied ? (
                <>
                  <CopyCheck className="h-4 w-4 mr-2" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 text-xs text-muted-foreground flex justify-center items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Open in a secure browser like Chrome or Safari</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
