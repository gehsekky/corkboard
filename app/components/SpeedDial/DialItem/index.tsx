import { MouseEventHandler } from 'react';

type DialItemProps = {
  label : string;
  svg : JSX.Element;
  onClick? : MouseEventHandler<HTMLButtonElement>;
};

const DialItem = ({ label, svg, onClick } : DialItemProps) => {
  return (
    <>
      <button type="button" className="relative w-[52px] h-[52px] text-gray-500 bg-white rounded-full border border-gray-200 dark:border-gray-600 hover:text-gray-900 shadow-sm dark:hover:text-white dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-300 focus:outline-none dark:focus:ring-gray-400" {...(onClick && {onClick})}>
        {svg}
        <span className="absolute block mb-px text-sm font-medium -translate-y-1/2 -start-14 top-1/2">{label}</span>
      </button>
      <div id="tooltip-copy" role="tooltip" className="absolute z-10 invisible inline-block w-auto px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
        {label}
        <div className="tooltip-arrow" data-popper-arrow></div>
      </div>
    </>
  );
};

export default DialItem;
