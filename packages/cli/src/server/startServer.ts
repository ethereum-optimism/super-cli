import path from 'path';
import {fileURLToPath} from 'url';
import {serveStatic} from '@hono/node-server/serve-static';
import {serve} from '@hono/node-server';
import {Hono} from 'hono';
import fs from 'fs/promises';
import {api} from '@/server/api';

export async function startServer() {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const absoluteFrontendDistPath = path.resolve(
		__dirname,
		'../../../signer-frontend/dist',
	);

	const relativeFrontendDistPath = path.relative(
		process.cwd(),
		absoluteFrontendDistPath,
	);
	const indexHtmlPath = path.join(relativeFrontendDistPath, 'index.html');

	// Read the index.html file asynchronously once when starting the server
	const indexHtml = await fs.readFile(indexHtmlPath, 'utf-8');

	const app = new Hono();

	// Add logging middleware
	// app.use('*', async (c, next) => {
	// 	console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
	// 	await next();
	// });

	// API ROUTES
	app.route('/api', api);

	// FRONTEND ROUTES

	// Serve static assets first
	app.get('/assets/*', serveStatic({root: relativeFrontendDistPath}));

	app.get('/favicon.ico', serveStatic({root: relativeFrontendDistPath}));

	// For base route, serve index.html. Fix when there are more client side routes
	app.get('/', c => {
		return c.html(indexHtml);
	});

	const server = serve({fetch: app.fetch, port: 3000});
	return server;
}
