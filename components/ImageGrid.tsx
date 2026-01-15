import React from 'react';
import { SearchResult } from '../types';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

interface ImageGridProps {
  results: SearchResult[];
}

export const ImageGrid: React.FC<ImageGridProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
        <p>No results found for this keyword.</p>
      </div>
    );
  }

  // Можно менять под себя
  const CARD_HEIGHT_PX = 220;      // высота карточки
  const MIN_CARD_WIDTH_PX = 260;   // минимальная ширина карточки (регулирует кол-во колонок)

  return (
    <div
      className="grid gap-4 p-6 pb-20 overflow-y-auto h-full"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_CARD_WIDTH_PX}px, 1fr))`,
      }}
    >
      {results.map((result, idx) => {
        const displayIndex = idx + 1;

        return (
          <a
            key={`${result.link}-${idx}`}
            href={result.image?.contextLink || result.link}
            target="_blank"
            rel="noreferrer"
            className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 block"
            title={result.title}
            style={{
              // на всякий: даже если какие-то классы не сработают — размер карточки будет
              height: `${CARD_HEIGHT_PX}px`,
            }}
          >
            {/* Image */}
            <div
              className="relative bg-zinc-950 overflow-hidden w-full h-full"
              style={{
                height: `${CARD_HEIGHT_PX}px`,
              }}
            >
              <img
                src={result.link}
                alt={result.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 block"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (result.image?.thumbnailLink && img.src !== result.image.thumbnailLink) {
                    img.src = result.image.thumbnailLink;
                    return;
                  }
                  img.src = 'https://picsum.photos/800/600?blur=2';
                }}
              />

              {/* Number Badge */}
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border border-white/10 z-10">
                {displayIndex}
              </div>

              {/* Domain Badge (on hover) */}
              {result.displayLink ? (
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-zinc-200 text-[11px] px-2 py-1 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[160px]">{result.displayLink}</span>
                </div>
              ) : null}

              {/* Resolution Badge (on hover) */}
              {result.image?.width && result.image?.height ? (
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-zinc-300 text-[10px] px-2 py-1 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  {result.image.width} × {result.image.height}
                </div>
              ) : null}
            </div>
          </a>
        );
      })}
    </div>
  );
};
