import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { verifySession } from '.server/session';
import { getBoardById, updateBoard } from '.server/board';
import Header from 'components/Header';
import React, { MouseEventHandler, useEffect, useRef, useState } from 'react';
import { useRevalidator } from '@remix-run/react';
import { useEventSource } from 'remix-utils/sse/react';
import { getBoardItemsByBoardId } from '.server/board_item';
import { board, board_item } from '@prisma/client';
import SpeedDial from 'components/SpeedDial';
import DialItem from 'components/SpeedDial/DialItem';
import BoardItem from 'components/BoardItem';
import { Button, Label, Modal, TextInput } from 'flowbite-react';
import { emitter } from 'services/emitter.server';
import { DEBOUNCE_SETTIMEOUT_LENGTH } from 'constants/';

export const loader = async ({ request, params } : LoaderFunctionArgs) => {
  await verifySession(request);

  try {
    const board = await getBoardById(params.boardId || '');
    if (!board) {
      throw new Error('could not get board');
    }
    const boardItems = await getBoardItemsByBoardId(board.id);
    if (!boardItems) {
      throw new Error('could not get board items');
    }
    return json({ 
      board,
      boardItems,
     });
  } catch (ex) {
    return json({
      board: {
        id: '',
        name: '',
        background_color: '',
        created_by: '',
        updated_at: new Date(),
        created_at: new Date(),
    },
      boardItems: [],
    })
  }
};

export const action = async ({ request } : ActionFunctionArgs) => {
  await verifySession(request);
  switch (request.method.toLowerCase()) {
    case 'put':
      const board = await request.json();
      const updatedBoard = await updateBoard(board);
      if (!updatedBoard) {
        throw new Error('could not update board');
      }
      emitter.emit('boardchange');
      return updatedBoard;
    default:
      throw new Error('unsupported http method');
  }
};

export default function BoardIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const [board, setBoard] = useState(loaderData.board as unknown as board);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [boardColor, setBoardColor] = useState(board?.background_color);
  const [debouncedBoardColor, setDebouncedBoardColor] = useState(boardColor);
  const [boardName, setBoardName] = useState(board.name);
  const revalidator = useRevalidator();
  
  const boardItems = loaderData.boardItems as unknown as board_item[];
  let lastTimeBoardItemsUpdated = useEventSource('/sse', { event: 'boarditemschange'});
  let lastTimeBoardUpdated = useEventSource('/sse', { event: 'boardchange'});

  useEffect(() => {
    setBoard(loaderData.board as unknown as board);
    setBoardColor((loaderData.board as unknown as board).background_color);
    setBoardName((loaderData.board as unknown as board).name);
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
      fetch(`/board/${board.id}`, {
        method: 'put',
        body: JSON.stringify(boardClone),
      });
    }
  }, [debouncedBoardColor]);

  useEffect(() => {
    revalidator.revalidate();
  }, [lastTimeBoardItemsUpdated, lastTimeBoardUpdated]);

  const deleteBoardItem = async (boardItemId : string) => {
    const deleteBoardItemResponse = await fetch(`/board_item/${boardItemId}`, {
      method: 'delete',
    });
    await deleteBoardItemResponse.json();

    const indexToRemove = boardItems.findIndex((boardItem) => boardItem.id === boardItemId);
    if (indexToRemove > -1) {
      boardItems.splice(indexToRemove, 1);
    }
  };

  const createBoardItemOnClick = async () => {
    const createBoardItemResponse = await fetch('/board_item/new', {
      method: 'post',
      body: JSON.stringify({
        boardId: board?.id,
        x: 0,
        y: 0
      })
    });
    const newBoardItem = await createBoardItemResponse.json();
    boardItems.push(newBoardItem);
  };

  const updateBoardItem = async (boardItemId : string, content : string, x : number, y : number, color : string) => {
    const updateBoardItemResponse = await fetch(`/board_item/${boardItemId}`, {
      method: 'put',
      body: JSON.stringify({
        boardItemId,
        content,
        x,
        y,
        color,
      })
    });
    await updateBoardItemResponse.json();
    const itemToUpdate = boardItems.find((boardItem) => boardItem.id === boardItemId);
    if (itemToUpdate) {
      itemToUpdate.content = content;
      itemToUpdate.x = x;
      itemToUpdate.y = y;
    }
  };

  const onSettingsClick = () => {
    setIsSettingsModalOpen(true);
  };

  const onChangeBackgroundColor : React.ReactEventHandler<HTMLInputElement> = (e) => {
    setBoardColor(e.currentTarget.value);
  };

  const onModalSubmitClick : MouseEventHandler<HTMLButtonElement> = async () => {
    setIsSettingsModalOpen(false);
    const boardCopy = {...board};
    boardCopy.name = boardName;
    boardCopy.background_color = debouncedBoardColor;
    const response = await fetch(`/board/${board.id}`, {
      method: 'put',
      body: JSON.stringify(boardCopy),
    });
    if (!response) {
      throw new Error('could not update board');
    }
  };

  return (
    <>
      <Header board={board} onSettingsClick={onSettingsClick} />
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
      <Modal show={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)}>
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
              <Button type="submit" name="submit" value="update board" onClick={onModalSubmitClick}>update board</Button>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
