const http = require('http');

const data = JSON.stringify({
  callNumber: "SC-TEST-9999",
  priority: "High"
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/service-calls',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error('Error:', error));
req.write(data);
req.end();
