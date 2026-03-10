const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'src', 'types', 'database.ts');
let content = fs.readFileSync(dbFile, 'utf8');

// The regex looks for `Update: ...;` taking into account newlines for multi-line Update blocks.
// Wait, some Update blocks are on one line, some might be multi-line.
// Actually, `Update: Partial<...>;` or `Update: {...};`
// Better yet, in `Database` interface, find every table block and just inject Relationships.
// For example:
//             profiles: {
//                 Row: Profile;
//                 Insert: Omit<Profile, ...> & { ... };
//                 Update: Partial<Omit<Profile, ...>>;
//             };

content = content.replace(/Update: ([^;]+);/g, "Update: $1;\n                Relationships: any[];");

fs.writeFileSync(dbFile, content);
console.log("Updated database.ts with Relationships: any[]");
