/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Manages server configuration.
 */
import { ApiExtensionContext } from '@directus/shared/types';
import { DirectusWebsocketConfig } from './types';

export async function getConfig(
    defaultWebsocketConfig: DirectusWebsocketConfig,
    { emitter, logger, env }: ApiExtensionContext
): Promise<DirectusWebsocketConfig> {
    let config: DirectusWebsocketConfig = await emitter.emitFilter('websocket.config', defaultWebsocketConfig);
    logger.debug('[ WS ] added extension config overrides - ' + JSON.stringify(config));
    if ('WEBSOCKET_PUBLIC' in env) config.public = !!env.WEBSOCKET_PUBLIC;
    if ('WEBSOCKET_PATH' in env) config.path = env.WEBSOCKET_PATH;
    if ('WEBSOCKET_SYSTEM' in env) config.system = !!env.WEBSOCKET_SYSTEM;
    if ('WEBSOCKET_CORE' in env && ! env.WEBSOCKET_CORE) {
        config.core = false;
    } else {
        if ('WEBSOCKET_CORE_GET' in env) {
            if ( ! config.core) config.core = {};
            config.core.get = !!env.WEBSOCKET_SYSTEM_GET;
        }
        if ('WEBSOCKET_CORE_POST' in env) {
            if ( ! config.core) config.core = {};
            config.core.post = !!env.WEBSOCKET_SYSTEM_POST;
        }
        if ('WEBSOCKET_CORE_PATCH' in env) {
            if ( ! config.core) config.core = {};
            config.core.patch = !!env.WEBSOCKET_SYSTEM_PATCH;
        }
        if ('WEBSOCKET_CORE_DELETE' in env) {
            if ( ! config.core) config.core = {};
            config.core.delete = !!env.WEBSOCKET_SYSTEM_DELETE;
        }
        if ('WEBSOCKET_CORE_SUBSCRIBE' in env) {
            if ( ! config.core) config.core = {};
            config.core.subscribe = !!env.WEBSOCKET_SYSTEM_SUBSCRIBE;
        }
    }
    logger.debug('[ WS ] added environment config - ' + JSON.stringify(config));
    return config;
}