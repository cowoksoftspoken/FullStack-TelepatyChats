export const YoutubeEmbed = ({ videoId }: { videoId: string }) => (
  <div className="mt-2">
    <iframe
      width="100%"
      height="250"
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video"
      allowFullScreen
      className="rounded-md"
    ></iframe>
  </div>
);
