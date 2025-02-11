import { z } from "zod";
import { Address as zodAddress } from "abitype/zod";
import { Chain, Hash, Hex, isHash, isHex } from "viem";

// In prod, the api is hosted on the same domain as the frontend
const apiBaseUrl =
	import.meta.env.VITE_FRONTEND_MODE === "dev" ? "http://localhost:3000" : "";

// TODO: move to shared package
const zodHex = z.string().refine((value): value is Hex => isHex(value), {
	message: "Invalid hex",
});

export const zodHash = z
	.string()
	.refine((value): value is Hash => isHash(value), {
		message: "Invalid hash",
	});

// TODO: move shared API definitions to shared package or use trpc or sth.
const zodTransactionTask = z.object({
	chainId: z.number(),
	to: zodAddress.optional(),
	data: zodHex.optional(),
	value: zodHex.optional(),
});

const zodTaskResult = z.union([
	z.object({
		type: z.literal("success"),
		hash: zodHash,
	}),
	z.object({
		type: z.literal("error"),
		error: z.string(),
	}),
]);

const zodTransactionTaskEntry = z.object({
	id: z.string(),
	request: zodTransactionTask,
	result: zodTaskResult.optional(),
	createdAt: z.coerce.date(),
});

export type TransactionTaskEntry = z.infer<typeof zodTransactionTaskEntry>;

const zodListTransactionTaskResponse = z.object({
	transactionTasks: z.array(zodTransactionTaskEntry),
});

export const getMappingChainById = async () => {
	const response = await fetch(`${apiBaseUrl}/api/getMappingChainById`, {
		method: "POST",
	});

	if (!response.ok) {
		throw new Error(
			`Failed to get mapping chain by id: ${response.statusText}`
		);
	}

	// TODO: validate using zod
	const json = (await response.json()) as {
		chainById: Record<number, Chain>;
	};
	return json;
};

export const listTransactionTasks = async () => {
	const response = await fetch(`${apiBaseUrl}/api/listTransactionTasks`, {
		method: "POST",
	});

	if (!response.ok) {
		throw new Error(`Failed to list transaction tasks: ${response.statusText}`);
	}

	const json = await response.json();
	const parsed = zodListTransactionTaskResponse.parse(json);
	return parsed.transactionTasks;
};

export const completeTransactionTask = async (id: string, hash: Hash) => {
	const response = await fetch(`${apiBaseUrl}/api/completeTransactionTask`, {
		headers: {
			"Content-Type": "application/json",
		},
		method: "POST",
		body: JSON.stringify({ id, hash }),
	});

	if (!response.ok) {
		throw new Error(
			`Failed to complete transaction task: ${response.statusText}`
		);
	}

	return response.json();
};
