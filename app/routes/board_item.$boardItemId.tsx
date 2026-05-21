import { ActionFunctionArgs, json } from '@remix-run/node';
import { createBoardItem, deleteBoardItem, updateBoardItem } from '.server/board_item';
import { verifySession } from '.server/session';
import { assertBoardItemAccess, assertBoardMember } from '.server/authz';
import { boardItemCreateSchema, boardItemUpdateSchema, parseJson } from '.server/validate';
import { limitByUser } from '.server/rate-limit';
import { emitter, itemsChannel } from 'services/emitter.server';
import { DEFAULT_BOARD_ITEM_BACKGROUND_COLOR } from 'constants/';

export async function action({ request, params } : ActionFunctionArgs) {
  const { session, headers } = await verifySession(request);
  const userId = session.get('id')?.toString() || '';
  limitByUser(userId, 'board-item-mutate', { limit: 120, windowSeconds: 60 });
  const boardItemId = params.boardItemId;
  switch (request.method.toLowerCase()) {
    case 'post': {
      const body = await parseJson(request, boardItemCreateSchema);
      await assertBoardMember(userId, body.boardId);
      try {
        const newBoardItem = await createBoardItem(
          body.boardId,
          userId,
          body.x,
          body.y,
          DEFAULT_BOARD_ITEM_BACKGROUND_COLOR,
        );
        emitter.emit(itemsChannel(body.boardId), { type: 'item.created', item: newBoardItem });
        return json(newBoardItem, { headers });
      } catch (err) {
        console.error(err);
        return json(null, { headers });
      }
    }
    case 'delete': {
      if (!boardItemId || boardItemId === 'new') {
        throw new Response(null, { status: 404 });
      }
      const itemBoardId = await assertBoardItemAccess(userId, boardItemId);
      try {
        await deleteBoardItem(boardItemId);
        emitter.emit(itemsChannel(itemBoardId), { type: 'item.deleted', itemId: boardItemId });
        return json(null, { headers });
      } catch (err) {
        console.error(err);
        return json(null, { headers });
      }
    }
    case 'put': {
      if (!boardItemId || boardItemId === 'new') {
        throw new Response(null, { status: 404 });
      }
      const itemBoardId = await assertBoardItemAccess(userId, boardItemId);
      const body = await parseJson(request, boardItemUpdateSchema);
      try {
        const updated = await updateBoardItem(
          boardItemId,
          body.content ?? null,
          body.x ?? null,
          body.y ?? null,
          body.color ?? null,
        );
        emitter.emit(itemsChannel(itemBoardId), { type: 'item.updated', item: updated });
        return json(null, { headers });
      } catch (err) {
        console.error(err);
        return json(null, { headers });
      }
    }
    default:
      throw new Response('unsupported method', { status: 405 });
  }
}
