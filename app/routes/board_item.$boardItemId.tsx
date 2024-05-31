import { ActionFunctionArgs, json } from '@remix-run/node';
import { createBoardItem, deleteBoardItem, updateBoardItem } from '.server/board_item';
import { verifySession } from '.server/session';
import { emitter } from 'services/emitter.server';
import { DEFAULT_BOARD_ITEM_BACKGROUND_COLOR } from 'constants/';

export async function action({ request, params } : ActionFunctionArgs) {
  const session = await verifySession(request);
  const boardItemId = params.boardItemId;
  let userId = session.get('id')?.toString() || '';
  let boardItemData;
  switch (request.method.toLowerCase()) {
    case 'post':
      try {
        boardItemData = await request.json();
        if (!boardItemData) {
          throw new Error('must provide data for creating board item');
        }
        const newBoardItem = await createBoardItem(boardItemData.boardId, userId, boardItemData.x, boardItemData.y, DEFAULT_BOARD_ITEM_BACKGROUND_COLOR);
        emitter.emit('boarditemschange');
        return json(newBoardItem);
      } catch (err) {
        return null;
      }
    case 'delete':
      try {
        await deleteBoardItem(boardItemId || '');
        emitter.emit('boarditemschange');
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    case 'put':
      try {
        boardItemData = await request.json();
        if (!boardItemData) {
          throw new Error('must provide data for creating board item');
        }
        await updateBoardItem(boardItemId || '', boardItemData.content, boardItemData.x, boardItemData.y, boardItemData.color);
        emitter.emit('boarditemschange');
        return null;
      } catch (err) {
        return null;
      }
    default:
      throw new Error('unsupported http method');
  }
}
