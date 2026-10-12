// Renders scripts/walkthrough/index.html to public/videos/workflow.mp4 (+ poster), frame by frame.
// The storyboard is a paused GSAP timeline, so every frame is an exact seek: no real-time jitter.
//
//   npm i --no-save playwright-core && node scripts/walkthrough/record.mjs
//
// Needs ffmpeg on PATH and a Chromium (set CHROME=/path/to/chrome, or it uses Playwright's default).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../public/videos");
const FPS = 30;

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("file://" + path.join(here, "index.html"));
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.__duration);

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
  path.join(out, "workflow.mp4"),
], { stdio: ["pipe", "inherit", "inherit"] });

const frames = Math.round(duration * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__seek(t), i / FPS);
  if (i === Math.round(10.5 * FPS)) await page.screenshot({ path: path.join(out, "workflow-poster.jpg"), type: "jpeg", quality: 85 });
  ff.stdin.write(await page.screenshot({ type: "png" }));
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`wrote ${frames} frames`);
