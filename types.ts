export interface SearchResult {
  id?: number;
  link: string;
  title: string;
  image: {
    contextLink: string;
    height: number;
    width: number;
    byteSize: number;
    thumbnailLink: string;
    thumbnailHeight: number;
    thumbnailWidth: number;
  };
  displayLink: string; // The domain
  mime: string;
  fileFormat: string;
}

export interface KeywordData {
  id: string;
  /** Searchable keyword (без тайм-кода) */
  term: string;
  /** Optional timecode parsed from "term | timecode" */
  timecode?: string;
  /** Original line as provided by backend/file (e.g., "term | 00:01:23") */
  label: string;
  results: SearchResult[] | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface AppConfig {
  googleApiKey: string;
  googleCxId: string;
  geminiApiKey: string;
}

export interface DownloadStatus {
  [url: string]: 'idle' | 'downloading' | 'success' | 'error';
}
