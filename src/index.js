/**
 * Websocket Subscribe
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { WebSocketServer } from 'ws';

// parse incoming message
function parseIncomingMessage(msg, schema) {
    const req = JSON.parse(msg.data);
    const type = (req.type || 'fetch').trim().toUpperCase();
    if (type !== 'FETCH' && type !== 'SUBSCRIBE') {
        throw new Error('Invalid message type! fetch or subscribe expected');
    }
    const collection = (req.collection || '').trim().toLowerCase();
    if (typeof collection !== "string" || collection.length === 0) {
        throw new Error('Collection is required');
    }
    if ( ! schema.collections[collection]) {
        throw new Error('Collection does not exist in schema');
    }
    if (type === 'FETCH') {
        let query = {};
        if (typeof req.query === "object" && !Array.isArray(req.query)) {
            const queryProps = ['fields', 'sort', 'filter', 'limit', 'offset', 'page', 'search', 'group', 'aggregate', 'deep', 'alias' ];
            queryProps.forEach((prop) => {
                if ( !! req.query[prop]) {
                    query[prop] = req.query[prop];
                }
            });
        }
        // only return the allowed properties
        return { type, collection, query };
    }
    if (type === 'SUBSCRIBE') {
        const id = req.id;
        return { type, collection, id };
    }
    return {};
}

// hook wrapper
export default function registerHook({ action }, { services, getSchema, database: knex, env, logger }) {
    const { ItemsService } = services;

    // configuration
    const WS_PATH = env.WEBSOCKET_PATH || '/websocket';
    const websocketServer = new WebSocketServer({
		noServer: true,
		path: WS_PATH,
	});

    const subscriptions = {};
    function subscribe(collection, id, socket) {
        if ( ! subscriptions[collection]) {
            subscriptions[collection] = [];
        }
        subscriptions[collection].push({
            collection, id, socket
        });
    }
    function unsubscribe(socket) {
        for (const col of Object.keys(subscriptions)) {
            for (let i = 0; i < subscriptions[col].length; i++) {
                const handle = subscriptions[col][i];
                if (handle.socket == socket) {
                    subscriptions[col].splice(i, 1);
                }
            }
        }
    }

    // hook into server
    action('server.start', ({ server }) => {
        logger.info(`Websocket listening on ws://localhost:${env.PORT}${WS_PATH}`);
        server.on('upgrade', (request, socket, head) => {
            logger.info('request upgrade');
            websocketServer.handleUpgrade(request, socket, head, (websocket) => {
                websocketServer.emit('connection', websocket, request);
            });
        });
    });

    function onMessage(ws, req) {
        return async function(msg) {
            const schema = await getSchema();
            let message;
            try {
                message = parseIncomingMessage(msg, schema);
                logger.info(`message - ${JSON.stringify(message)}`);
            } catch (err) {
                logger.error(err);
                return;
            }
            if (message.type === 'FETCH') {
                const service = new ItemsService(message.collection, { knex, schema, accountability: { ...req.accountability, admin: true }});
                logger.info(`query - ${JSON.stringify(message.query)}`);
                const result = await service.readByQuery(message.query);
                logger.info(`result`);
                ws.send(JSON.stringify(result));
            }
            if (message.type === 'SUBSCRIBE') {
                subscribe(message.collection, message.id, ws);
                logger.info(`subscribed - ${message.collection} #${message.id}`);
            }
        }
    }

    // manage clients
    websocketServer.on('connection', (ws, req) => {
		logger.info(`client connected`);
		ws.addEventListener('message', onMessage(ws, req));
		ws.addEventListener('error', () => {
			logger.info(`client errored`);
            unsubscribe(ws);
		});
		ws.addEventListener('close', () => {
			logger.info(`client left`);
            unsubscribe(ws);
		});
	});

    // Hook into some actions
    action('items.create', ({ payload, key, collection }) => {
        logger.info('create', { payload, key, collection });
        broadcast(collection, { action: 'items.create', payload, key, collection });
    });
    action('items.update', ({ payload, keys, collection }) => {
        logger.info('update', { payload, keys, collection });
        broadcast(collection, { action: 'items.update', payload, keys, collection });
    });
    action('items.delete', ({ payload, collection }) => {
        logger.info('delete', { payload, collection });
        broadcast(collection, { action: 'items.delete', payload, collection });
    });

    // actions
    function broadcast(collection, message) {
        const msg = JSON.stringify(message);
        (subscriptions[collection] || []).forEach(function ({ id=false, socket }) {
            // do something with id subscriptions later
            socket.send(msg);
        });
        // websocketServer.clients.forEach(function each(client) {
        //     client.send(message);
        // });
    }
};
