import { ActionFunctionArgs, redirect } from '@remix-run/node';
import { commitSession, getSession } from '.server/session';
import { login } from '.server/user';
import LoginPage from 'components/LoginPage';
import Header from 'components/Header';

export const action = async ({ request } : ActionFunctionArgs) => {
  if (request.method.toLowerCase() === 'post') {
    const session = await getSession(request.headers.get('Cookie'));
    const formData = await request.formData();
    if (!formData.has('email') || !formData.has('password')) {
      throw new Error('incomplete form detected. must provide email and password');
    }

    const email = formData.get('email')?.toString() || '';
    const password = formData.get('password')?.toString() || '';
    const foundUser = await login(email, password);
    if (!foundUser) {
      session.flash('error', 'invalid email/password');
      throw redirect('/login', {
        headers: {
          'Set-Cookie': await commitSession(session),
        }
      });
    }

    session.set('id', foundUser.id);
    session.set('name', foundUser.name || '');
    throw redirect('/', {
      headers: {
        'Set-Cookie': await commitSession(session),
      }
    });
  }

  return null;
};

export default function Index() {
  return (
    <>
      <Header />
      <LoginPage />
    </>
  );
}
