'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Studio System Error | PolyTrack</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bg: #fafafa;
            --surface: #ffffff;
            --border: #e7e7ea;
            --text: #111113;
            --text-muted: #5b5b66;
            --accent: #5e6ad2;
            --danger: #dc2626;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #0f1011;
              --surface: #17181a;
              --border: #26272b;
              --text: #ececee;
              --text-muted: #8b8b97;
              --accent: #7b86e8;
              --danger: #f87171;
            }
          }
          body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
            box-sizing: border-box;
          }
          .card {
            max-width: 540px;
            width: 100%;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 12px rgba(16, 16, 20, 0.05);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-family: monospace;
            padding: 2px 8px;
            border-radius: 4px;
            background: rgba(220, 38, 38, 0.1);
            color: var(--danger);
            border: 1px solid rgba(220, 38, 38, 0.2);
            margin-bottom: 1rem;
          }
          .badge-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--danger);
          }
          h1 {
            font-size: 1.25rem;
            margin: 0 0 0.5rem;
            font-weight: 600;
          }
          p {
            font-size: 0.875rem;
            color: var(--text-muted);
            line-height: 1.55;
            margin: 0 0 1.5rem;
          }
          .btn-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          button, a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            transition: opacity 0.15s;
          }
          .btn-primary {
            background: var(--accent);
            color: #ffffff;
            border: 1px solid transparent;
          }
          .btn-secondary {
            background: var(--surface);
            color: var(--text);
            border: 1px solid var(--border);
          }
          button:hover, a:hover { opacity: 0.9; }
          .tech-box {
            margin-top: 1.25rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
            font-size: 11px;
            color: var(--text-muted);
            font-family: monospace;
            word-break: break-all;
          }
        `}} />
      </head>
      <body>
        <div className="card">
          <div className="badge">
            <span className="badge-dot" />
            <span>Root Engine Failure • Fatal</span>
          </div>
          <h1>PolyTrack Studio Crashed</h1>
          <p>
            A fatal exception occurred in the root application layout. The studio engine halted execution to prevent data corruption.
          </p>
          <div className="btn-group">
            <button type="button" className="btn-primary" onClick={() => reset()}>
              Reload Studio
            </button>
            <a href="/login" className="btn-secondary">
              Sign In
            </a>
          </div>
          {error?.message && (
            <div className="tech-box">
              {error.message}
              {error.digest && <div>Digest: {error.digest}</div>}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
