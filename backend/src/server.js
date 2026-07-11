const { createApp } = require('./app');
const { migrate } = require('./db/migrate');

const PORT = process.env.PORT || 3000;

migrate();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Chat backend listening on port ${PORT}`);
});
