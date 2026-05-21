import { LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { listProviders } from '.server/auth/providers';
import LoginPage from 'components/LoginPage';
import Header from 'components/Header';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const rawReturnTo = url.searchParams.get('returnTo');
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : null;
  return json({
    providers: listProviders().map((p) => ({ id: p.id, label: p.label })),
    returnTo,
  });
};

export default function Index() {
  const { providers, returnTo } = useLoaderData<typeof loader>();
  return (
    <>
      <Header />
      <LoginPage providers={providers} returnTo={returnTo} />
    </>
  );
}
