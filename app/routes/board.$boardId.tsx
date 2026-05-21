import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { verifySession } from '.server/session';
import { assertBoardMember } from '.server/authz';
import { getBoardWithItemsAndUsers, updateBoard } from '.server/board';
import Header from 'components/Header';
import React, { MouseEventHandler, useEffect, useState } from 'react';
import { useRevalidator } from '@remix-run/react';
import { useEventSource } from 'remix-utils/sse/react';
import { board, board_item } from '@prisma/client';
import SpeedDial from 'components/SpeedDial';
import DialItem from 'components/SpeedDial/DialItem';
import BoardItem from 'components/BoardItem';
import { Button, Label, Modal, TextInput } from 'flowbite-react';
import { emitter, metaChannel } from 'services/emitter.server';
import { DEBOUNCE_SETTIMEOUT_LENGTH } from 'constants/';
import { createInvite } from '.server/invite';
import { boardUpsertWithInviteSchema, boardUpdateSchema, parseJson } from '.server/validate';
import { recordAudit } from '.server/audit';

const jsonFetch = (url: string, method: string, body?: unknown) => fetch(url, {
  method,
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

export const loader = async ({ request, params } : LoaderFunctionArgs) => {
  const { session, headers } = await verifySession(request);
  const userId = session.get('id') || '';
  const boardId = params.boardId;
  if (!boardId) {
    throw new Response(null, { status: 404 });
  }
  await assertBoardMember(userId, boardId);

  const full = await getBoardWithItemsAndUsers(boardId);
  if (!full) {
    throw new Response(null, { status: 404 });
  }
  const { board_item: boardItems, board_user: boardUsers, ...board } = full;
  return json({
    board,
    boardItems,
    boardUsers: boardUsers.map((bu) => ({
      id: bu.user.id,
      email: bu.user.email,
      name: bu.user.name,
    })),
  }, { headers });
};

export const action = async ({ request, params } : ActionFunctionArgs) => {
  const { session, headers } = await verifySession(request);
  const userId = session.get('id') || '';
  const boardId = params.boardId;
  if (!boardId) {
    throw new Response(null, { status: 404 });
  }
  await assertBoardMember(userId, boardId);

  let updatedBoard;
  switch (request.method.toLowerCase()) {
    case 'post': {
      const { board, addBoardUser } = await parseJson(request, boardUpsertWithInviteSchema);
      updatedBoard = await updateBoard(boardId, board);
      if (!updatedBoard) {
        throw new Error('could not update board');
      }
      await recordAudit({ boardId, actorUserId: userId, action: 'board.updated', details: { name: board.name, background_color: board.background_color } });
      let inviteUrl: string | null = null;
      if (addBoardUser) {
        const invite = await createInvite(boardId, userId, addBoardUser);
        const base = (process.env.AUTH_CALLBACK_BASE_URL || '').replace(/\/$/, '');
        inviteUrl = `${base}/invite/${invite.token}`;
      }
      emitter.emit(metaChannel(boardId));
      return json({ board: updatedBoard, inviteUrl }, { headers });
    }
    case 'put': {
      const data = await parseJson(request, boardUpdateSchema);
      updatedBoard = await updateBoard(boardId, data);
      if (!updatedBoard) {
        throw new Error('could not update board');
      }
      await recordAudit({ boardId, actorUserId: userId, action: 'board.updated', details: { name: data.name, background_color: data.background_color } });
      emitter.emit(metaChannel(boardId));
      return json(updatedBoard, { headers });
    }
    default:
      throw new Response('unsupported method', { status: 405 });
  }
};

export default function BoardIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const [board, setBoard] = useState(loaderData.board);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [boardColor, setBoardColor] = useState(board?.background_color);
  const [debouncedBoardColor, setDebouncedBoardColor] = useState(boardColor);
  const [boardName, setBoardName] = useState(board.name);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [boardUsers, setBoardUsers] = useState(loaderData.boardUsers);
  const [boardItems, setBoardItems] = useState(loaderData.boardItems as unknown as board_item[]);
  const revalidator = useRevalidator();

  const sseUrl = `/sse?boardId=${board.id}`;
  const itemsEvent = useEventSource(sseUrl, { event: 'items' });
  const metaEvent = useEventSource(sseUrl, { event: 'meta' });

  useEffect(() => {
    setBoard(loaderData.board);
    setBoardColor(loaderData.board.background_color);
    setBoardName(loaderData.board.name);
    setBoardUsers(loaderData.boardUsers);
    setBoardItems(loaderData.boardItems as unknown as board_item[]);
  }, [loaderData]);

  // update on color change
  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setDebouncedBoardColor(boardColor);
    }, DEBOUNCE_SETTIMEOUT_LENGTH);
    return () => clearTimeout(delayInputTimeoutId);
  }, [boardColor]);

  useEffect(() => {
    if (board && board.background_color !== debouncedBoardColor) {
      const boardClone = JSON.parse(JSON.stringify(board));
      boardClone.background_color = debouncedBoardColor;
      setBoard && setBoard(boardClone);
      jsonFetch(`/board/${board.id}`, 'put', boardClone);
    }
  }, [debouncedBoardColor]);

  useEffect(() => {
    if (!itemsEvent) return;
    let parsed: { type?: string; item?: board_item; itemId?: string };
    try {
      parsed = JSON.parse(itemsEvent);
    } catch {
      return;
    }
    if (parsed.type === 'item.created' && parsed.item) {
      const item = parsed.item;
      setBoardItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
    } else if (parsed.type === 'item.updated' && parsed.item) {
      const item = parsed.item;
      setBoardItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    } else if (parsed.type === 'item.deleted' && parsed.itemId) {
      const itemId = parsed.itemId;
      setBoardItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  }, [itemsEvent]);

  useEffect(() => {
    if (!metaEvent) return;
    revalidator.revalidate();
  }, [metaEvent]);

  const deleteBoardItem = async (boardItemId : string) => {
    setBoardItems((prev) => prev.filter((i) => i.id !== boardItemId));
    await jsonFetch(`/board_item/${boardItemId}`, 'delete');
  };

  const createBoardItemOnClick = async () => {
    const createBoardItemResponse = await jsonFetch('/board_item/new', 'post', {
      boardId: board?.id,
      x: 0,
      y: 0,
    });
    const newBoardItem = await createBoardItemResponse.json();
    setBoardItems((prev) => (prev.some((i) => i.id === newBoardItem.id) ? prev : [...prev, newBoardItem]));
  };

  const updateBoardItem = async (boardItemId : string, content : string, x : number, y : number, color : string) => {
    setBoardItems((prev) => prev.map((i) => (i.id === boardItemId ? {
      ...i,
      content: content ?? i.content,
      x: x ?? i.x,
      y: y ?? i.y,
      background_color: color ?? i.background_color,
    } : i)));
    await jsonFetch(`/board_item/${boardItemId}`, 'put', {
      boardItemId,
      content,
      x,
      y,
      color,
    });
  };

  const onSettingsClick = () => {
    setIsSettingsModalOpen(true);
  };

  const onChangeBackgroundColor : React.ReactEventHandler<HTMLInputElement> = (e) => {
    setBoardColor(e.currentTarget.value);
  };

  const onModalSubmitClick : MouseEventHandler<HTMLButtonElement> = async () => {
    const boardCopy = {...board};
    boardCopy.name = boardName;
    boardCopy.background_color = debouncedBoardColor;
    const submittedEmail = addUserEmail;
    setAddUserEmail('');
    const response = await jsonFetch(`/board/${board.id}`, 'post', {
      board: boardCopy,
      addBoardUser: submittedEmail,
    });
    if (!response.ok) {
      throw new Error('could not update board');
    }
    const result = await response.json();
    if (result?.inviteUrl) {
      setInviteUrl(result.inviteUrl);
    } else {
      setIsSettingsModalOpen(false);
    }
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
    setInviteUrl(null);
  };

  return (
    <>
      <Header board={board as unknown as board} onSettingsClick={onSettingsClick} />
      <div className="h-[calc(100vh-3rem)] w-full">
        <div className="h-full w-full">
          <div className="w-full h-full" style={{ backgroundColor: board.background_color }}>
            {boardItems.map((boardItem) => <BoardItem key={boardItem.id} boardItem={boardItem} onDelete={deleteBoardItem} onUpdate={updateBoardItem} />)}
            <SpeedDial>
              <DialItem label="sticky" svg={
                <svg className="w-5 h-5 mx-auto" viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path fillRule="evenodd" d="M2.5 1A1.5 1.5 0 001 2.5v15A1.5 1.5 0 002.5 19h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0017.5 1h-15zM9 9a1 1 0 012 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V9zM7 5V3h10v2H7zM3 3v2h2V3H3z" />
                </svg>
              } onClick={createBoardItemOnClick} />
            </SpeedDial>
          </div>
        </div>
      </div>
      <Modal show={isSettingsModalOpen} onClose={closeSettingsModal}>
        <Modal.Header>board settings</Modal.Header>
        <Modal.Body>
          <div className="mx-auto">
            <Form className="flex flex-col gap-4">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="boardName" value="board name" />
                </div>
                <TextInput id="boardName" name="boardName" type="text" value={boardName} required onChange={(e) => setBoardName(e.currentTarget.value)} />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="boardColor" value="board background color" />
                </div>
                <input id="boardColor" name="boardColor" type="color" required className="h-8 w-8" value={boardColor} onChange={onChangeBackgroundColor} />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="addUserEmail" value="invite a user by email (generates a link to share)" />
                </div>
                <TextInput id="addUserEmail" name="addUserEmail" type="email" placeholder="teammate@example.com" value={addUserEmail} onChange={(e) => setAddUserEmail(e.currentTarget.value)} />
              </div>
              {inviteUrl ? (
                <div>
                  <Label value="share this invite link (valid 7 days):" />
                  <TextInput readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
                </div>
              ) : null}
              <div>
                <div className="mb-2 block">
                  <Label value="current board users" />
                </div>
                <ul>
                  {
                    boardUsers.map((boardUser) => (
                      <li key={boardUser.id}>{boardUser.name}</li>
                    ))
                  }
                </ul>
              </div>
              <Button type="submit" name="submit" value="update board" onClick={onModalSubmitClick}>update board</Button>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
