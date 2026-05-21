import { Form } from '@remix-run/react';

type ProviderListItem = { id: string; label: string };

const Login = ({ providers, returnTo }: { providers: ProviderListItem[]; returnTo: string | null }) => {
  return (
    <div className="max-w-sm w-80 mx-auto">
      <h1 className="text-xl mb-5 text-center">sign in to corkboard</h1>
      {providers.length === 0 ? (
        <p className="text-sm text-gray-600 text-center">
          No identity providers are configured. Contact an administrator.
        </p>
      ) : (
        providers.map((p) => (
          <Form key={p.id} method="post" action={`/auth/${p.id}`} className="mb-3">
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <button
              type="submit"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              sign in with {p.label}
            </button>
          </Form>
        ))
      )}
    </div>
  );
};

export default Login;
