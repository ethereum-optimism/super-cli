import {DB} from '@/db/database';
import {InferInsertModel, InferSelectModel} from 'drizzle-orm';
import {eq} from 'drizzle-orm';
import {int, sqliteTable, text} from 'drizzle-orm/sqlite-core';
import {
	transformValueToBigInt,
	transformValueToSerializable,
} from '@/util/serialization';

const singletonId = 'singleton';

export const actionDescriptionByWizardId = {
	deployCreate2: 'Deploy a contract',
	bridge: 'Bridge assets',
	verify: 'Verify a contract',
};

export type WizardId = keyof typeof actionDescriptionByWizardId;

export const userContextTable = sqliteTable('user_context', {
	id: text('id')
		.primaryKey()
		.$default(() => singletonId),
	updatedAt: int('updated_at')
		.notNull()
		.$default(() => new Date().getTime()),
	createdAt: int('created_at')
		.notNull()
		.$default(() => new Date().getTime()),
	forgeProjectPath: text('forge_project_path'),
	lastWizardId: text('last_wizard_id').$type<WizardId | null>(),
	lastWizardState: text('last_wizard_state', {mode: 'json'}),
});

export type UserContext = InferSelectModel<typeof userContextTable>;

export const updateUserContext = async (
	db: DB,
	context: Partial<InferInsertModel<typeof userContextTable>>,
) => {
	const contextToSave = {...context};

	// Transform any BigInt values to serializable format
	if (contextToSave.lastWizardState !== undefined) {
		contextToSave.lastWizardState = transformValueToSerializable(
			contextToSave.lastWizardState,
		);
	}

	return await db
		.update(userContextTable)
		.set({
			...contextToSave,
			updatedAt: new Date().getTime(),
		})
		.where(eq(userContextTable.id, singletonId));
};

export const getUserContext = async (db: DB): Promise<UserContext> => {
	const results = await db
		.select()
		.from(userContextTable)
		.where(eq(userContextTable.id, singletonId));

	if (results.length === 0) {
		await db.insert(userContextTable).values({});
		return getUserContext(db);
	}

	if (results.length > 1) {
		throw new Error('Multiple user contexts found');
	}

	const context = results[0]!;

	// Transform serialized BigInt values back to actual BigInt
	if (context.lastWizardState) {
		context.lastWizardState = transformValueToBigInt(context.lastWizardState);
	}

	return context;
};
