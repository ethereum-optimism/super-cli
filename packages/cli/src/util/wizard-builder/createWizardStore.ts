import {
	InferFieldsAtStep,
	InferStateAtStep,
	WizardStep,
} from '@/util/wizard-builder/defineWizard';
import {
	capitalizeWords,
	CapitalizeWords,
	Prettify,
} from '@/util/wizard-builder/utils';
import {create} from 'zustand';

export type WizardPossibleStates<Steps extends WizardStep<any, any>[]> = {
	[Index in keyof Steps]: Prettify<
		{
			readonly stepId: Steps[Index]['id'];
		} & InferStateAtStep<Steps, Steps[Index]['id']>
	>;
}[number];

export type DefineStoreType<Steps extends WizardStep<any, any, string>[]> = {
	wizardState: WizardPossibleStates<Steps>;
	steps: Steps;
	setWizardState: (state: WizardPossibleStates<Steps>) => void;
	goToPreviousStep: () => void;
} & {
	[Step in Steps[number] as `submit${CapitalizeWords<Step['id']>}`]: (
		value: InferFieldsAtStep<Steps, Step['id']>,
	) => void;
};

// Factory function to create the store
export function createWizardStore<Steps extends WizardStep<any, any, any>[]>(
	wizard: Steps,
) {
	type WizardType = Steps;
	type PossibleStates = WizardPossibleStates<WizardType>;

	type StoreType = DefineStoreType<Steps>;

	const initialState: PossibleStates = {
		stepId: wizard[0]!.id,
	} as PossibleStates;

	const store = create<StoreType>((set, get) => {
		const goToPreviousStep = () => {
			const currentState = get().wizardState;
			const currentStepIndex = wizard.findIndex(
				step => step.id === currentState.stepId,
			);

			if (currentStepIndex <= 0) return; // Can't go back from first step

			const prevStepId = wizard[currentStepIndex - 1]!.id;
			const prevState = {
				...currentState,
				stepId: prevStepId,
			} as PossibleStates;

			set({wizardState: prevState} as StoreType);
		};

		const submitFunctions = wizard.reduce((acc, step, index) => {
			const currentStepId = step.id;
			const nextStepId = wizard[index + 1]?.id || 'completed';

			const functionName = `submit${capitalizeWords(
				currentStepId,
			)}` as keyof StoreType;

			acc[functionName] = (
				value: InferFieldsAtStep<WizardType, typeof currentStepId>,
			) => {
				const currentState = get().wizardState as Extract<
					WizardPossibleStates<WizardType>,
					{stepId: typeof currentStepId}
				>;

				const nextState: Extract<
					WizardPossibleStates<WizardType>,
					{stepId: typeof nextStepId}
				> = {
					...currentState,
					...value,
					stepId: nextStepId,
				};

				set({
					wizardState: nextState,
				} as StoreType);
			};

			return acc;
		}, {} as Record<string, (value: any) => void>);

		return {
			wizardState: initialState,
			steps: wizard,
			setWizardState: (state: WizardPossibleStates<WizardType>) => {
				set({wizardState: state} as StoreType);
			},
			goToPreviousStep,
			...submitFunctions,
		} as StoreType;
	});

	return store;
}
