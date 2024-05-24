import { ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { createBoard } from '.server/board';
import { createBoardItem, deleteBoardItem, updateBoardItem } from '.server/board_item';
import { getSession } from '.server/session';

export async function action({ request, params } : ActionFunctionArgs) {
  const boardItemId = params.boardItemId;
  const session = await getSession(request.headers.get('Cookie'));
  let userId = '';
  if (session.has('id')) {
    userId = session.get('id')?.toString() || '';
  }
  let boardItemData;
  switch (request.method.toLowerCase()) {
    case 'post':
      boardItemData = await request.json();
      if (!boardItemData) {
        throw new Error('must provide data for creating board item');
      }
      const newBoardItem = await createBoardItem(boardItemData.boardId, boardItemData.userId, boardItemData.x, boardItemData.y, '#ffffff');
      return json(newBoardItem);
    case 'delete':
      await deleteBoardItem(boardItemId || '');
      return null;
    case 'put':
      boardItemData = await request.json();
      if (!boardItemData) {
        throw new Error('must provide data for creating board item');
      }
      await updateBoardItem(boardItemId || '', boardItemData.content, boardItemData.x, boardItemData.y, boardItemData.color);
      return null;
    default:
      throw new Error('unsupported http method');
  }
}
