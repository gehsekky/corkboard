import { BoardUserWithBoard } from '.server/board_user';
import { Prisma, board, board_user } from '@prisma/client';
import { Link } from '@remix-run/react';

type BoardListProps = {
  boardData : BoardUserWithBoard[];
};

const BoardList = ({ boardData } : BoardListProps) => {
  return (
    <div className="h-full w-full p-10 flex flex-row">
      {
        boardData && boardData.map((boardUser) => {
          return (
            <Link to={`/board/${boardUser.board.id}`} key={boardUser.board.id}>
              <div
                className="max-w-sm h-40 w-80 p-6 m-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                style={{
                  backgroundColor: boardUser.board.background_color,
                }}
              >
                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{boardUser.board.name}</h5>
              </div>
            </Link>
          )
        })
      }
    </div>
  );
};

export default BoardList;
