import { outgoingResponse } from '../util';

export async function postHandler(ws: WebSocket, message: any, service: any) {
    let result;
    if (Array.isArray(message.data)) {
        const keys = await service.createMany(message.data);
        result = await service.readMany(keys, message.query || {})
    } else {
        const key = await service.createOne(message.data);
        result = await service.readOne(key, message.query || {});
    }
    ws.send(outgoingResponse(result, message));
}