import QRCode from "qrcode.react";

interface KeyBackupPayload {
  type: "telepaty-key-migration";
  version: number;
  privateKey: string;
  createdAt: number;
}

export default function BackupKeyQR({ privateKey }: { privateKey: string }) {
  if (!privateKey) {
    return <p className="text-red-500">No private key available</p>;
  }

  const qrValue = generateKeyBackupPayload(privateKey);

  return (
    <div
      className="flex flex-col items-center gap-4 p-6 rounded-2xl shadow-md
    bg-gradient-to-br 
    from-gray-100 via-gray-50 to-white    
    dark:from-transparent dark:via-muted-foreground/20 dark:to-black 
    transition-all duration-300"
    >
      <div className="relative">
        <QRCode
          value={qrValue}
          size={300}
          level="H"
          includeMargin={true}
          bgColor="#ffffff"
          fgColor="#16292d"
          className="rounded-sm shadow-sm p-1 dark:shadow-white/50"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-2 rounded-full shadow-md">
            <img
              src="/dark_icon/android-chrome-192x192.png"
              alt="Telepaty Logo"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-600 dark:text-white">
          Backup Your Encryption Key
        </h2>
        <p className="text-sm text-gray-400 max-w-xs">
          Scan this QR code on another device to migrate your private key
          securely.
        </p>
      </div>
    </div>
  );
}

function generateKeyBackupPayload(privateKey: string): string {
  if (!privateKey) {
    throw new Error("Private key is required to generate backup QR");
  }

  const payload: KeyBackupPayload = {
    type: "telepaty-key-migration",
    version: 1,
    privateKey,
    createdAt: Date.now(),
  };

  return JSON.stringify(payload);
}
