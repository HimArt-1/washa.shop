const fs = require('fs');

const content = fs.readFileSync('src/types/database.ts', 'utf8');
const tablesMatch = content.match(/Tables:\s*\{(\{.*?\}|.*?)*?\};/gs);
if (!tablesMatch) return;

const tablesContent = tablesMatch[0];
// Split by "Row:" roughly to find table blocks
const parts = tablesContent.split('Row:');
for (let i = 0; i < parts.length - 1; i++) {
    // the table name is before "Row:"
    const prev = parts[i];
    const match = prev.match(/(\w+):\s*\{$/);
    if (!match) continue;
    const tableName = match[1];

    const body = parts[i + 1];
    // body contains Insert, Update until the next table
    const nextBraceIdx = body.indexOf('};');
    const tableBody = body.substring(0, nextBraceIdx);

    if (!tableBody.includes('Update:')) {
        console.log("MISSING Update:", tableName);
    }
}
