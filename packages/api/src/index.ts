import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const app = createApp();

app.listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, 'BizOS API server started');
});
