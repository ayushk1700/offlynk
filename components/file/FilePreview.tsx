"use client";
/**
 * FilePreview — renders a file attachment inside a message bubble.
 */
import { Paperclip, FileText, Image as ImageIcon, Download } from "lucide-react";

interface Props {
  name: string;
  size?: number;
  dataUrl?: string;
  mimeType?: string;
}

export function FilePreview({ name, size, dataUrl, mimeType }: Props) {
  const isImage = mimeType?.startsWith("image/");

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 bg-muted/30 max-w-[220px]">
      {isImage && dataUrl ? (
        <img
          src={dataUrl}
          alt={name}
          className="w-full max-h-48 object-cover"
        />
      ) : (
        <div className="flex items-center gap-2 p-3">
          {name.endsWith(".pdf") ? (
            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          ) : (
            <Paperclip className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{name}</p>
            {size && (
              <p className="text-[10px] text-muted-foreground">
                {(size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>
      )}

      {dataUrl && (
        <a
          href={dataUrl}
          download={name}
          className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground border-t border-border/40 px-3 py-1.5 hover:bg-muted/40 transition-colors"
        >
          <Download className="w-3 h-3" />
          Download
        </a>
      )}
    </div>
  );
}
