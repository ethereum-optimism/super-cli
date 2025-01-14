import {Prettify} from '@/lib/wizard-builder/utils';
import {z} from 'zod';

export type WizardStep<
	State,
	TSchema extends z.ZodTypeAny,
	Id extends string = string,
> = {
	id: Id;
	schema: TSchema;
	getSummary?: (state: State & z.infer<TSchema>) => string;
	title: string;
};

type WizardBuilder<State = {}, Steps extends WizardStep<any, any>[] = []> = {
	addStep: <TSchema extends z.ZodTypeAny, Id extends string>(
		wizardStep: WizardStep<State, TSchema, Id>,
	) => WizardBuilder<
		State & z.infer<TSchema>,
		[...Steps, WizardStep<State, TSchema, Id>]
	>;
	build: () => [
		...Steps,
		WizardStep<
			AccumulateStateFromSteps<Steps>,
			typeof completedState.schema,
			'completed'
		>,
	];
};

type AccumulateStateFromSteps<Steps extends WizardStep<any, any>[]> =
	Steps extends [WizardStep<any, infer TSchema, infer Id>, ...infer Rest]
		? Id extends 'completed'
			? {}
			: z.infer<TSchema> &
					AccumulateStateFromSteps<
						Rest extends WizardStep<any, any, any>[] ? Rest : []
					>
		: {};

type AccumulateStateBeforeId<
	Steps extends WizardStep<any, any>[],
	Id extends string,
	AccumulatedState = {},
> = Steps extends [infer First, ...infer Rest]
	? First extends WizardStep<any, infer TSchema, infer StepId>
		? StepId extends Id
			? AccumulatedState
			: AccumulateStateBeforeId<
					Rest extends WizardStep<any, any>[] ? Rest : [],
					Id,
					AccumulatedState & z.infer<TSchema>
			  >
		: never
	: AccumulatedState;

export type InferStateAtStep<
	Steps extends WizardStep<any, any>[],
	StepId extends string,
> = Prettify<AccumulateStateBeforeId<Steps, StepId>>;

export type InferFieldsAtStep<
	Steps extends WizardStep<any, any>[],
	StepId extends string,
> = Steps extends [infer First, ...infer Rest]
	? First extends WizardStep<any, infer TSchema, infer Id>
		? Id extends StepId
			? z.infer<TSchema>
			: InferFieldsAtStep<
					Rest extends WizardStep<any, any>[] ? Rest : [],
					StepId
			  >
		: never
	: never;

export type InferFinalState<Steps extends WizardStep<any, any>[]> = Prettify<
	AccumulateStateFromSteps<Steps>
>;

export type InferStepId<Steps extends WizardStep<any, any>[]> =
	Steps[number]['id'];

const completedState = {
	id: 'completed' as const,
	schema: z.object({}),
} as const;

export function defineWizard<
	State = {},
	Steps extends WizardStep<any, any, any>[] = [],
>(steps: Steps = [] as unknown as Steps): WizardBuilder<State, Steps> {
	return {
		addStep<TSchema extends z.ZodTypeAny, Id extends string>(
			wizardStep: WizardStep<State, TSchema, Id>,
		) {
			return defineWizard<
				State & z.infer<TSchema>,
				[...Steps, WizardStep<State, TSchema, Id>]
			>([...steps, wizardStep] as [...Steps, WizardStep<State, TSchema, Id>]);
		},
		build: () => {
			return [...steps, completedState] as [
				...Steps,
				WizardStep<
					AccumulateStateFromSteps<Steps>,
					typeof completedState.schema,
					'completed'
				>,
			];
		},
	};
}
