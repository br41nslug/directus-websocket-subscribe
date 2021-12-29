/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { ApiExtensionContext } from '@directus/shared/types';
import { ServerResponse, IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import { WebsocketClient } from './client';
import { MessageHandler, MessageHandlerConstructor } from './messages';
import type { DirectusWebsocketConfig, WebsocketMessage } from './types';
import { parseIncomingMessage } from './util';

export class DirectusWebsocketServer {
    protected context: ApiExtensionContext;
    protected config: DirectusWebsocketConfig;
    protected handlers: Set<MessageHandler>;
    public app: any; // as far as i know express can't really be typed :(
    public clients: Set<WebsocketClient>;
    public server: WebSocketServer;

    constructor(config: DirectusWebsocketConfig, context: ApiExtensionContext) {
        this.context = context;
        this.config = config;
        this.clients = new Set();
        this.handlers = new Set();
        this.server = new WebSocketServer({
            noServer: true,
            path: this.config.path,
        });
        this.server.on('connection', (socket: WebSocket, request: IncomingMessage) => {
            this.newClient(socket, request);
        });
    }

    private newClient(ws: WebSocket, req: IncomingMessage) {
        const { logger, getSchema } = this.context;
        const client = new WebsocketClient(ws, req);
        client.on('message', async ({ client: _c, msg }) => {
            logger.debug(`[ WS-${client.id} ] client message - ${JSON.stringify(msg)}`);
            const message = parseIncomingMessage(msg, await getSchema());
            this.runHandlers('message', client, message);
        });
        client.on('closed', () => {
            logger.debug(`[ WS-${client.id} ] client disconnected`);
            this.clients.delete(client);
            this.runHandlers('closed', client);
        });
        logger.debug(`[ WS-${client.id} ] client connected`);
        this.clients.add(client);
        this.runHandlers('connected', client);
    }

    private runHandlers(event: string, client: WebsocketClient, message?: WebsocketMessage) {
        this.handlers.forEach((handler) => {
            handler.dispatchEvent(event, client, message);
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

    public async upgradeRequest(request: any, socket: any, head: any) {
        const { logger } = this.context;
        // run the request through the app to get accountability
        await this.runDirectusApp(request);
        if ( ! request.accountability || ( ! this.config.public && ! request.accountability.role)) {
            logger.info('request denied');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        logger.info(`request upgraded for user "${request.accountability.user || 'public'}"`);
        this.server.handleUpgrade(request, socket, head, (websocket) => {
            this.server.emit('connection', websocket, request);
        });
    }

    public register(HandlerClass: MessageHandlerConstructor): MessageHandler {
        const { logger } = this.context;
        const handler = new HandlerClass(this.config, this.context);
        if (handler.isEnabled()) {
            logger.debug('[ WS ] handler registered: ' + HandlerClass.name);
            this.handlers.add(handler);
        }
        return handler;
    }
}