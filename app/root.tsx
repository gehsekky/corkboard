import { LinksFunction, LoaderFunctionArgs, MetaFunction, SessionData, json } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import Header from './components/Header';
import stylesheet from "./tailwind.css?url";
import { getSession } from './.server/session';
import { SessionContext } from 'context';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get('Cookie'));
  return json({
    id: session.get('id'),
    name: session.get('name'),
  } as SessionData);
};

export const meta: MetaFunction = () => {
  return [
    { title: 'corkboard' },
    { name: "description", content: "welcome to corkboard!" },
  ];
};

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-screen w-full">
        <SessionContext.Provider value={loaderData}>
          {children}
        </SessionContext.Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
