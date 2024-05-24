# corkboard!

corkboard is a tool for teams doing agile scrum retrospective ceremonies. it is a simple pin
board application where users can create a board and populate it with sticky notes to convey
their thoughts.

## Development

raise db server in docker:

```shellscript
docker compose up db
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
