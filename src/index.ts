/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Integration with Directus usign a custom hook extension.
 */
import { defineHook } from '@directus/extensions-sdk';
import { getHandler, postHandler, patchHandler, deleteHandler, subscribeHandler } from './handlers';
import { DirectusWebsocketServer } from './server';
import { getConfig } from './config';

export default defineHook(async ({ init, action }, context) => {
    const { logger } = context;
    const config = await getConfig({
        public: false,
        path: '/websocket',
        system: { 
            get: true, post: true, patch: true,
            delete: true, subscribe: true
        }
    }, context);
    const wsServer = new DirectusWebsocketServer(config, context);

    if ( ! config.public) {
        logger.debug('Websocket Subscribe Extension is set to private, only valid keys will be accepted.');
    }

    // connect message handlers
    wsServer.register(getHandler);
    wsServer.register(postHandler);
    wsServer.register(patchHandler);
    wsServer.register(deleteHandler);
    const subscription = wsServer.register(subscribeHandler);
    
    // hook into server start events
    Promise.all([
        new Promise(r => init('app.after', ({ app }) => r(app))),
        new Promise(r => action('server.start', ({ server }) => r(server))),
    ]).then(([app, server]) => wsServer.hookServer(app, server));

    // hook into item manipulation actions
    action('items.create', ({ payload, key, collection }) => {
        const msg = JSON.stringify({ action: 'items.create', payload, key, collection });
        logger.debug('[ WS ] event create - ' + msg);
        subscription.dispatch(collection, { action: 'create', payload, key, collection });
    });
    action('items.update', ({ payload, keys, collection }) => {
        const msg = JSON.stringify({ action: 'items.update', payload, keys, collection });
        logger.info('[ WS ] event update - '+msg);
        subscription.dispatch(collection, { action: 'update', payload, keys, collection });
    });
    action('items.delete', ({ payload, collection }) => {
        const msg = JSON.stringify({ action: 'items.delete', payload, collection });
        logger.info('[ WS ] event delete - '+ msg);
        subscription.dispatch(collection, { action: 'delete', payload, collection });
    });
});
