import {Hash} from 'viem';
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

import {
	createTransactionTaskId,
	TransactionTask,
} from '@/transaction-task/transactionTask';

export type TransactionTaskEntry = {
	id: string;
	request: TransactionTask;
	hash?: Hash;
	createdAt: Date;
};

type TransactionTaskStore = {
	taskEntryById: Record<string, TransactionTaskEntry>;

	createTask: (task: TransactionTask) => void;
	completeTask: (id: string, hash: Hash) => void;
};

export const useTransactionTaskStore = create(
	immer<TransactionTaskStore>(set => ({
		taskEntryById: {},
		createTask: (task: TransactionTask) => {
			set(state => {
				const id = createTransactionTaskId(task);
				state.taskEntryById[id] = {
					id,
					request: task,
					createdAt: new Date(),
				};
			});
		},
		completeTask: (id: string, hash: Hash) => {
			set(state => {
				if (state.taskEntryById[id]) {
					state.taskEntryById[id].hash = hash;
				}
			});
		},
	})),
);
