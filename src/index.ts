interface Env {
  USERNAME: string;
  WEBHOOK_URL: string;
  PROJECT_NAME: string;
  PASSWORD: string;
  TITLE_PLACEHOLDER: string;
  PRETITLE_PLACEHOLDER: string;
  EMBED_COLOR: string;
  TURNSTILE_SITEKEY: string;
  TURNSTILE_SECRET: string
}

interface formData extends FormData {
  preTitle: string;
  title: string;
  message: string;
  footer: string;
  password: string;
}

// TODO: add support for multiple fields
const format = (preTitle: string, title: string, message: string, footer: string, env: Env) => {
  return {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      "username": env.USERNAME,
      "embeds": [{
        "footer": { "text": footer },
        "author": { "name": preTitle },
        "title": title,
        "description": message,
        "color": env.EMBED_COLOR,
      }]
    })
  };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method.toUpperCase() === "POST") {
      const data = await request.formData() as formData; // Get all form data
      
      /***      Run a few checks      ***/

      // Check if the user passed the Turnstile form
      const token = data.get("cf-turnstile-response") as string; // Get Turnstile token
      const ip = request.headers.get("CF-Connecting-IP") as string; // Get IP
    
      // Verify Turnstile token
      let formData = new FormData() // Create FormData
      formData.append("secret", env.TURNSTILE_SECRET); // Get private key secret from encrypted environment variable
      formData.append("response", token); // Get the response token
      formData.append("remoteip", ip); // Pass the user's IP
    
      // Get response from Turnstile API
      const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { body: formData, method: "POST"});
    
      const turnstileStatus = await turnstileResponse.json() as { success: boolean }; // Get Turnstile report
    
      // Check if the user didn't pass the captcha
      if (!turnstileStatus.success) { return new Response('Captcha verification failed. Please try again.', { status: 511, headers: new Headers({"Access-Control-Allow-Origin": "*"}) });}

      if (data.get("message") == '') // Check if a message was given
        return new Response("Please enter a message!", { status: 400 });

      try { new URL(env.WEBHOOK_URL); } // Check if webhook URL is valid
      catch (err) { return new Response("Invalid webhook URL!", { status: 500 }); }
    
      if (data.get("password") != env.PASSWORD) // Check if password is correct
        return new Response("Incorrect password!", { status: 401 });

      // Finally, send the data to the webhook
      await fetch(env.WEBHOOK_URL, format(data.get("preTitle") as string, data.get("title") as string, data.get("message") as string, data.get("footer") as string, env));
      return new Response("Sent Successfully!", { status: 200 });
    };
    

    // Return the webpage
    return new Response(`<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="My place on the Internet to share things about me, what I'm working on, projects, and more!">
  <title>${env.PROJECT_NAME} Discord Format Bot</title>
  <meta name="color-scheme" content="dark light">
  <link rel="stylesheet" href="https://alecshome.com/style.css">
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
    <div class="card">
      <h1>${env.PROJECT_NAME} Discord Format Bot</h1>
      <form id="form" method="post" enctype="multipart/form-data">
        <label for="preTitle">Pretitle:</label><br>
        <input type="text" id="preTitle" name="preTitle" placeholder="${env.PRETITLE_PLACEHOLDER}"><br>

        <label for="title">Title:</label><br>
        <input type="text" id="title" name="title" placeholder="${env.TITLE_PLACEHOLDER}"><br>

        <label for="message">Message:</label><br><br>
        <textarea rows="10" cols="50" id="message" name="message"></textarea><br>

        <label for="footer">Footer:</label><br>
        <textarea rows="1" id="footer" name="footer"></textarea><br>

        <label for="password">Password:</label><br>
        <input type="password" id="password" name="password">
        
        <div class="cf-turnstile" data-sitekey="${env.TURNSTILE_SITEKEY}" data-theme="auto" id="turnstileWidget"></div>

        <input type="submit" class="button" value="Send Announcement">
      </form>
    </div>
  </body>
  <script>new SimpleMDE({autoDownloadFontAwesome: true, forceSync: true, status: false});</script>
</html>`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" }});
  }
};