/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { SubscribeServer } from './websocket';
import { outgoingError, outgoingResponse, parseIncomingMessage } from './message';

// hook wrapper
export default function registerHook({ action }, context) {
    const { services, getSchema, database: knex, logger, env } = context;
    const { ItemsService } = services;
    
    if ( ! env.WEBSOCKET_ENABLED) {
        logger.info("Websocket Subscribe Extension is disabled (set environment variable WEBSOCKET_ENABLED to 'true')");
        return;
    }
    if ( ! env.WEBSOCKET_PUBLIC) {
        logger.info("Websocket Subscribe Extension is set to private, only valid authentication will be accepted. (WEBSOCKET_PUBLIC is 'false')");
    }

    const subscribeServer = new SubscribeServer(context);
    const evtSub = {};

    // hook into server
    action('server.start', subscribeServer.bindExpress);

    async function messageGet(ws, message, schema, accountability) {
        const service = new ItemsService(message.collection, { 
            knex, schema, accountability
        });
        logger.info(`query - ${JSON.stringify(message.query)}`);
        const result = await service.readByQuery(message.query);
        logger.info(`result`);
        ws.send(outgoingResponse(result));
    }
    async function messagePost(ws, message, schema, accountability) {}
    async function messagePatch(ws, message, schema, accountability) {}
    async function messageDelete(ws, message, schema, accountability) {}
    async function messageSubscribe(ws, message, schema, accountability) {
        // check get permissions by requesting one item
        const service = new ItemsService(message.collection, { 
            knex, schema, accountability
        });
        // if not authorized the read should throw an error
        await service.readByQuery({ fields: ['*'], limit: 1 });
        // subscribe to events if all went well
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
        try {
            switch (message.type) {
                case 'GET': return await messageGet(ws, message, schema, req.accountability);
                case 'POST': return await messagePost(ws, message, schema, req.accountability);
                case 'PATCH': return await messagePatch(ws, message, schema, req.accountability);
                case 'DELETE': return await messageDelete(ws, message, schema, req.accountability);
                case 'SUBSCRIBE': return await messageSubscribe(ws, message, schema, req.accountability);
                default: throw new Error('Invalid message type! get, post, patch, delete or subscribe expected');
            }
        } catch (err) {
            ws.send(outgoingError(err));
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
