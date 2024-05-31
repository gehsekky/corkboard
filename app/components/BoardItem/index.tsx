import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { board_item } from '@prisma/client';
import closeImg from 'public/img/close.svg';
import hamburgerImg from 'public/img/hamburger.svg';
import Draggable, { DraggableData, DraggableEvent, DraggableEventHandler } from 'react-draggable';
import { DEBOUNCE_SETTIMEOUT_LENGTH } from 'constants/';

type BoardItemProps = {
  boardItem : board_item;
  onDelete : Function;
  onUpdate : Function;
} & React.HTMLAttributes<HTMLElement>;

const BoardItem = ({ boardItem, onDelete, onUpdate } : BoardItemProps) => {
  const [content, setContent] = useState(boardItem.content);
  const [debouncedContent, setDebouncedContent] = useState(boardItem.content);
  const [debouncedColor, setDebouncedColor] = useState(boardItem.background_color);
  const [isEditable, setIsEditable] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(boardItem.background_color);
  const draggableRef = useRef(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(boardItem.x);
  const [y, setY] = useState(boardItem.y);
 
  useEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = content;
    }
  }, []);

  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== boardItem.content) {
      contentEditableRef.current.innerHTML = boardItem.content;
    }
    setContent(boardItem.content);
    setBackgroundColor(boardItem.background_color);
    setX(boardItem.x);
    setY(boardItem.y);
  }, [boardItem]);

  // debounce text input
  useEffect(() => {
    if (boardItem.content !== content) {
      const delayInputTimeoutId = setTimeout(() => {
        setDebouncedContent(content);
      }, DEBOUNCE_SETTIMEOUT_LENGTH);
      return () => clearTimeout(delayInputTimeoutId);
    }
  }, [content, DEBOUNCE_SETTIMEOUT_LENGTH]);

  // update server with debounced text
  useEffect(() => {
    async function runOnUpdate() {
      await onUpdate(boardItem.id, content, null, null, backgroundColor);
    }

    runOnUpdate();
  }, [debouncedContent]);

  // debounce user color selection
  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setDebouncedColor(backgroundColor);
    }, DEBOUNCE_SETTIMEOUT_LENGTH);
    return () => clearTimeout(delayInputTimeoutId);
  }, [backgroundColor, DEBOUNCE_SETTIMEOUT_LENGTH]);

  // update debounced color selection
  useEffect(() => {
    async function runOnUpdate() {
      await onUpdate(boardItem.id, content, null, null, debouncedColor);
    }

    runOnUpdate();
  }, [debouncedColor]);

  // update state value
  const handleOnKeyUp : React.KeyboardEventHandler = (e : KeyboardEvent) : void => {
    setContent(e.currentTarget.innerHTML);
  };

  // delete board item handler
  const handleDelete = async (boardItemId : string) => {
    // TODO modal confirmation?
    await onDelete(boardItemId);
  };

  // color picker handler
  const handleColorPicker : React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setBackgroundColor(e.currentTarget.value);
  };

  // update state and database with newly moved board item coords
  const handleDragStop : DraggableEventHandler = (e : DraggableEvent, data : DraggableData) : void => {
    setX(data.x);
    setY(data.y);
    onUpdate(boardItem.id, null, data.x, data.y, null);
  };

  if (boardItem.is_deleted) {
    return null;
  }

  return (
    <Draggable
      nodeRef={draggableRef}
      position={{ x, y }}
      onStop={handleDragStop}
    >
      <div
        className="max-w-sm rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 min-h-40 w-40 absolute"
        ref={draggableRef}
        style={{
          backgroundColor: boardItem.background_color,
          transform: `translate(${x}px, ${y}px)`,
        }}
      >
        <div className="flex flex-row justify-between w-full select-none">
          <div><input type="color" value={backgroundColor} onChange={handleColorPicker} className="w-6 h-6" /></div>
          <div><img draggable="false" src={hamburgerImg} className="h-6 w-6" /></div>
          <div><img draggable="false" src={closeImg} className="h-6 w-6" onClick={async () => await handleDelete(boardItem.id)} /></div>
        </div>
        <div className="min-h-32 w-full p-2 outline-none" contentEditable={isEditable} onKeyUp={handleOnKeyUp} ref={contentEditableRef}></div>
      </div>
    </Draggable>
  );
};

export default BoardItem;
