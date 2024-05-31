import { LoaderFunctionArgs } from '@remix-run/node';
import { eventStream } from 'remix-utils/sse/server';
import { emitter } from 'services/emitter.server';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  return eventStream(request.signal, (send) => {
    const handleBoardItemsChange = () => {
      send({ event: 'boarditemschange', data: new Date().toISOString(), });
    };
    const handleBoardChange = () => {
      send({ event: 'boardchange', data: new Date().toISOString(), });
    }

    emitter.on('boarditemschange', handleBoardItemsChange);
    emitter.on('boardchange', handleBoardChange);

    return () => {
      emitter.off('boarditemschange', handleBoardItemsChange);
      emitter.off('boardchange', handleBoardChange);
    };
  });
};
