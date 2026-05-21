import { describe, it, expect } from 'vitest';
import { loader as boardLoader, action as boardAction } from '../app/routes/board.$boardId';
import { action as boardItemAction } from '../app/routes/board_item.$boardItemId';
import { loader as sseLoader } from '../app/routes/sse';
import {
  addBoardMember,
  buildAuthedRequest,
  createTestBoard,
  createTestBoardItem,
  createTestUser,
  expectResponseStatus,
} from './helpers';

const callLoader = async (loader: any, request: Request, params: Record<string, string>) => {
  return await loader({ request, params, context: {} });
};

const callAction = callLoader;

describe('authorization', () => {
  it('non-member cannot read another board', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const board = await createTestBoard(owner.id);

    const request = await buildAuthedRequest(stranger.id, {
      url: `http://localhost:5174/board/${board.id}`,
    });
    await expectResponseStatus(() => callLoader(boardLoader, request, { boardId: board.id }), 404);
  });

  it('member can read their board', async () => {
    const owner = await createTestUser();
    const board = await createTestBoard(owner.id);

    const request = await buildAuthedRequest(owner.id, {
      url: `http://localhost:5174/board/${board.id}`,
    });
    const response: any = await callLoader(boardLoader, request, { boardId: board.id });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.board.id).toBe(board.id);
  });

  it('non-member cannot POST update to a board', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const board = await createTestBoard(owner.id);

    const request = await buildAuthedRequest(stranger.id, {
      method: 'POST',
      url: `http://localhost:5174/board/${board.id}`,
      body: { board: { name: 'hijacked', background_color: '#000000' } },
    });
    await expectResponseStatus(() => callAction(boardAction, request, { boardId: board.id }), 404);
  });

  it('body-supplied board.id cannot override URL params.boardId', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const boardA = await createTestBoard(userA.id);
    const boardB = await createTestBoard(userB.id);

    // userA is a member of boardA but NOT boardB. Try to update boardB by smuggling its id in the body.
    const request = await buildAuthedRequest(userA.id, {
      method: 'POST',
      url: `http://localhost:5174/board/${boardA.id}`,
      body: { board: { id: boardB.id, name: 'tampered', background_color: '#ff0000' } },
    });
    const response: any = await callAction(boardAction, request, { boardId: boardA.id });
    expect(response.status).toBe(200);

    // boardB must be unchanged.
    const { prisma } = await import('../app/.server/db');
    const checkB = await prisma.board.findUnique({ where: { id: boardB.id } });
    expect(checkB?.name).not.toBe('tampered');
    // boardA was updated as intended.
    const checkA = await prisma.board.findUnique({ where: { id: boardA.id } });
    expect(checkA?.name).toBe('tampered');
  });

  it('non-member cannot create board items on another board', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const board = await createTestBoard(owner.id);

    const request = await buildAuthedRequest(stranger.id, {
      method: 'POST',
      url: 'http://localhost:5174/board_item/new',
      body: { boardId: board.id, x: 10, y: 10 },
    });
    await expectResponseStatus(() => callAction(boardItemAction, request, { boardItemId: 'new' }), 404);
  });

  it('non-member cannot update another board\'s item', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const board = await createTestBoard(owner.id);
    const item = await createTestBoardItem(board.id, owner.id);

    const request = await buildAuthedRequest(stranger.id, {
      method: 'PUT',
      url: `http://localhost:5174/board_item/${item.id}`,
      body: { content: 'hijacked', x: 99, y: 99, color: '#ff0000' },
    });
    await expectResponseStatus(() => callAction(boardItemAction, request, { boardItemId: item.id }), 404);
  });

  it('removed member loses access immediately', async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const board = await createTestBoard(owner.id);
    await addBoardMember(board.id, member.id);

    // member can read first
    const req1 = await buildAuthedRequest(member.id, { url: `http://localhost:5174/board/${board.id}` });
    const r1: any = await callLoader(boardLoader, req1, { boardId: board.id });
    expect(r1.status).toBe(200);

    // soft-delete the membership
    const { prisma } = await import('../app/.server/db');
    await prisma.board_user.update({
      where: { user_id_board_id: { user_id: member.id, board_id: board.id } },
      data: { is_deleted: true },
    });

    // member can no longer read
    const req2 = await buildAuthedRequest(member.id, { url: `http://localhost:5174/board/${board.id}` });
    await expectResponseStatus(() => callLoader(boardLoader, req2, { boardId: board.id }), 404);
  });

  it('non-member cannot subscribe to a board\'s SSE channel', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const board = await createTestBoard(owner.id);

    const request = await buildAuthedRequest(stranger.id, {
      url: `http://localhost:5174/sse?boardId=${board.id}`,
    });
    await expectResponseStatus(() => callLoader(sseLoader, request, {}), 404);
  });

  it('unauthenticated request to board redirects to login', async () => {
    const owner = await createTestUser();
    const board = await createTestBoard(owner.id);
    const request = new Request(`http://localhost:5174/board/${board.id}`);
    const response = await expectResponseStatus(() => callLoader(boardLoader, request, { boardId: board.id }), 302);
    expect(response.headers.get('Location')).toBe('/login');
  });

  it('cross-site mutation is rejected', async () => {
    const owner = await createTestUser();
    const board = await createTestBoard(owner.id);

    const request = await buildAuthedRequest(owner.id, {
      method: 'POST',
      url: `http://localhost:5174/board/${board.id}`,
      body: { board: { name: 'x', background_color: '#000000' } },
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    await expectResponseStatus(() => callAction(boardAction, request, { boardId: board.id }), 403);
  });
});
