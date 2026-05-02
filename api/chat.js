const https = require('https');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { messages } = req.body;

  // Convert OpenAI-style messages to Gemini format
  var systemInstruction = '';
  var contents = [];
  messages.forEach(function(m) {
    if (m.role === 'system') {
      systemInstruction = m.content;
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }
  });

  var geminiBody = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000
    }
  };
  if (systemInstruction) {
    geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const postData = JSON.stringify(geminiBody);

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
          var errMsg = 'Gemini API error';
          if (data.error && data.error.message) errMsg = data.error.message;
          return res.status(apiRes.statusCode).json({ error: errMsg });
        }
        // Convert Gemini response to OpenAI-compatible format
        var text = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          text = data.candidates[0].content.parts.map(function(p) { return p.text; }).join('');
        }
        return res.status(200).json({
          choices: [{ message: { role: 'assistant', content: text } }]
        });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to parse Gemini response' });
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
