import { describe, it, expect, beforeEach, vi } from 'vitest';

// We want the real api client, not the global mock from setupTests
// Use importActual to bypass the vi.mock in setupTests
let api: any;

type OkJsonExtra = { headers?: Record<string, string> };

const okJson = (data: any, extra: OkJsonExtra = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers({ 'content-type': 'application/json', ...(extra.headers || {}) }),
  json: async () => data,
  text: async () => JSON.stringify(data),
});

const notOk = (status = 500, statusText = 'Internal Server Error', body = 'boom', extra: OkJsonExtra = {}) => ({
  ok: false,
  status,
  statusText,
  headers: new Headers({ 'content-type': 'text/plain', ...(extra.headers || {}) }),
  json: async () => { throw new Error('should not call json'); },
  text: async () => body,
});

describe('apiClient', () => {
  beforeEach(async () => {
    // reset modules to ensure a fresh import and clear any previous mocks
    vi.resetModules();
    ({ api } = await vi.importActual('../../services/apiClient'));
    // mock global fetch per test
    // @ts-expect-error set global fetch mock
    global.fetch = vi.fn();
  });

  it('listChickens fetches JSON and returns data', async () => {
    const rows = [{ id: '1', batchName: 'A' }];
    (global.fetch as any).mockResolvedValueOnce(okJson(rows));

    const data = await api.listChickens();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/chickens$/),
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(data).toEqual(rows);
  });

  it('addChicken posts JSON body and returns created row', async () => {
    const input = { batchName: 'New', initialCount: 10 };
    const created = { id: 'id-1', ...input };
    (global.fetch as any).mockResolvedValueOnce(okJson(created));

    const res = await api.addChicken(input);
    expect(global.fetch).toHaveBeenCalled();
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(input);
    expect(res).toEqual(created);
  });

  it('throws a helpful error when response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce(notOk(404, 'Not Found', 'nope'));
    await expect(api.listChickens()).rejects.toThrow(/API 404 Not Found: nope/);
  });

  it('deleteChicken sends DELETE and returns null for non-JSON responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers({ 'content-type': 'text/plain' }),
      json: async () => { throw new Error('should not parse'); },
      text: async () => '',
    });
    const res = await api.deleteChicken('abc');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/chickens\/abc$/),
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(res).toBeNull();
  });

  // Additional endpoints merged from separate file
  it('updateChicken uses PATCH with JSON body and returns row', async () => {
    (global.fetch as any).mockResolvedValueOnce(okJson({ id: 'x1', currentCount: 9 }));
    const res = await api.updateChicken('x1', { currentCount: 9 });
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.method).toBe('PATCH');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ currentCount: 9 });
    expect(res).toEqual({ id: 'x1', currentCount: 9 });
  });

  it('listFeedLogs GETs logs for a chicken', async () => {
    const logs = [{ id: 'l1', pounds: 5 }];
    (global.fetch as any).mockResolvedValueOnce(okJson(logs));
    const data = await api.listFeedLogs('abc');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/chickens\/abc\/feed-logs$/),
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(data).toEqual(logs);
  });

  it('addFeedLog POSTs JSON and returns created log', async () => {
    const input = { pounds: 4, cost: 8 };
    const created = { id: 'l-new', ...input };
    (global.fetch as any).mockResolvedValueOnce(okJson(created));
    const data = await api.addFeedLog('abc', input);
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(input);
    expect(data).toEqual(created);
  });

  it('updateFeedLog PATCHes JSON and returns updated log', async () => {
    const input = { pounds: 7 };
    const updated = { id: 'l1', ...input };
    (global.fetch as any).mockResolvedValueOnce(okJson(updated));
    const data = await api.updateFeedLog('abc', 'l1', input);
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual(input);
    expect(data).toEqual(updated);
  });

  it('deleteFeedLog sends DELETE and returns null for non-JSON responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers({ 'content-type': 'text/plain' }),
      json: async () => { throw new Error('no json'); },
      text: async () => '',
    });
    const res = await api.deleteFeedLog('abc', 'l1');
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.method).toBe('DELETE');
    expect(res).toBeNull();
  });

  it('getAllTags fetches JSON map', async () => {
    const map = { layers: 2, broilers: 1 };
    (global.fetch as any).mockResolvedValueOnce(okJson(map));
    const data = await api.getAllTags();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/tags$/),
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(data).toEqual(map);
  });
});
