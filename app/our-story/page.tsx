import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us, RiseWithJeet | India\'s #1 AI-Powered UPSC Platform',
  description: 'Built by an Aspirant, for Every Aspirant. RiseWithJeet was born from a deep love for governance, a fascination with public service, and one IIT engineer who believed every aspirant deserves a fair shot.',
};

export default function OurStoryPage() {
  const htmlPath = resolve(process.cwd(), 'public', 'our-story-v4.html');
  const html = readFileSync(htmlPath, 'utf-8');

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;

  // Extract all <style> blocks from <head>
  const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  let styles = '';
  for (const match of styleMatches) {
    styles += match[1];
  }

  // Prepend font import so the page fonts load correctly when injected into body
  const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');\n`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontImport + styles }} />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  );
}
