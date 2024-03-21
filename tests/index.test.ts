import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('Worker', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev('src/index.ts', {
			experimental: { disableExperimentalWarning: true },
		});
	});

	afterAll(async () => { await worker.stop(); });

	it('should return a 200 response', async () => {
		const resp = await worker.fetch();
		expect(resp.status).toBe(200);
	});

	/*it('should include the proper text', async () => {
		const resp = await worker.fetch();
		console.log(resp.text())
		expect(resp.text()).toContain("Discord Format");
	});*/
});
