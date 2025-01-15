import {defineWizard, InferStepId} from '@/lib/wizard-builder/defineWizard';
import {z} from 'zod';
import {formatEther} from 'viem';
import {createWizardStore} from '@/lib/wizard-builder/createWizardStore';
import {zodAddress} from '@/lib/schemas';

const bridgeWizard = defineWizard()
	.addStep({
		id: 'select-network',
		schema: z.object({
			network: z.string(),
		}),
		title: 'Select Network',
		getSummary: state => `${state.network}`,
	})
	.addStep({
		id: 'select-chains',
		schema: z.object({
			chains: z.array(z.string()),
		}),
		title: 'Select Chains',
		getSummary: state => `${state.chains.join(', ')}`,
	})
	.addStep({
		id: 'enter-recipient',
		schema: z.object({
			recipient: zodAddress,
		}),
		title: 'Enter Recipient',
		getSummary: () => '',
	})
	.addStep({
		id: 'enter-amount',
		schema: z.object({
			amount: z.bigint(),
		}),
		title: 'Enter Amount',
		getSummary: state => {
			const perChainAmount = Number(formatEther(state.amount)).toFixed(2);
			const totalAmount = Number(
				formatEther(state.amount * BigInt(state.chains.length)),
			).toFixed(2);
			return `${perChainAmount} ETH × ${state.chains.length} chains = ${totalAmount} ETH total`;
		},
	})
	.build();

export const bridgeWizardIndexByStepId = bridgeWizard.reduce(
	(acc, step, index) => {
		acc[step.id] = index;
		return acc;
	},
	{} as Record<BridgeWizardStepId, number>,
);

export type BridgeWizardStepId = InferStepId<typeof bridgeWizard>;

export const useBridgeWizardStore = createWizardStore(bridgeWizard);
