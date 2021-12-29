/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */
import { defineHook } from '@directus/extensions-sdk';
import { DeleteHandler, GetHandler, PatchHandler, PostHandler } from './messages';
import { DirectusWebsocketServer } from './server';
import { getConfig } from './config';
import { SubscribeHandler } from './messages/subscribe';

export default defineHook(async ({ init, action }, context) => {
    const { logger, env } = context;
    const config = await getConfig(context);
    const wsServer = new DirectusWebsocketServer(config, context);

    if ( ! config.public) {
        logger.debug('Websocket Subscribe Extension is set to private, only valid keys will be accepted.');
    }

    // connect message handlers
    wsServer.register(GetHandler);
    wsServer.register(PostHandler);
    wsServer.register(PatchHandler);
    wsServer.register(DeleteHandler);
    const subscribeHandler = wsServer.register(SubscribeHandler) as SubscribeHandler;

    // hook into server
    init('app.after', ({ app }) => {
        wsServer.app = app;
    });
    action('server.start', ({ server }) => {
        logger.info(`Websocket listening on ws://localhost:${env.PORT}${config.path}`);
        server.on('upgrade', (request: any, socket: any, head: any) => {
            wsServer.upgradeRequest(request, socket, head);
        });
    });

    // hook into item manipulation actions
    action('items.create', ({ payload, key, collection }) => {
        const msg = JSON.stringify({ action: 'items.create', payload, key, collection });
        logger.info('create - ' + msg);
        subscribeHandler.dispatch(collection, { action: 'create', payload, key, collection });
    });
    action('items.update', ({ payload, keys, collection }) => {
        const msg = JSON.stringify({ action: 'items.update', payload, keys, collection });
        logger.info('update - '+msg);
        subscribeHandler.dispatch(collection, { action: 'update', payload, keys, collection });
    });
    action('items.delete', ({ payload, collection }) => {
        const msg = JSON.stringify({ action: 'items.delete', payload, collection });
        logger.info('delete - '+ msg);
        subscribeHandler.dispatch(collection, { action: 'delete', payload, collection });
    });
});
