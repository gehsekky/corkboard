import { Dial } from 'flowbite';
import { useEffect, useRef } from 'react';

type SpeedDialProps = {
  children? : React.ReactNode;
};

const SpeedDial = ({ children } : SpeedDialProps) => {
  const parentElRef = useRef(null);
  const triggerElRef = useRef(null);
  const targetElRef = useRef(null);
  const dialOptions = {};
  const dialInstanceOptions = {};

  useEffect(() => {
    const dial = new Dial(parentElRef.current, triggerElRef.current, targetElRef.current, dialOptions, dialInstanceOptions);
  }, []);
  
  return (
    <div data-dial-init className="fixed end-6 bottom-6 group" ref={parentElRef} id="dial-parent">
      <div id="speed-dial-menu-default" className="flex flex-col items-center hidden mb-4 space-y-2" ref={targetElRef}>
        {children}
      </div>
      <button type="button" id="dial-trigger" data-dial-toggle="speed-dial-menu-default" aria-controls="speed-dial-menu-default" aria-expanded="false" className="flex items-center justify-center text-white bg-blue-700 rounded-full w-14 h-14 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:focus:ring-blue-800" ref={triggerElRef}>
        <svg className="w-5 h-5 transition-transform group-hover:rotate-45" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 1v16M1 9h16"/>
        </svg>
        <span className="sr-only">Open actions menu</span>
      </button>
    </div>
  );
};

export default SpeedDial;
