import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownCollapsedTextProps {
  text: string;
  len?: number;
}

export function MarkdownCollapsedText({
  text,
  len = 500,
}: MarkdownCollapsedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const tooLong = text.length > len;
  const preview = text.slice(0, len) + (tooLong ? "..." : "");
  const displayText = isExpanded ? text : preview;

  return (
    <div className="w-full">
      <div className="prose dark:prose-invert prose-base w-full max-w-full break-all whitespace-pre-wrap font-roboto prose-pre:whitespace-pre-wrap prose-pre:break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 underline break-words"
              />
            ),
            p: ({ node, ...props }) => <p className="my-1" {...props} />,
            code: ({ node, ...props }) => (
              <code
                className="bg-muted px-1 py-0.5 rounded text-xs break-words"
                {...props}
              />
            ),
            pre: ({ node, ...props }) => (
              <pre
                className="bg-muted p-2 rounded-md text-xs overflow-x-auto break-words whitespace-pre-wrap"
                {...props}
              />
            ),
          }}
        >
          {displayText}
        </ReactMarkdown>

        {tooLong && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="text-indigo-500 underline text-xs mt-1"
          >
            {isExpanded ? "Read less..." : "Read more..."}
          </button>
        )}
      </div>
    </div>
  );
}
