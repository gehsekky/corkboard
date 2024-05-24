import { ActionFunctionArgs, redirect } from '@remix-run/node';
import { createUser } from '.server/user';
import CreateUserPage from 'components/CreateUserPage';
import Header from 'components/Header';

export async function action({ request } : ActionFunctionArgs) {
  if (request.method.toLowerCase() === 'post') {
    const formData = await request.formData();
    if (!formData.has('email') || !formData.has('name') || !formData.has('password')) {
      throw new Error('incomplete form detected. must provide email, name, and password');
    }

    const email = formData.get('email')?.toString() || '';
    const name = formData.get('name')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    const newUser = await createUser(email, name, password);
    if (!newUser) {
      throw new Error('could not create new user');
    }

    throw redirect('/login');
  }

  return null;
}

export default function Index() {
  return (
    <>
      <Header />
      <CreateUserPage />
    </>
    
  );
}
