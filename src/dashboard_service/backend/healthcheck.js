const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8010,
  path: '/ping',
  method: 'GET',
  timeout: 3000
};

const healthCheck = http.request(options, (res) => {
  console.log(`[${new Date().toISOString()}] HEALTHCHECK STATUS: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    console.error(`[${new Date().toISOString()}] HEALTHCHECK FAILED: HTTP ${res.statusCode}`);
    process.exit(1);
  }
});

healthCheck.on('error', function (err) {
  console.error(`[${new Date().toISOString()}] HEALTHCHECK ERROR:`, err.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.error(`[${new Date().toISOString()}] HEALTHCHECK TIMEOUT`);
  healthCheck.destroy();
  process.exit(1);
});

healthCheck.end();
