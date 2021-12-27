/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { ApiExtensionContext } from '@directus/shared/dist/esm/types';
import { ServerResponse } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';

export class SubscribeServer {
    protected context: ApiExtensionContext;
    protected app: any; // as far as i know express can't really be typed :(
    protected evtSub: { [event: string]: Array<any> };
    public path: string;
    public server: WebSocketServer;

    constructor(context: ApiExtensionContext) {
        const { env } = context;
        this.context = context;
        this.path = env.WEBSOCKET_PATH || '/websocket';
        this.server = new WebSocketServer({
            noServer: true,
            path: this.path,
        });
        this.evtSub = {
            connect: [], message: [],
            error: [], close: []
        };
        this.bindEvents();
    }

    private bindEvents() {
        this.server.on('connection', (ws, req) => {
            this.dispatch('connect', { ws, req });
            ws.addEventListener('message', (msg) => this.dispatch('message', { ws, req, msg }));
            ws.addEventListener('error', () => this.dispatch('error', { ws, req }));
            ws.addEventListener('close', () => this.dispatch('close', { ws, req }));
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

    // bind websocket server to express server
    bindExpress({ server }: any) {
        const { env, logger } = this.context;
        logger.info(`Websocket listening on ws://localhost:${env.PORT}${this.path}`);
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

    bindApp({ app }: any) {
        this.app = app;
    };

    // bind to a client event
    on(event: string, callback: any) {
        const { logger } = this.context;
        const sub = this.evtSub;
        if ( ! sub[event]) return logger.error('Unkown event: '+event);
        sub[event]?.push(callback);
    };
    
    // broadcast a message to all clients
    broadcast(message: any) {
        const msg = typeof message === "string" ? message : JSON.stringify(message);
        this.server.clients.forEach(function each(client) {
            client.send(msg);
        });
    }

    // dispatch a specific event
    private dispatch(event: string, data: any) {
        const { logger } = this.context;
        const sub = this.evtSub;
        if ( ! sub[event]) {
            logger.error('Unkown event: '+event);
            return;
        }
        sub[event]?.forEach((callback) => {
            callback(data);
        });
    }
}