import { LoaderFunctionArgs } from '@remix-run/node';
import { eventStream } from 'remix-utils/sse/server';
import { emitter, itemsChannel, metaChannel } from 'services/emitter.server';
import { verifySession } from '.server/session';
import { assertBoardMember } from '.server/authz';
import { limitByIp } from '.server/rate-limit';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  limitByIp(request, 'sse-subscribe', { limit: 30, windowSeconds: 60 });
  const { session, headers } = await verifySession(request);
  const userId = session.get('id') || '';
  const boardId = new URL(request.url).searchParams.get('boardId');
  if (!boardId) {
    throw new Response('boardId required', { status: 400 });
  }
  await assertBoardMember(userId, boardId);

  const itemsEvent = itemsChannel(boardId);
  const metaEvent = metaChannel(boardId);

  return eventStream(request.signal, (send) => {
    const handleItems = (payload: unknown) => send({ event: 'items', data: JSON.stringify(payload ?? {}) });
    const handleMeta = (payload: unknown) => send({ event: 'meta', data: JSON.stringify(payload ?? {}) });

    emitter.on(itemsEvent, handleItems);
    emitter.on(metaEvent, handleMeta);

    return () => {
      emitter.off(itemsEvent, handleItems);
      emitter.off(metaEvent, handleMeta);
    };
  }, { headers });
};
