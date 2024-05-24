import flowbite from 'flowbite-react/tailwind';
import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    flowbite.content(),
  ],
  theme: {
    extend: {},
  },
  plugins: [
    flowbite.plugin(),
  ],
  variants: {
    extend: {
      visibility: ['hover'],
    }
  }
} satisfies Config;
