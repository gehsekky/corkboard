import { Form } from '@remix-run/react';
import { useState } from 'react';

const CreateBoard = () => {
  const [color, setColor] = useState('#ffffff');

  return (
    <div className="max-w-sm w-80 mx-auto">
      <Form method="post">
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">name</label>
          <input
            type="text"
            name="name"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="board name"
            required
          />
        </div>
        <div className="flex items-start mb-5">
          <div className="flex items-center h-5">
            <input
              type="color"
              name="color"
              value={color}
              onChange={(e) => setColor(e.currentTarget.value)}
              className="w-8 h-8 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800"
              required
            />
          </div>
          <label className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">background</label>
        </div>
        <button
          type="submit"
          name="submit"
          value="create_board"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          create board
        </button>
      </Form>
    </div>
  );
};

export default CreateBoard;
