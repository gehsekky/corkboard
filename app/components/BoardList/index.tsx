import { board } from '@prisma/client';
import { Link } from '@remix-run/react';

type BoardListProps = {
  boards : board[];
};

const BoardList = ({ boards } : BoardListProps) => {
  return (
    <div className="h-full w-full p-10 flex flex-row">
      {
        boards.map((board) => {
          return (
            <Link to={`/board/${board.id}`} key={board.id}>
              <div
                className="max-w-sm h-40 w-80 p-6 m-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                style={{
                  backgroundColor: board.background_color,
                }}
              >
                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{board.name}</h5>
              </div>
            </Link>
          )
        })
      }
    </div>
  );
};

export default BoardList;
