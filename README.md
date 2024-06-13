# corkboard!

corkboard is a tool for teams doing agile scrum retrospective ceremonies. it is a simple pin
board application where users can create a board and populate it with sticky notes to convey
their thoughts.

## Development

raise db server in docker:

```shellscript
docker compose up db
```

if this is first time starting up locally:
```shellscript
npx prisma generate
```

if you've made db schema changes:

```shellscript
npx prisma db pull
npx prisma generate
```

else, run the Vite dev server:

```shellscript
npm run dev
```

in browser, open `localhost:5173`

example quick startup:

```shellscript
git clone https://github.com/gehsekky/corkboard.git
cd corkboard
nvm use
npm i
npx prisma generate
npm run docker
```

in browser, open `localhost:3000`

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`
