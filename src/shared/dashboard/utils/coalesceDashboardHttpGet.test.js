import {
  buildDashboardGetCoalesceKey,
  coalesceDashboardHttpGet,
  resetDashboardHttpGetCoalesce,
} from './coalesceDashboardHttpGet';

describe('coalesceDashboardHttpGet', () => {
  afterEach(() => {
    resetDashboardHttpGetCoalesce();
  });

  it('matches query-in-url with axios params object', () => {
    const a = buildDashboardGetCoalesceKey(
      '/dashboard/instant_occupancy_count?time_range=this_day&floor_ids=1'
    );
    const b = buildDashboardGetCoalesceKey('/dashboard/instant_occupancy_count', {
      params: { time_range: 'this_day', floor_ids: ['1'] },
    });
    expect(a).toBe(b);
  });

  it('shares one in-flight promise for identical gets', async () => {
    let calls = 0;
    const client = {
      get: jest.fn(() => {
        calls += 1;
        return Promise.resolve({ data: { ok: true } });
      }),
    };
    const p1 = coalesceDashboardHttpGet(client, '/dashboard/occupancy_by_group', {
      params: { time_range: 'this_day' },
    });
    const p2 = coalesceDashboardHttpGet(
      client,
      '/dashboard/occupancy_by_group?time_range=this_day'
    );
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(calls).toBe(1);
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
    expect(r1.data).toEqual({ ok: true });
  });

  it('ignores cache-buster query keys when coalescing', () => {
    const a = buildDashboardGetCoalesceKey('/dashboard/light_power_density', {
      params: { time_range: 'this_day', _: '123' },
    });
    const b = buildDashboardGetCoalesceKey(
      '/dashboard/light_power_density?time_range=this_day'
    );
    expect(a).toBe(b);
  });

  it('serves recent completed response within TTL', async () => {
    let calls = 0;
    const client = {
      get: jest.fn(() => {
        calls += 1;
        return Promise.resolve({ data: { ok: true } });
      }),
    };
    await coalesceDashboardHttpGet(client, '/dashboard/light_power_density', {
      params: { time_range: 'this_day' },
    });
    await coalesceDashboardHttpGet(client, '/dashboard/light_power_density', {
      params: { time_range: 'this_day' },
    });
    expect(calls).toBe(1);
  });
});
