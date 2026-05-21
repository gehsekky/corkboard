import { EventEmitter } from 'node:events';

export const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export const itemsChannel = (boardId: string) => `board:${boardId}:items`;
export const metaChannel = (boardId: string) => `board:${boardId}:meta`;
