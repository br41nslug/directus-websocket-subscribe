/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { SubscribeServer } from './websocket';
import { outgoingResponse, parseIncomingMessage } from './message';

// hook wrapper
export default function registerHook({ action }, context) {
    const { services, getSchema, database: knex, logger } = context;
    const { ItemsService } = services;

    const subscribeServer = new SubscribeServer(context);
    const evtSub = {};

    // hook into server
    action('server.start', subscribeServer.bindExpress);

    async function messageGet(ws, message, schema) {
        const service = new ItemsService(message.collection, { knex, schema, accountability: { ...req.accountability, admin: true }});
        logger.info(`query - ${JSON.stringify(message.query)}`);
        const result = await service.readByQuery(message.query);
        logger.info(`result`);
        ws.send(outgoingResponse(result));
    }
    async function messagePost(ws, message, schema) {}
    async function messagePatch(ws, message, schema) {}
    async function messageDelete(ws, message, schema) {}
    async function messageSubscribe(ws, message, schema) {
        subscribe(message.collection, message.id, ws);
        logger.info(`subscribed - ${message.collection} #${message.id}`);
    }

    // message handler
    async function onMessage({ ws, req, msg }) {
        const schema = await getSchema();
        let message;
        try {
            message = parseIncomingMessage(msg, schema);
            logger.info(`message - ${JSON.stringify(message)}`);
        } catch (err) {
            return logger.error(err);
        }
        switch (message.type) {
            case 'GET': return await messageGet(ws, message, schema);
            case 'POST': return await messagePost(ws, message, schema);
            case 'PATCH': return await messagePatch(ws, message, schema);
            case 'DELETE': return await messageDelete(ws, message, schema);
            case 'SUBSCRIBE': return await messageSubscribe(ws, message, schema);
            default: throw new Error('Invalid message type! get, post, patch, delete or subscribe expected');
        }
    }

    function subscribe(collection, id, socket) {
        if ( ! evtSub[collection]) {
            evtSub[collection] = [];
        }
        evtSub[collection].push({ id, socket });
    }
    function unsubscribe(socket) {
        for (const key of Object.keys(evtSub)) {
            for (let i = evtSub[key].length - 1; i >= 0; i--) {
                if (evtSub[key][i].socket === socket) {
                    evtSub[key].splice(i, 1);
                }
            }
        }
    }

    // client events
    subscribeServer.on('connect', () => {
		logger.info(`client connected`);
    });
    subscribeServer.on('message', onMessage);
    subscribeServer.on('error', ({ ws }) => {
        logger.info(`client errored`);
        unsubscribe(ws);
    });
    subscribeServer.on('close', ({ ws }) => {
        logger.info(`client left`);
        unsubscribe(ws);
    });

    // dispatch event
    function dispatch(collection, msg) {
        (evtSub[collection] || []).forEach(({ id, socket }) => {    
            socket.send(JSON.stringify(msg));
        });
    }

    // hook into item manipulation actions
    action('items.create', ({ payload, key, collection }) => {
        const msg = JSON.stringify({ action: 'items.create', payload, key, collection });
        logger.info('create - ' + msg);
        dispatch(collection, { action: 'create', payload, key, collection });
    });
    action('items.update', ({ payload, keys, collection }) => {
        const msg = JSON.stringify({ action: 'items.update', payload, keys, collection });
        logger.info('update - '+msg);
        dispatch(collection, { action: 'update', payload, keys, collection });
    });
    action('items.delete', ({ payload, collection }) => {
        const msg = JSON.stringify({ action: 'items.delete', payload, collection });
        logger.info('delete - '+ msg);
        dispatch(collection, { action: 'delete', payload, collection });
    });
};
