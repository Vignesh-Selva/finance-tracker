---
trigger: model_decision
description: Apply when adding, moving or deleting files
---
1. No unused .js files — all files must be reachable from client/src/main.js
2. No empty folders inside client/src/
3. Run npm test from root after changes
4. Run npx depcheck inside client/ if imports changed