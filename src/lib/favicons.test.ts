import { expect, test } from 'bun:test';
import { faviconSites } from './favicons';

test('the favicon route only fetches sites the content links to', async () => {
  const sites = await faviconSites();
  expect(sites.has('directoryyy.com')).toBe(true); // a blog link
  expect(sites.has('maps.google.com')).toBe(true); // borrowed by Maps links
  expect(sites.has('github.com')).toBe(false); // has its own logo
  expect(sites.has('evil.example')).toBe(false);
});
