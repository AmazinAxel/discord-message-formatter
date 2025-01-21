interface Env {
  WEBHOOK_URL: string;
  PASSWORD: string;
  EMBED_COLOR: string;
  TURNSTILE_SITEKEY: string;
  TURNSTILE_SECRET: string
}

interface formData extends FormData {
  author: string;
  title: string;
  message: string;
  footer: string;
  password: string;
}

// TODO: add support for multiple embeds
const format = (author: string, title: string, message: string, footer: string, env: Env) => {
  return {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      "embeds": [{
        "footer": { "text": footer },
        "author": { "name": author },
        "title": title,
        "description": message,
        "color": env.EMBED_COLOR,
      }]
    })
  };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    
    // Handle formdata here
    if (request.method.toUpperCase() === "POST") {
      const data = await request.formData() as formData;
      
      // Check if the user passed the Turnstile form
      const token = data.get("cf-turnstile-response") as string;
      const ip = request.headers.get("CF-Connecting-IP") as string;
      const formData = new FormData();
      formData.append("secret", env.TURNSTILE_SECRET);
      formData.append("response", token);
      formData.append("remoteip", ip);
    
      const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { body: formData, method: "POST"});
      const turnstileStatus = await turnstileResponse.json() as { success: boolean }; // Get Turnstile report
    
      if (!turnstileStatus.success) // User did not pass the captcha
        return new Response('Captcha verification failed', { status: 511, headers: new Headers({"Access-Control-Allow-Origin": "*"}) });

      if (data.get("message") == '') // Message was not given
        return new Response("Please enter a message", { status: 400 });
    
      if (data.get("password") != env.PASSWORD) // Password is not correct
        return new Response("Incorrect password", { status: 401 });

      // Passed all checks - submit the embed
      await fetch(env.WEBHOOK_URL, format(data.get("author") as string, data.get("title") as string, data.get("message") as string, data.get("footer") as string, env));
      return new Response("Sent Successfully!", { status: 200 });
    };

    // Return the webpage
    return new Response(`
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Discord Embed Creator</title>
  <meta name="color-scheme" content="dark light">
  <script defer src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>

  <!-- SimpleMDE -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">
  <script src="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
  <style> 
    .CodeMirror { text-align: left; }
    textarea { min-height: 40px; height: 40px; max-height: 80px; }
  </style>
</head>
  <body>
    <h1>Discord Embed Creator</h1>
    <form id="form" method="post" enctype="multipart/form-data">
      <label for="author">Author:</label><br>
      <input type="text" id="author" name="author" placeholder="Author placeholder"><br>

      <label for="title">Title:</label><br>
      <input type="text" id="title" name="title" placeholder="Title placeholder"><br>

      <label for="message">Message:</label><br><br>
      <textarea rows="10" cols="50" id="message" name="message"></textarea><br>

      <label for="footer">Footer:</label><br>
      <textarea rows="1" id="footer" name="footer"></textarea><br>

      <label for="password">Password:</label><br>
      <input type="password" id="password" name="password">
      
      <div class="cf-turnstile" data-sitekey="${env.TURNSTILE_SITEKEY}" data-theme="auto" id="turnstileWidget"></div>

      <input type="submit" value="Send Announcement">
    </form>
  </body>
  <script>new SimpleMDE({autoDownloadFontAwesome: true, forceSync: true, status: false});</script>
</html>`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" }});
  }
};