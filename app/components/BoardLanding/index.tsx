import SpeedDial from 'components/SpeedDial';
import DialItem from 'components/SpeedDial/DialItem';
import BoardItem from 'components/BoardItem';
import React, { useContext, useState } from 'react';
import { BoardContext, SessionContext } from 'context';
import { board_item } from '@prisma/client';
import { isbotMatches } from 'isbot';

type BoardLandingProps = {

} & React.HTMLAttributes<HTMLElement>;

const BoardLanding = ({} : BoardLandingProps) => {
  const boardContext = useContext(BoardContext);
  const [boardItems, setBoardItems] = useState<board_item[]>(boardContext?.board?.board_item || []);

  const cloneBoardItems = () => boardItems.map((item) => ({...item}));

  const deleteBoardItem = async (boardItemId : string) => {
    const deleteBoardItemResponse = await fetch(`/board_item/${boardItemId}`, {
      method: 'delete',
    });
    await deleteBoardItemResponse.json();

    const boardItemsClone = cloneBoardItems();
    const indexToRemove = boardItemsClone.findIndex((boardItem) => boardItem.id === boardItemId);
    if (indexToRemove > -1) {
      boardItemsClone.splice(indexToRemove, 1);
      setBoardItems(boardItemsClone);
    }
  };

  const createBoardItemOnClick = async () => {
    const createBoardItemResponse = await fetch('/board_item/new', {
      method: 'post',
      body: JSON.stringify({
        boardId: boardContext?.board?.id,
        x: 0,
        y: 0
      })
    });
    const newBoardItem = await createBoardItemResponse.json();
    const boardItemsClone = cloneBoardItems();
    boardItemsClone.push(newBoardItem);
    setBoardItems(boardItemsClone);
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
    const boardItemsClone = cloneBoardItems();
    const itemToUpdate = boardItemsClone.find((boardItem) => boardItem.id === boardItemId);
    if (itemToUpdate) {
      itemToUpdate.content = content;
      itemToUpdate.x = x;
      itemToUpdate.y = y;
      setBoardItems(boardItemsClone);
    }
  };

  return (
    <div className="w-full h-full" style={{ backgroundColor: boardContext?.board?.background_color || '#ffffff' }}>
      {boardItems.map((boardItem) => <BoardItem key={boardItem.id} boardItem={boardItem} onDelete={deleteBoardItem} onUpdate={updateBoardItem} />)}
      <SpeedDial>
        <DialItem label="sticky" svg={
          <svg className="w-5 h-5 mx-auto" viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path fillRule="evenodd" d="M2.5 1A1.5 1.5 0 001 2.5v15A1.5 1.5 0 002.5 19h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0017.5 1h-15zM9 9a1 1 0 012 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V9zM7 5V3h10v2H7zM3 3v2h2V3H3z" />
          </svg>
        } onClick={createBoardItemOnClick} />
      </SpeedDial>
    </div>
  );
};

export default BoardLanding;
