import Login from '../Login';

type ProviderListItem = { id: string; label: string };

const LoginPage = ({ providers, returnTo }: { providers: ProviderListItem[]; returnTo: string | null }) => {
  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <div className="h-full flex items-center justify-center">
        <Login providers={providers} returnTo={returnTo} />
      </div>
    </div>
  );
};

export default LoginPage;
