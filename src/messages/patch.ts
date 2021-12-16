import { outgoingResponse } from '../util';

export async function patchHandler(ws: WebSocket, message: any, service: any) {
    let result;
    if (message.ids) {
        const keys = await service.updateMany(message.ids, message.data);
        result = await service.readMany(keys, message.query);
    } else if (message.id) {
        const key = await service.updateOne(message.id, message.data);
        result = await service.readOne(result);
    } else {
        throw new Error("Either 'ids' or 'id' is required for a PATCH request");
    }
    ws.send(outgoingResponse(result, message));
}