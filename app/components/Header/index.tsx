import { DEBOUNCE_SETTIMEOUT_LENGTH } from 'constants/';
import { BoardContext, SessionContext } from 'context';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from 'flowbite-react';
import React, { useContext, useEffect, useState } from 'react';

type HeaderProps = {

};

const Header = ({} : HeaderProps) => {
  const session = useContext(SessionContext);
  const boardContext = useContext(BoardContext);
  const [boardColor, setBoardColor] = useState(boardContext?.board?.background_color);
  const [debouncedBoardColor, setDebouncedBoardColor] = useState(boardColor);

  const isLoggedIn = session?.id;
  const boardName = boardContext?.board?.name;

  // update on color change
  useEffect(() => {
    const delayInputTimeoutId = setTimeout(() => {
      setDebouncedBoardColor(boardColor);
    }, DEBOUNCE_SETTIMEOUT_LENGTH);
    return () => clearTimeout(delayInputTimeoutId);
  }, [boardColor]);

  useEffect(() => {
    const boardClone = JSON.parse(JSON.stringify(boardContext.board));
    boardClone.background_color = debouncedBoardColor;
    boardContext.setBoard(boardClone);
    fetch(`/board/${boardContext.board?.id}`, {
      method: 'put',
      body: JSON.stringify(boardContext.board),
    });
  }, [debouncedBoardColor]);

  const onChangeBackgroundColor : React.ReactEventHandler<HTMLInputElement> = (e) => {
    setBoardColor(e.currentTarget.value);
  };

  return (
    <Navbar className="border border-b-1 h-12">
      <NavbarBrand href="/"><span className="text-lg">corkboard</span></NavbarBrand>
      {
        boardContext
          ? <div>
              <span className="text-md inline-block ml-5">{boardName}</span>
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
