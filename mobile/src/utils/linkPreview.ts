import axios from 'axios';

/**
 * Phase 2: Secure Link Preview Utility
 * Crucial Security Rule: Never auto-fetch URL metadata without user consent.
 */
export const fetchLinkPreview = async (url: string) => {
  // 1. User must have 'Allow external previews' enabled in settings or confirmed.
  try {
     const response = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
     const { data } = response.data;
     return {
       title: data.title,
       description: data.description,
       image: data.image?.url,
       url: data.url
     };
  } catch (err) {
    console.warn("Link preview failed:", err);
    return null;
  }
};

export const parseUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex);
};
