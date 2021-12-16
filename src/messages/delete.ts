import { outgoingResponse } from '../util';

export async function deleteHandler(ws: WebSocket, message: any, service: any) {
    let result;
    if (message.ids) {
        await service.deleteMany(message.ids);
        result = message.ids;
    } else if (message.id) {
        await service.deleteOne(message.id);
        result = message.id;
    } else {
        throw new Error("Either 'ids' or 'id' is required for a PATCH request");
    }
    ws.send(outgoingResponse(result, message));
}