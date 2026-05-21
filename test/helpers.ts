import { randomUUID } from 'node:crypto';
import { prisma } from '../app/.server/db';
import { commitSession, getSession } from '../app/.server/session';

export const createTestUser = async (overrides: { email?: string; name?: string } = {}) => {
  const id = randomUUID();
  return await prisma.user.create({
    data: {
      id,
      email: overrides.email ?? `test-${id}@example.com`,
      name: overrides.name ?? `test user ${id.slice(0, 8)}`,
    },
  });
};

export const createTestBoard = async (createdById: string, opts: { addAsMember?: boolean } = {}) => {
  const id = randomUUID();
  const board = await prisma.board.create({
    data: {
      id,
      name: `test board ${id.slice(0, 8)}`,
      background_color: '#ffffff',
      created_by: createdById,
    },
  });
  if (opts.addAsMember !== false) {
    await prisma.board_user.create({
      data: { board_id: board.id, user_id: createdById },
    });
  }
  return board;
};

export const addBoardMember = async (boardId: string, userId: string) => {
  return await prisma.board_user.create({
    data: { board_id: boardId, user_id: userId },
  });
};

export const createTestBoardItem = async (boardId: string, createdById: string) => {
  return await prisma.board_item.create({
    data: {
      board_id: boardId,
      created_by: createdById,
      content: 'test content',
      background_color: '#fffacd',
      x: 0,
      y: 0,
    },
  });
};

type RequestInit = {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export const buildAuthedRequest = async (userId: string, init: RequestInit = {}) => {
  const session = await getSession();
  session.set('id', userId);
  session.set('name', 'test');
  const cookie = await commitSession(session);
  return buildRawRequest({ ...init, headers: { ...(init.headers ?? {}), Cookie: cookie } });
};

export const buildRawRequest = (init: RequestInit = {}) => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Sec-Fetch-Site')) {
    headers.set('Sec-Fetch-Site', 'same-origin');
  }
  let body: string | undefined;
  if (init.body !== undefined) {
    if (typeof init.body === 'string') {
      body = init.body;
    } else {
      body = JSON.stringify(init.body);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }
  return new Request(init.url ?? 'http://localhost:5174/test', {
    method: init.method ?? 'GET',
    headers,
    body,
  });
};

export const expectResponseStatus = async (fn: () => unknown, status: number) => {
  try {
    await fn();
    throw new Error(`expected throw with status ${status}, but no throw happened`);
  } catch (caught) {
    if (caught instanceof Response) {
      if (caught.status !== status) {
        throw new Error(`expected status ${status}, got ${caught.status}`);
      }
      return caught;
    }
    throw caught;
  }
};
