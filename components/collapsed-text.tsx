import { useState } from "react";
import { Roboto } from "next/font/google";

interface CollapsedTextProps {
  text: string;
  len?: number;
}

const roboto = Roboto({ weight: "400", subsets: ["latin"] });

export function CollapsedText({ text, len = 600 }: CollapsedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isTooLong = text.length > len;
  const displayText = isExpanded
    ? text
    : `${text.slice(0, len)}${isTooLong ? "..." : ""}`;

  return (
    <div className="w-full">
      <p
        className={`max-w-full text-sm md:text-base break-words whitespace-normal ${roboto.className}`}
        style={{ overflowWrap: "anywhere" }}
      >
        <span dangerouslySetInnerHTML={{ __html: displayText }} />
        {isTooLong && (
          <>
            {" "}
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-indigo-500 underline focus:outline-none"
            >
              {isExpanded ? "Read less" : "Read more"}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
