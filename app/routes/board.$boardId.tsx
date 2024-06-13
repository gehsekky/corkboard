import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { verifySession } from '.server/session';
import { getBoardById, updateBoard } from '.server/board';
import Header from 'components/Header';
import React, { MouseEventHandler, useEffect, useState } from 'react';
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
import { createBoardUser, getBoardUsersByBoardId } from '.server/board_user';

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
    const boardUsers = await getBoardUsersByBoardId(board.id);
    if (!boardUsers) {
      throw new Error('could not get board users');
    }
    return json({ 
      board,
      boardItems,
      boardUsers: boardUsers.map((boardUser) => ({
        id: boardUser.user.id,
        email: boardUser.user.email,
        name: boardUser.user.name,
      })),
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
      boardUsers: [],
    })
  }
};

export const action = async ({ request } : ActionFunctionArgs) => {
  await verifySession(request);
  let updatedBoard;
  switch (request.method.toLowerCase()) {
    case 'post':
      const { board, addBoardUser } = await request.json();
      updatedBoard = await updateBoard(board);
      if (!updatedBoard) {
        throw new Error('could not update board');
      }
      if (addBoardUser) {
        const boardUser = await createBoardUser(board.id, addBoardUser);
        if (!boardUser) {
          throw new Error('could not create board user');
        }
      }
      emitter.emit('boardchange');
      return updatedBoard;
    case 'put':
      const boardToUpdate = await request.json();
      updatedBoard = await updateBoard(boardToUpdate);
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
  const [board, setBoard] = useState(loaderData.board);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [boardColor, setBoardColor] = useState(board?.background_color);
  const [debouncedBoardColor, setDebouncedBoardColor] = useState(boardColor);
  const [boardName, setBoardName] = useState(board.name);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [boardUsers, setBoardUsers] = useState(loaderData.boardUsers);
  const revalidator = useRevalidator();
  
  const boardItems = loaderData.boardItems as unknown as board_item[];
  let lastTimeBoardItemsUpdated = useEventSource('/sse', { event: 'boarditemschange'});
  let lastTimeBoardUpdated = useEventSource('/sse', { event: 'boardchange'});

  useEffect(() => {
    setBoard(loaderData.board);
    setBoardColor(loaderData.board.background_color);
    setBoardName(loaderData.board.name);
    setBoardUsers(loaderData.boardUsers);
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
    setAddUserEmail('');
    const response = await fetch(`/board/${board.id}`, {
      method: 'post',
      body: JSON.stringify({
        board: boardCopy,
        addBoardUser: addUserEmail,
    }),
    });
    if (!response) {
      throw new Error('could not update board');
    }
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
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="addUserEmail" value="add board user" />
                </div>
                <TextInput id="addUserEmail" name="addUserEmail" type="text" value={addUserEmail} onChange={(e) => setAddUserEmail(e.currentTarget.value)} />
              </div>
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
