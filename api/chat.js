const https = require('https');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  const { messages } = req.body;

  const postData = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: messages,
    max_tokens: 1500,
    temperature: 0.7
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const apiReq = https.request(options, function(apiRes) {
    let body = '';
    apiRes.on('data', function(chunk) { body += chunk; });
    apiRes.on('end', function() {
      try {
        const data = JSON.parse(body);
        if (apiRes.statusCode !== 200) {
          var errMsg = 'Groq API error';
          if (data.error && data.error.message) errMsg = data.error.message;
          return res.status(apiRes.statusCode).json({ error: errMsg });
        }
        return res.status(200).json(data);
      } catch (e) {
        return res.status(500).json({ error: 'Failed to parse Groq response' });
      }
    });
  });

  apiReq.on('error', function(e) {
    console.error('API route error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  });

  apiReq.write(postData);
  apiReq.end();
};
