import { OG_IMAGE, SITE_NAME, SITE_URL } from './site';

// Schema.org descriptions of the site and the product, rendered as JSON-LD by src/components/JsonLd.jsx. Keep these in step with the copy they describe.

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: OG_IMAGE,
};

export const WEB_SITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  publisher: { '@id': ORGANIZATION_ID },
};

export const SOFTWARE_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  image: OG_IMAGE,
  applicationCategory: 'UtilitiesApplication',
  applicationSubCategory: 'File Transfer',
  operatingSystem: 'Web browser. Receiving files needs a Chromium browser.',
  browserRequirements: 'Requires WebRTC, and the File System Access API to receive files.',
  description: 'Send files of any size directly from one browser to another over an encrypted peer-to-peer connection. No upload, no account, and interrupted transfers resume where they stopped.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  isAccessibleForFree: true,
  publisher: { '@id': ORGANIZATION_ID },
  featureList: [
    'No file size limit',
    'Direct browser-to-browser transfer with no server copy',
    'Encrypted peer-to-peer connection',
    'Resumable transfers after an interruption',
    'Up to four people in one room',
    'No account required',
  ],
};

export const HOW_IT_WORKS_ARTICLE = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'How ecoos3 works: direct browser-to-browser file transfer',
  description: 'What the signaling server sees, how two browsers connect through NAT, why some networks fail, and how chunked transfers resume after an interruption.',
  url: `${SITE_URL}/how-it-works`,
  image: OG_IMAGE,
  author: { '@id': ORGANIZATION_ID },
  publisher: { '@id': ORGANIZATION_ID },
  about: [
    { '@type': 'Thing', name: 'WebRTC' },
    { '@type': 'Thing', name: 'NAT traversal' },
    { '@type': 'Thing', name: 'Peer-to-peer file transfer' },
  ],
};
