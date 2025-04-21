export default function MapPreview({
  lat,
  lng,
}: {
  lat: number | undefined;
  lng: number | undefined;
}) {
  if (lat === undefined || lng === undefined) {
    return (
      <div className="text-sm text-red-500">
        Invalid location: Latitude or Longitude is missing.
      </div>
    );
  }

  return (
    <div className="h-48 w-full rounded-md border overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
          lng - 0.01
        }%2C${lat - 0.01}%2C${lng + 0.01}%2C${
          lat + 0.01
        }&layer=mapnik&marker=${lat}%2C${lng}`}
        style={{ border: "1px solid #ccc" }}
      ></iframe>
    </div>
  );
}
