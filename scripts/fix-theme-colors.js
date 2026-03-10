#!/usr/bin/env node
/**
 * استبدال ألوان الثيم الثابتة بأخرى متوافقة مع النمط الفاتح والداكن
 */
const fs = require("fs");
const path = require("path");

const replacements = [
  [/\btext-fg\b(?!\/)/g, "text-theme"],
  [/\btext-fg\/15\b/g, "text-theme-faint"],
  [/\btext-fg\/20\b/g, "text-theme-faint"],
  [/\btext-fg\/25\b/g, "text-theme-faint"],
  [/\btext-fg\/30\b/g, "text-theme-faint"],
  [/\btext-fg\/40\b/g, "text-theme-subtle"],
  [/\btext-fg\/50\b/g, "text-theme-subtle"],
  [/\btext-fg\/60\b/g, "text-theme-soft"],
  [/\btext-fg\/70\b/g, "text-theme-soft"],
  [/\btext-fg\/80\b/g, "text-theme-strong"],
  [/\btext-fg\/90\b/g, "text-theme-strong"],
  [/\btext-white\b(?!\/)/g, "text-theme"],
  [/\btext-white\/20\b/g, "text-theme-faint"],
  [/\btext-white\/25\b/g, "text-theme-faint"],
  [/\btext-white\/30\b/g, "text-theme-faint"],
  [/\btext-white\/40\b/g, "text-theme-subtle"],
  [/\btext-white\/50\b/g, "text-theme-subtle"],
  [/\btext-white\/60\b/g, "text-theme-soft"],
  [/\btext-white\/70\b/g, "text-theme-soft"],
  [/\btext-white\/80\b/g, "text-theme-strong"],
  [/\btext-white\/90\b/g, "text-theme-strong"],
  [/bg-white\/\[0\.01\]/g, "bg-theme-faint"],
  [/bg-white\/\[0\.02\]/g, "bg-theme-faint"],
  [/bg-white\/\[0\.03\]/g, "bg-theme-subtle"],
  [/bg-white\/\[0\.04\]/g, "bg-theme-subtle"],
  [/bg-white\/5\b/g, "bg-theme-subtle"],
  [/bg-white\/\[0\.06\]/g, "bg-theme-soft"],
  [/bg-white\/\[0\.08\]/g, "bg-theme-soft"],
  [/border-white\/\[0\.03\]/g, "border-theme-faint"],
  [/border-white\/\[0\.04\]/g, "border-theme-faint"],
  [/border-white\/\[0\.05\]/g, "border-theme-subtle"],
  [/border-white\/\[0\.06\]/g, "border-theme-subtle"],
  [/\bborder-white\/10\b/g, "border-theme-soft"],
  [/border-white\/\[0\.08\]/g, "border-theme-soft"],
  [/hover:bg-white\/5\b/g, "hover:bg-theme-subtle"],
  [/hover:bg-white\/\[0\.02\]/g, "hover:bg-theme-faint"],
  [/hover:bg-white\/\[0\.04\]/g, "hover:bg-theme-subtle"],
  [/hover:bg-white\/\[0\.06\]/g, "hover:bg-theme-soft"],
  [/hover:bg-white\/\[0\.08\]/g, "hover:bg-theme-soft"],
];

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
      walkDir(filePath, callback);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      callback(filePath);
    }
  }
}

let total = 0;
walkDir(path.join(__dirname, "../src"), (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;
  for (const [re, replacement] of replacements) {
    const newContent = content.replace(re, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
    total++;
    console.log("Fixed:", filePath);
  }
});
console.log(`\nDone. Fixed ${total} files.`);
