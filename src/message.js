/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
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

function parsePost(type, collection, message) {

}

function parsePatch(type, collection, message) {

}

function parseDelete(type, collection, message) {

}

function parseSubscribe(type, collection, message) {
    const id = message.id || false;
    return { type, collection, id };
}

// parse incoming message
export function parseIncomingMessage(msg, schema) {
    const req = JSON.parse(msg.data);
    const type = (req.type || 'fetch').trim().toUpperCase();
    const collection = (req.collection || '').trim().toLowerCase();
    if (typeof collection !== "string" || collection.length === 0) {
        throw new Error('Collection is required');
    }
    if ( ! schema.collections[collection]) {
        throw new Error('Collection does not exist in schema');
    }
    const query = parseGlobalParameters(req);
    switch (type) {
        case 'GET': return { type, collection, query };
        case 'POST': return parsePost(type, collection, req);
        case 'PATCH': return parsePatch(type, collection, req);
        case 'DELETE': return parseDelete(type, collection, req);
        case 'SUBSCRIBE': return parseSubscribe(type, collection, req);
        default: throw new Error('Invalid message type! get, post, patch, delete or subscribe expected');
    }
}

export function outgoingResponse(data) {
    return JSON.stringify({
        type: 'RESPONSE',
        data
    });
}