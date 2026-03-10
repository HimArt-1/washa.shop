const fs = require('fs');

let content = fs.readFileSync('src/types/database.ts', 'utf8');

// Replace export interface X extends Y { ... } with export type X = Y & { ... }
content = content.replace(/export interface (\w+) extends (\w+) \{/g, "export type $1 = $2 & {");

// Replace export interface X { ... } with export type X = { ... }
content = content.replace(/export interface (\w+) \{/g, "export type $1 = {");

fs.writeFileSync('src/types/database.ts', content);
console.log("Converted interfaces to types");
