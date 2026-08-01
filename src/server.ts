import { app } from './app';

const port = parseInt(process.env.PORT ?? '3000', 10);
app.listen(port, () => {
  console.log(`Frontend listening on port ${port}`);
});
