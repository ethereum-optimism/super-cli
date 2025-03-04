export interface AsyncQueueItem<T, R> {
	item: T;
	resolve: (value: R) => void;
	reject: (error: any) => void;
}

// Simple queue that processes items sequentially
export class AsyncQueue<T, R> {
	private queue: AsyncQueueItem<T, R>[] = [];
	private processing = false;
	private processFn: (item: T) => Promise<R>;

	constructor(processFn: (item: T) => Promise<R>) {
		this.processFn = processFn;
	}

	public enqueue(item: T): Promise<R> {
		return new Promise((resolve, reject) => {
			this.queue.push({item, resolve, reject});
			this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.processing) {
			return;
		}
		this.processing = true;

		try {
			while (this.queue.length > 0) {
				const queueItem = this.queue.shift();
				if (!queueItem) continue;
				try {
					const result = await this.processFn(queueItem.item);
					queueItem.resolve(result);
				} catch (error) {
					queueItem.reject(error);
				}
			}
		} finally {
			this.processing = false;
			if (this.queue.length > 0) {
				this.processQueue();
			}
		}
	}
}
