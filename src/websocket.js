/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { ServerResponse } from 'http';
import { WebSocketServer } from 'ws';

export function SubscribeServer(context) {
    const self = this || {};
    const { env, logger } = context;
    const WS_PATH = env.WEBSOCKET_PATH || '/websocket';
    const websocketServer = new WebSocketServer({
		noServer: true,
		path: WS_PATH,
	});
    const evtSub = {
        connect: [], message: [],
        error: [], close: []
    };

    // bind websocket server to express server
    self.bindExpress = ({ server }) => {
        logger.info(`Websocket listening on ws://localhost:${env.PORT}${WS_PATH}`);
        server.on('upgrade', (request, socket, head) => {
            const response = new ServerResponse(request);
            // run the request through the app to get accountability
            this.app(request, response)
            if ( ! request.accountability || ( ! env.WEBSOCKET_PUBLIC && ! request.accountability.role)) {
                logger.info('request denied');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
            logger.info('request upgraded');
            websocketServer.handleUpgrade(request, socket, head, (websocket) => {
                websocketServer.emit('connection', websocket, request);
            });
        });
    };

    self.bindApp = ({ app }) => {
        this.app = app;
    };

    // bind to a client event
    self.on = (event, callback) => {
        if ( ! evtSub[event]) return logger.error('Unkown event: '+event);
        evtSub[event].push(callback);
    };
    
    // broadcast a message to all clients
    self.broadcast = (message) => {
        const msg = typeof message === "string" ? message : JSON.stringify(message);
        websocketServer.clients.forEach(function each(client) {
            client.send(msg);
        });
    };

    // dispatch a specific event
    function dispatch(event, data) {
        if ( ! evtSub[event]) return logger.error('Unkown event: '+event);
        evtSub[event].forEach((callback) => {
            callback(data);
        });
    }

    // events
    websocketServer.on('connection', (ws, req) => {
        dispatch('connect', { ws, req });
		ws.addEventListener('message', (msg) => dispatch('message', { ws, req, msg }));
		ws.addEventListener('error', () => dispatch('error', { ws, req }));
		ws.addEventListener('close', () => dispatch('close', { ws, req }));
	});

    return self;
}