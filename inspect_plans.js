const http = require('http');

http.get('http://localhost:8000/v1/plans/public', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data));
  });
}).on('error', (err) => {
  console.error(err);
});
