/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { ApiExtensionContext, Accountability } from '@directus/shared/types';
import { WebSocketServer } from 'ws';
import type { ClientEventContext, ClientHandler, DirectusWebsocketConfig, WebsocketClient, WebsocketMessage } from './types';
import { outgoingError, parseIncomingMessage, runExpress } from './util';
const uuid = require('uuid');

export class DirectusWebsocketServer {
    protected context: ApiExtensionContext;
    protected config: DirectusWebsocketConfig;
    protected handlers: Set<ClientEventContext>;
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
        this.server.on('connection', (socket: WebSocket, request: any) => {
            this.newClient(socket, request);
        });
    }

    private newClient(ws: WebSocket, req: any) {
        const { logger } = this.context;
        const client: WebsocketClient = {
            id: uuid.v4(), socket: ws,
            accountability: req.accountability as Accountability
        };
        ws.addEventListener('open', (evt: Event) => {
            logger.debug(`[ WS-${client.id} ] open`/*, evt*/);
            this.clients.add(client);
            this.handlers.forEach(({ onOpen }) => {
                onOpen && onOpen(client, evt);
            });
        });
        ws.addEventListener('message', async (evt: MessageEvent<any>) => {
            logger.debug(`[ WS-${client.id} ] message`, evt);
            try {
                await this.handleMessage(client, evt);
            } catch(err: any) {
                logger.error(err);
                client.socket.send(outgoingError(err.message));
            }
        });
        ws.addEventListener('error', (evt: Event) => {
            logger.debug(`[ WS-${client.id} ] error`/*, evt*/);
            this.clients.delete(client);
            this.handlers.forEach(({ onError }) => {
                onError && onError(client, evt);
            });
        });
        ws.addEventListener('close', (evt: CloseEvent) => {
            logger.debug(`[ WS-${client.id} ] closed`/*, evt*/);
            this.clients.delete(client);
            this.handlers.forEach(({ onClose }) => {
                onClose && onClose(client, evt);
            });
        });
    }

    private async handleMessage(client: WebsocketClient, event: MessageEvent<any>) {
        const request = JSON.parse(event.data);
        const schema = await this.context.getSchema();
        const message = parseIncomingMessage(request, schema);
        let wasHandled = false;
        for (const { parseMessage, onMessage } of this.handlers) {
            if ( ! onMessage) continue;
            const _message = !parseMessage ? 
                message : parseMessage(message, request);
            if ( !! _message) {
                await onMessage(client, _message);
                wasHandled = true;
                break;
            }
        }
        if ( ! wasHandled) {
            throw new Error('Invalid message type! Either get, post, patch, delete or subscribe expected');
        }
    }

    public hookServer(app: any, server: any) {
        const { logger, env } = this.context;
        logger.info(`Websocket listening on ws://localhost:${env.PORT}${this.config.path}`);
        server.on('upgrade', async (request: any, socket: any, head: any) => {
            // run the request through the app to get accountability
            await runExpress(app, request);
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
        });
    }

    public register(eventHandler: ClientHandler): any {
        const handler = eventHandler(this.config, this.context);
        if (handler) this.handlers.add(handler);
        return handler;
    }
}