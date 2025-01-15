import {Hono} from 'hono';
import {cors} from 'hono/cors';
import {validator} from 'hono/validator';
import {useTransactionTaskStore} from '@/stores/transactionTaskStore';
import {zodHash} from '@/lib/schemas';
import {z} from 'zod';
import {queryMappingChainById} from '@/queries/chainById';

export const api = new Hono();

// TODO: consider just supporting the eth_sendTransaction RPC method - will be easier for integration
// At that point, this API will just be a "remote" wallet that proxies out to other wallets
// Only issue is usually eth_sendTransaction is more of a "synchronous" method than an async one

// TODO: low priority - consider using websockets

if (process.env['SUP_DEV_MODE'] === 'true') {
	api.use(cors());
}

api.get('/healthz', async c => {
	return c.json({
		message: 'OK',
	});
});

api.post('/getMappingChainById', async c => {
	const chainById = await queryMappingChainById();

	return c.json({
		chainById,
	});
});

api.post('/listTransactionTasks', async c => {
	const {taskEntryById} = useTransactionTaskStore.getState();

	return c.json({
		transactionTasks: Object.values(taskEntryById).sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
		),
	});
});

api.post(
	'/completeTransactionTask',
	validator('json', (value, c) => {
		const parsed = z
			.object({
				id: z.string(),
				hash: zodHash,
			})
			.safeParse(value);
		if (!parsed.success) {
			return c.text('Invalid request', 400);
		}

		if (!useTransactionTaskStore.getState().taskEntryById[parsed.data.id]) {
			return c.text('Transaction task not found', 400);
		}

		return parsed.data;
	}),
	async c => {
		const {id, hash} = c.req.valid('json');

		// TODO: fetch the transaction receipt and check that the hash corresponds to the task (check to, data, value, etc)
		useTransactionTaskStore.getState().completeTask(id, hash);
		return c.json({
			signatureRequest: {},
		});
	},
);
