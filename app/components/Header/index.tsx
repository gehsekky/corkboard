import React, { useContext, useEffect, useState } from 'react';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from 'flowbite-react';
import { DEBOUNCE_SETTIMEOUT_LENGTH } from 'constants/';
import { BoardContext, SessionContext } from 'context';
import settingsIcon from 'public/img/settings.svg';

type HeaderProps = {

};

const Header = ({} : HeaderProps) => {
  const session = useContext(SessionContext);
  const boardContext = useContext(BoardContext);
  const [boardColor, setBoardColor] = useState(boardContext?.board?.background_color);
  const [debouncedBoardColor, setDebouncedBoardColor] = useState(boardColor);

  const isLoggedIn = session?.id;
  const boardName = boardContext?.board?.name;

  const updateBoardContext = (color : string) => {
    const boardClone = JSON.parse(JSON.stringify(boardContext.board));
    boardClone.background_color = color;
    boardContext.setBoard(boardClone);
  };

  // update on color change
  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setDebouncedBoardColor(boardColor);
    }, DEBOUNCE_SETTIMEOUT_LENGTH);
    return () => clearTimeout(delayInputTimeoutId);
  }, [boardColor]);

  useEffect(() => {
    if (boardContext.board && boardContext.board.background_color !== debouncedBoardColor) {
      const boardClone = JSON.parse(JSON.stringify(boardContext.board));
      boardClone.background_color = debouncedBoardColor;
      boardContext.setBoard(boardClone);
      fetch(`/board/${boardContext.board?.id}`, {
        method: 'put',
        body: JSON.stringify(boardClone),
      });
    }
  }, [debouncedBoardColor]);

  const onChangeBackgroundColor : React.ReactEventHandler<HTMLInputElement> = (e) => {
    setBoardColor(e.currentTarget.value);
  };

  return (
    <Navbar className="border border-b-1 h-12">
      <NavbarBrand href="/"><span className="text-lg">corkboard</span></NavbarBrand>
      {
        boardContext.board
          ? <div className="flex flex-row">
              <span className="text-md inline-block ml-5">{boardName}</span>
              <img src={settingsIcon} className="h-6 w-6 ml-3" />
              <input type="color" className="h-6 w-6 align-middle ml-3" name="color" value={boardContext.board?.background_color} onChange={onChangeBackgroundColor} />
            </div>
          : null
      }
      <NavbarToggle />
      <NavbarCollapse>
        <NavbarLink href="/">home</NavbarLink>
        <NavbarLink href={isLoggedIn ? '/logout' : '/login'}>{isLoggedIn ? 'logout' : 'login'}</NavbarLink>
      </NavbarCollapse>
    </Navbar>
  );
};

export default Header;
