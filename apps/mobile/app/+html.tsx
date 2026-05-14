import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
html {
  background-color: #17151D;
}
body {
  background:
    radial-gradient(circle at top, rgba(206, 189, 255, 0.10), transparent 28%),
    linear-gradient(180deg, #15131B 0%, #0D0D0F 100%);
  min-height: 100vh;
  margin: 0;
  padding: 24px 0;
}
body > div:first-child {
  width: min(100vw, 430px);
  min-height: 100vh;
  margin: 0 auto;
  background-color: #0D0D0F;
  border-radius: 28px;
  box-shadow:
    0 0 0 1px rgba(206, 189, 255, 0.10),
    0 24px 80px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
@media (prefers-color-scheme: dark) {
  html {
    background-color: #17151D;
  }
  body {
    background:
      radial-gradient(circle at top, rgba(206, 189, 255, 0.10), transparent 28%),
      linear-gradient(180deg, #15131B 0%, #0D0D0F 100%);
  }
}
@media (max-width: 430px) {
  html,
  body,
  body > div:first-child {
    width: 100%;
    box-shadow: none;
    border-radius: 0;
  }
  body {
    padding: 0;
  }
}`;
