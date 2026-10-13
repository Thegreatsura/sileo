<div align="center">
  <h1>Sileo</h1>
  <p>An opinionated, physics-based toast component for React.</p>
  <p><a href="https://sileo.aaryan.design">Try Out</a> &nbsp; / &nbsp; <a href="https://sileo.aaryan.design/docs">Docs</a></p>
  <video src="https://github.com/user-attachments/assets/a292d310-9189-490a-9f9d-d0a1d09defce"></video>
</div>

### Installation

```bash
npm i sileo
```

### Getting Started

```tsx
import { sileo, Toaster } from "sileo";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <YourApp />
    </>
  );
}
```

For detailed docs, click here: https://sileo.aaryan.design

### Repository

This repository holds both the package and the site that documents it.

| Path              | What it is                                                         |
| ----------------- | ------------------------------------------------------------------ |
| `packages/sileo`  | The `sileo` npm package. Published on GitHub Release.              |
| `app`, `components`, `lib`, `public` | The Next.js site at [sileo.aaryan.design](https://sileo.aaryan.design), deployed by Vercel. |

```bash
# the site
bun install
bun run dev

# the package
cd packages/sileo
bun install
bun run dev
```
