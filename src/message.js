/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Helper functions for dealing with incoming messages
 */

function parseGlobalParameters(message) {
    let query = {};
    if (typeof message.query === "object" && !Array.isArray(message.query)) {
        const queryProps = [ 'fields', 'sort', 'filter', 'limit', 'offset', 'page', 'search', 'group', 'aggregate', 'deep', 'alias' ];
        queryProps.forEach((prop) => {
            if ( !! message.query[prop]) {
                query[prop] = message.query[prop];
            }
        });
    }
    return query;
}

// parse incoming message
export function parseIncomingMessage(msg, schema) {
    const req = JSON.parse(msg.data);
    const type = (req.type || 'fetch').trim().toUpperCase();
    const collection = (req.collection || '').trim().toLowerCase();
    const uid = req.uid || false;
    if (typeof collection !== "string" || collection.length === 0) {
        throw new Error('Collection is required');
    }
    if ( ! schema.collections[collection]) {
        throw new Error('Collection does not exist in schema');
    }
    const query = parseGlobalParameters(req);
    switch (type) {
        case 'GET': return { type, collection, query, uid };
        case 'POST': 
        case 'PATCH':
            return { type, collection, data: req.data, uid };
        case 'DELETE':
        case 'SUBSCRIBE': 
            return { type, collection, id: req.id || false, ids: req.ids || [] };
        default: throw new Error('Invalid message type! get, post, patch, delete or subscribe expected');
    }
}

export function outgoingResponse(data, message) {
    const msg = { type: 'RESPONSE', data };
    if (message.uid) msg.uid = message.uid;
    return JSON.stringify(msg);
}

export function outgoingError(data, message) {
    const msg = { type: 'ERROR', data };
    if (message.uid) msg.uid = message.uid;
    return JSON.stringify(msg);
}