import { MouseEventHandler, useContext, useEffect, useState } from 'react';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from 'flowbite-react';

import { SessionContext } from 'context';
import settingsIcon from 'public/img/settings.svg';
import { board } from '@prisma/client';

type HeaderProps = {
  board? : board;
  onSettingsClick? : MouseEventHandler<HTMLImageElement>;
};

const Header = ({ board, onSettingsClick } : HeaderProps) => {
  const session = useContext(SessionContext);
  const isLoggedIn = session?.id;
  const [boardName, setBoardName] = useState(board?.name);

  useEffect(() => {
    setBoardName(board?.name);
  }, [board]);

  return (
    <Navbar className="border border-b-1 h-12">
      <NavbarBrand href="/"><span className="text-lg">corkboard</span></NavbarBrand>
      {
        board
          ? <div className="flex flex-row">
              <span className="text-md inline-block ml-5">{boardName}</span>
              <img src={settingsIcon} className="h-6 w-6 ml-3" onClick={onSettingsClick} />
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
