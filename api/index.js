import express from 'express';
import { handleEvents, printPrompts } from '../app/index.js';
import config from '../config/index.js';
import { validateLineSignature } from '../middleware/index.js';
import storage from '../storage/index.js';
import { fetchVersion, getVersion } from '../utils/index.js';

const app = express();

// 設置 JSON middleware 並保存原始請求主體
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// 根目錄路由
app.get('/', async (req, res) => {
  try {
    if (config.APP_URL) {
      res.redirect(config.APP_URL);
      return;
    }
    const currentVersion = getVersion();
    const latestVersion = await fetchVersion();
    res.status(200).send({ status: 'OK', currentVersion, latestVersion });
  } catch (err) {
    console.error('Error in GET /:', err.message);
    res.status(500).send({ status: 'ERROR', message: err.message });
  }
});

// Webhook 路由
app.post(config.APP_WEBHOOK_PATH, validateLineSignature, async (req, res) => {
  try {
    console.log('Received events:', req.body.events);

    // 初始化存儲
    await storage.initialize();

    // 處理事件
    await handleEvents(req.body.events);

    // 回應 200 狀態碼
    res.sendStatus(200);
  } catch (err) {
    console.error('Error handling events:', err.message);

    // 回應 500 狀態碼
    res.sendStatus(500);
  }

  // 如果啟用調試，打印提示
  if (config.APP_DEBUG) {
    printPrompts();
  }
});

// 啟動伺服器
if (config.APP_PORT) {
  app.listen(config.APP_PORT, () => {
    console.log(`Server is running on port ${config.APP_PORT}`);
  });
} else {
  console.error('APP_PORT is not defined in config.');
}

export default app;
