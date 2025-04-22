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
        src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
        style={{ border: "1px solid #ccc" }}
      ></iframe>
    </div>
  );
}
