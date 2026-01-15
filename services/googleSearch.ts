import { SearchResult } from '../types';

const API_BASE = 'http://localhost:5000/api';

export const getKeywords = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/keywords`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn("Could not fetch keywords from backend", error);
    return [];
  }
};

export const searchGoogleImages = async (
  query: string,
  apiKey: string,
  cx: string,
  totalResults: number = 10
): Promise<SearchResult[]> => {
  if (!apiKey || !cx) {
    throw new Error("Missing API Key or Search Engine ID");
  }

  // Call our local Python backend instead of Google directly
  // We pass the keys so the backend can use them
  // NOTE: Google Custom Search returns max 10 results per request.
  // Our backend should page multiple requests when totalResults > 10.
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&apiKey=${apiKey}&cx=${cx}&total=${totalResults}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || `Backend Error: ${response.statusText}`);
  }

  const items = await response.json();
  
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item: any) => ({
    id: item.id,
    link: item.link,
    title: item.title,
    image: item.image,
    displayLink: item.displayLink,
    mime: item.mime,
    fileFormat: item.fileFormat,
  }));
};

export const downloadImage = async (
  id: number,
  imageUrl: string,
  query: string
): Promise<{ status: string; path?: string }> => {
  const response = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      imageUrl,
      query
    }),
  });

  if (!response.ok) {
    throw new Error("Download failed on server");
  }

  return await response.json();
};
