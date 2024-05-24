import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { board_item } from '@prisma/client';
import closeImg from 'public/img/close.svg';
import hamburgerImg from 'public/img/hamburger.svg';
import Draggable, { DraggableData, DraggableEvent, DraggableEventHandler } from 'react-draggable';
import { DEBOUNCE_SETTIMEOUT_LENGTH } from 'constants/';

type BoardItemProps = {
  boardItem? : board_item;
  onDelete : Function;
  onUpdate : Function;
} & React.HTMLAttributes<HTMLElement>;

const BoardItem = ({ boardItem, onDelete, onUpdate } : BoardItemProps) => {
  const [boardItemCache, setBoardItemCache] = useState(boardItem);
  const [content, setContent] = useState(boardItem?.content || '');
  const [debouncedContent, setDebouncedContent] = useState(boardItem?.content || '');
  const [debouncedColor, setDebouncedColor] = useState(boardItem?.background_color || '#ffffff');
  const [isEditable, setIsEditable] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(boardItem?.background_color || '#ffffff');
  const draggableRef = useRef(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = content;
    }
  }, []);

  // debounce text input
  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setDebouncedContent(content);
    }, DEBOUNCE_SETTIMEOUT_LENGTH);
    return () => clearTimeout(delayInputTimeoutId);
  }, [content, DEBOUNCE_SETTIMEOUT_LENGTH]);

  // update server with debounced text
  useEffect(() => {
    onUpdate(boardItemCache?.id, content, null, null, backgroundColor);
  }, [debouncedContent]);

  // update on color change
  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setDebouncedColor(backgroundColor);
    }, DEBOUNCE_SETTIMEOUT_LENGTH);
    return () => clearTimeout(delayInputTimeoutId);
  }, [backgroundColor]);

  useEffect(() => {
    onUpdate(boardItemCache?.id, content, null, null, debouncedColor);
  }, [debouncedColor]);

  const handleOnKeyUp : React.KeyboardEventHandler = (e : KeyboardEvent) : void => {
    setContent(e.currentTarget.innerHTML);
  };

  const handleDelete = async (boardItemId : string) => {
    await onDelete(boardItemId)
  };

  const handleColorPicker : React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setBackgroundColor(e.currentTarget.value)
  };

  const handleDragStop : DraggableEventHandler = (e : DraggableEvent, data : DraggableData) : void => {
    if (boardItemCache?.x === data.x && boardItemCache?.y === data.y) {
      return;
    }

    onUpdate(boardItemCache?.id, null, data.x, data.y, null);
    const boardItemCacheCopy = Object.assign({}, boardItemCache);
    boardItemCacheCopy.x = data.x;
    boardItemCacheCopy.y = data.y;
    setBoardItemCache(boardItemCacheCopy);
  };

  if (boardItemCache?.is_deleted) {
    return null;
  }

  return (
    <Draggable
      nodeRef={draggableRef}
      defaultPosition={{x: boardItemCache?.x || 0, y: boardItemCache?.y || 0}}
      onStop={handleDragStop}
    >
      <div
        className="max-w-sm rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 min-h-40 w-40 absolute"
        ref={draggableRef}
        style={{ backgroundColor }}
      >
        <div className="flex flex-row justify-between w-full select-none">
          <div><input type="color" value={backgroundColor} onChange={handleColorPicker} className="w-6 h-6" /></div>
          <div><img draggable="false" src={hamburgerImg} className="h-6 w-6" /></div>
          <div><img draggable="false" src={closeImg} className="h-6 w-6" onClick={async () => await handleDelete(boardItem?.id || '')} /></div>
        </div>
        <div className="min-h-32 w-full p-2 outline-none" contentEditable={isEditable} onKeyUp={handleOnKeyUp} ref={contentEditableRef}></div>
      </div>
    </Draggable>
  );
};

export default BoardItem;
