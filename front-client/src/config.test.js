import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from './config.js';

test('local development and production resolve to their intended API origins', () => {
  assert.equal(resolveApiBaseUrl(), 'http://localhost:5004');
  assert.equal(resolveApiBaseUrl({ PROD: true }, 'https://games.example.com'), 'https://games.example.com');
  assert.equal(resolveApiBaseUrl({ PROD: true, VITE_API_BASE_URL: ' https://api.example.com/ ' }), 'https://api.example.com');
});

test('production rejects insecure or path-based API addresses', () => {
  for (const address of ['http://api.example.com', 'https://api.example.com/api', 'https://user:secret@api.example.com', 'https://api.example.com?x=1']) {
    assert.throws(() => resolveApiBaseUrl({ PROD: true, VITE_API_BASE_URL: address }));
  }
});
