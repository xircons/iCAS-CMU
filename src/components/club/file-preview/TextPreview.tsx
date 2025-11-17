import React from "react";

interface TextPreviewProps {
  content: string;
  fileName?: string;
}

export function TextPreview({ content, fileName }: TextPreviewProps) {
  return (
    <div className="p-6 bg-muted rounded-lg h-full overflow-auto">
      <div 
        className="prose prose-sm md:prose-base max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

