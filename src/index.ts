/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { defineHook } from '@directus/extensions-sdk';
import { SubscribeServer } from './server';
import { outgoingError, parseIncomingMessage } from './util';
import { getHandler, patchHandler, postHandler, deleteHandler } from './messages';

export default defineHook(({ init, action }, context) => {
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
    const evtSub: { [collection: string]: Array<{ id: string | null, socket: WebSocket }> } = {};

    // hook into server
    init('app.after', subscribeServer.bindApp);
    action('server.start', subscribeServer.bindExpress);

    async function messageSubscribe(ws: WebSocket, message: any, service: any) {
        // if not authorized the read should throw an error
        await service.readByQuery({ fields: ['*'], limit: 1 });
        // subscribe to events if all went well
        subscribe(message.collection, message.id, ws);
        logger.info(`subscribed - ${message.collection} #${message.id}`);
    }

    // message handler
    async function onMessage({ ws, req, msg }: any) {
        const schema = await getSchema();
        let message;
        try {
            message = parseIncomingMessage(msg, schema);
            logger.info(`message - ${JSON.stringify(message)}`);
        } catch (err) {
            return logger.error(err);
        }
        try {
            const service = new ItemsService(message.collection, { 
                knex, schema, accountability: req.accountability
            });
            switch (message.type) {
                case 'GET': return await getHandler(ws, message, service);
                case 'POST': return await postHandler(ws, message, service);
                case 'PATCH': return await patchHandler(ws, message, service);
                case 'DELETE': return await deleteHandler(ws, message, service);
                case 'SUBSCRIBE': return await messageSubscribe(ws, message, service);
                default: throw new Error('Invalid message type! get, post, patch, delete or subscribe expected');
            }
        } catch (err) {
            ws.send(outgoingError(err, message));
        }
    }

    function subscribe(collection: string, id: string, socket: WebSocket) {
        if ( ! evtSub[collection]) {
            evtSub[collection] = [];
        }
        evtSub[collection]!.push({ id, socket });
    }
    function unsubscribe(socket: WebSocket) {
        for (const key of Object.keys(evtSub)) {
			const sub = evtSub[key] || [];
			for (let i = sub.length - 1; i >= 0; i--) {
				if (sub[i]?.socket === socket) {
					evtSub[key]!.splice(i, 1);
				}
			}
		}
    }

    // client events
    subscribeServer.on('connect', () => {
		logger.info(`client connected`);
    });
    subscribeServer.on('message', onMessage);
    subscribeServer.on('error', ({ ws }: any) => {
        logger.info(`client errored`);
        unsubscribe(ws);
    });
    subscribeServer.on('close', ({ ws }: any) => {
        logger.info(`client left`);
        unsubscribe(ws);
    });

    // dispatch event
    function dispatch(collection: string, msg: any) {
        (evtSub[collection] || []).forEach(({ socket }) => {    
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
});
