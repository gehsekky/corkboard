import SpeedDial from '../SpeedDial';
import DialItem from 'components/SpeedDial/DialItem';
import { Link } from '@remix-run/react';
import React from 'react';

type LandingPageProps = {
  children : React.ReactNode;
};

const LandingPage = ({ children } : LandingPageProps) => {
  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <div className="h-full flex items-center justify-center">
        {children}
        <SpeedDial>
          <Link to="/create_board">
            <DialItem label="board" svg={
              <svg className="w-5 h-5 mx-auto" viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="m19.101 3.291-2.392-2.392507.3984-.398487c.6606-.660775 1.7319-.660775 2.3925 0 .6604.660574.6604 1.731414 0 2.391984z" />
                <path d="m15.6108 1.99445 2.392 2.39251-6.5028 6.50324-3.16846.7766.77644-3.16915z" />
                <path d="m3 3v11h3.5c.77479 0 1.38768.6623 1.92584 1.2439.00864.0093.01729.0186.02593.028.02846.0307.05688.0614.0848.0913.36511.3918.88566.6368 1.46343.6368.5778 0 1.0983-.245 1.4634-.6368.0336-.036.0675-.0726.1017-.1096l.0088-.0095c.5381-.5814 1.1515-1.2441 1.9261-1.2441h3.5v-3c0-.5523.4477-1.00001 1-1.00001s1 .44771 1 1.00001v6.5c0 .8284-.6716 1.5-1.5 1.5h-15c-.82843 0-1.5-.6716-1.5-1.5v-15c0-.82843.67157-1.5 1.5-1.5h6.5c.55229 0 1 .44772 1 1s-.44772 1-1 1z" />
              </svg>
            } />
          </Link>
        </SpeedDial>
      </div>
    </div>
  );
};

export default LandingPage;
