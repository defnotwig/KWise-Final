# K-Wise One-Click Launcher

What this does

- `start-all.bat`: safe Windows batch file that opens two new command windows and runs the backend and frontend start commands found in `KWise-Backend` and `K-Wise` respectively. It does not modify your repository.
- `launcher.js`: small Node.js wrapper that launches `start-all.bat`. Useful for packaging into a single executable.
- `package.json` (root): includes `npm run start-all` to run the wrapper and `npm run build-exe` to build an exe using `pkg`.

How to use (quick)

1. Double-click `start-all.bat` to launch both services.
2. Or, from a terminal, run:

```powershell
cd "<workspace root>"
npm run start-all
```

How to build a single `.exe` (optional)

1. Install dependencies in the root: `npm install` (this will install `pkg` as a devDependency).
2. Run: `npm run build-exe` — this uses `pkg` to produce `kwise-launcher.exe` for Windows.

Notes & safety

- The batch file uses `start` to open new windows and runs `npm run dev` for backend and `npm start` for the frontend. It checks for `package.json` presence before attempting to run.
- The launcher does not change code or write to any repository files.
- Building an exe with `pkg` bundles the launcher script only; it does not bundle node_modules for your app. You still need to run `npm install` inside `KWise-Backend` and `K-Wise` before starting them.

Troubleshooting

- If ports are in use, stop other processes that occupy the ports (commonly 3000 or 5000).
- If `npm` commands fail, ensure Node.js and npm are installed and available in PATH.
