import {
	completeTransactionTask,
	getMappingChainById,
	listTransactionTasks,
	TransactionTaskEntry,
} from "@/api";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { hexToBigInt } from "viem";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";
import { SendTransactionErrorType } from "@wagmi/core";
import { Loader2, SendHorizontal, CheckCircle } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Chain, Hash } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const getBaseBlockExplorerUrl = (chain: Chain) => {
	const result =
		chain.blockExplorers?.["blockscout"]?.url ||
		chain.blockExplorers?.default?.url ||
		"";

	// trim / at the end
	return result.endsWith("/") ? result.slice(0, -1) : result;
};

const getBlockExplorerTxHashLink = (chain: Chain, txHash: Hash) => {
	return `${getBaseBlockExplorerUrl(chain)}/tx/${txHash}`;
};

const Task = ({
	task,
	chain,
}: {
	task: TransactionTaskEntry;
	chain: Chain;
}) => {
	const { data: chainByIdResult } = useQuery({
		queryKey: ["getMappingChainById"],
		queryFn: getMappingChainById,
	});
	const queryClient = useQueryClient();
	const { sendTransaction, isPending } = useSendTransaction({
		mutation: {
			onSuccess: async (hash) => {
				await completeTransactionTask(task.id, hash);
				queryClient.invalidateQueries({
					queryKey: ["listTransactionTasks"],
				});
				toast.success("Transaction sent successfully");
			},
			onError: (error) => {
				const sendTransactionError = error as SendTransactionErrorType;
				console.error(error);
				// @ts-expect-error not all errors have shortMessage
				const message = error.shortMessage || error.message;
				toast.error(
					`Transaction failed: ${sendTransactionError.name} ${message}`
				);
			},
		},
	});

	const { address } = useAccount();
	const { openConnectModal } = useConnectModal();
	const { switchChainAsync } = useSwitchChain();

	if (!chainByIdResult) {
		return null;
	}

	return (
		<TableRow className=" p-0">
			<TableCell className="flex flex-col justify-center">
				<div className="">
					{chainByIdResult.chainById[task.request.chainId].name}
				</div>
				<div className="text-muted-foreground text-xs">
					({task.request.chainId})
				</div>
			</TableCell>
			<TableCell className="">
				<code className="rounded bg-muted px-2 py-1 text-xs">
					{task.request.to}
				</code>
			</TableCell>

			<TableCell className="min-w-[160px] text-right">
				{task.result && task.result.type === "success" ? (
					<a
						href={getBlockExplorerTxHashLink(chain, task.result.hash)}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded bg-muted px-2 py-1 text-xs truncate max-w-[300px] hover:underline"
					>
						{task.result.hash}
					</a>
				) : (
					<Button
						size="sm"
						variant="outline"
						className="w-[120px] transition-colors hover:bg-primary hover:text-primary-foreground"
						disabled={isPending}
						onClick={async () => {
							if (!address) {
								openConnectModal?.();
								return;
							}

							await switchChainAsync({
								chainId: task.request.chainId,
							});
							sendTransaction({
								chainId: task.request.chainId,
								to: task.request.to,
								data: task.request.data,
								value: task.request.value
									? hexToBigInt(task.request.value)
									: undefined,
							});
						}}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								<span className="text-xs">Sending...</span>
							</>
						) : (
							<>
								<SendHorizontal className="mr-2 h-4 w-4" />
								<span className="text-xs">Send</span>
							</>
						)}
					</Button>
				)}
			</TableCell>
		</TableRow>
	);
};

export const TransactionTasks = () => {
	const {
		data: transactionTasks,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["listTransactionTasks"],
		queryFn: async () => {
			return listTransactionTasks();
		},
		// TODO: update when we have websockets
		refetchInterval: 2000,
	});

	const {
		data: chainByIdResult,
		isLoading: isChainByIdLoading,
		error: chainByIdError,
	} = useQuery({
		queryKey: ["getMappingChainById"],
		queryFn: getMappingChainById,
	});

	if (error || chainByIdError) {
		return null;
	}

	if (
		isLoading ||
		!transactionTasks ||
		isChainByIdLoading ||
		!chainByIdResult
	) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (transactionTasks.length === 0) {
		return (
			<div className="rounded-lg border border-border/50 p-8 text-center">
				<p className="text-sm text-muted-foreground">No transactions found</p>
			</div>
		);
	}

	const pendingTasks = transactionTasks.filter((task) => !task.result);
	const completedTasks = transactionTasks.filter((task) => task.result);

	return (
		<Tabs defaultValue="pending" className="space-y-4">
			<TabsList className="grid w-full grid-cols-2">
				<TabsTrigger value="pending" className="flex items-center gap-2">
					<SendHorizontal className="h-4 w-4" />
					Pending
					<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
						{pendingTasks.length}
					</span>
				</TabsTrigger>
				<TabsTrigger value="completed" className="flex items-center gap-2">
					<CheckCircle className="h-4 w-4" />
					Completed
					<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
						{completedTasks.length}
					</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="pending">
				{pendingTasks.length > 0 ? (
					<Card>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="">Chain</TableHead>
									<TableHead>To</TableHead>
									<TableHead className="flex justify-end items-center pr-16">
										Action
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{pendingTasks.map((task) => {
									const chain = chainByIdResult.chainById[task.request.chainId];

									return <Task key={task.id} task={task} chain={chain} />;
								})}
							</TableBody>
						</Table>
					</Card>
				) : (
					<Card>
						<CardContent className="">
							<div className="flex items-center justify-center py-12 text-muted-foreground">
								No pending transactions
							</div>
						</CardContent>
					</Card>
				)}
			</TabsContent>

			<TabsContent value="completed">
				{completedTasks.length > 0 ? (
					<Card>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[100px]">Chain</TableHead>
									<TableHead>To</TableHead>
									<TableHead className="flex justify-end items-center pr-6">
										Transaction Hash
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{completedTasks.map((task) => {
									const chain = chainByIdResult.chainById[task.request.chainId];

									return <Task key={task.id} task={task} chain={chain} />;
								})}
							</TableBody>
						</Table>
					</Card>
				) : (
					<Card>
						<CardContent className="">
							<div className="flex items-center justify-center py-12 text-muted-foreground">
								No completed transactions
							</div>
						</CardContent>
					</Card>
				)}
			</TabsContent>
		</Tabs>
	);
};
