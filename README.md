# ngx-data-polling

Angular 20 library with utilities to handle data polling in a declarative and type-safe way.

## 📚 Documentation

For complete documentation, usage examples, and API reference, see:

**[projects/ngx-data-polling/README.md](./projects/ngx-data-polling/README.md)**

## 🚀 Quick Start

```bash
npm install ngx-data-polling
```

```typescript
import { pollingResource } from 'ngx-data-polling';

readonly resource = pollingResource({
  loader: () => this.myService.getData(),
  intervalMs: 5000,
  initialValue: []
});
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## 📦 Project Structure

```
ngx-data-polling/
├── projects/
│   └── ngx-data-polling/     # Library source code
│       ├── src/
│       │   ├── lib/
│       │   │   ├── utils/
│       │   │   ├── components/
│       │   │   └── directives/
│       │   └── public-api.ts
│       └── README.md          # Full library documentation
├── package.json
└── README.md                  # This file (development guide)
```
