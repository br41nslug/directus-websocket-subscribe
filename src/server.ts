/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { ApiExtensionContext } from '@directus/shared/dist/esm/types';
import { ServerResponse, IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import { WebsocketClient } from './client';
import { EventDispatcher } from './events';
import type { DirectusWebsocketConfig } from './types';

export class SubscribeServer extends EventDispatcher {
    protected context: ApiExtensionContext;
    protected config: DirectusWebsocketConfig;
    protected app: any; // as far as i know express can't really be typed :(
    public clients: Set<WebsocketClient>;
    public server: WebSocketServer;

    constructor(config: DirectusWebsocketConfig, context: ApiExtensionContext) {
        super(['connected', 'message', 'close']);
        this.context = context;
        this.config = config;
        this.clients = new Set();
        this.server = new WebSocketServer({
            noServer: true,
            path: this.config.path,
        });
        this.server.on('connection', this.newClient);
    }

    private newClient(ws: WebSocket, req: IncomingMessage) {
        const client = new WebsocketClient(ws, req);
        this.clients.add(client);
        this.dispatch('connected', { client });
        client.on('message', (msg) => {
            this.dispatch('message', { client, msg });
        });
        client.on('error', () => {
            this.dispatch('close', { client });
            this.clients.delete(client);
        });
        client.on('close', () => {
            this.dispatch('close', { client });
            this.clients.delete(client);
        });
    }

    private runDirectusApp(request: any): Promise<void> {
        const app = this.app;
        return new Promise((resolve, reject) => {
            if (!app) return reject();
            let count = 0;
            const response = new ServerResponse(request)
            app(request, response);
            const interval = setInterval(() => {
                if (response.writableEnded) {
                    clearInterval(interval);
                    resolve();
                }
                if (count > 20) { // should add up to 1 second
                    console.error('max interval reached');
                    clearInterval(interval);
                    reject();
                }
                count++;
            }, 50);
        });
    }

    public bindExpress({ server }: any) {
        const { env, logger } = this.context;
        logger.info(`Websocket listening on ws://localhost:${env.PORT}${this.config.path}`);
        server.on('upgrade', async (request: any, socket: any, head: any) => {
            // run the request through the app to get accountability
            await this.runDirectusApp(request);
            if ( ! request.accountability || ( ! env.WEBSOCKET_PUBLIC && ! request.accountability.role)) {
                logger.info('request denied');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
            logger.info(`request upgraded for user "${request.accountability.user || 'public'}"`);
            this.server.handleUpgrade(request, socket, head, (websocket) => {
                this.server.emit('connection', websocket, request);
            });
        });
    }

    public bindApp({ app }: any) {
        this.app = app;
    }

    public broadcast(message: any) {
        const msg = typeof message === "string" ? message : JSON.stringify(message);
        this.server.clients.forEach(function each(client) {
            client.send(msg);
        });
    }
}