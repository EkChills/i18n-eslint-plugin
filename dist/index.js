"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const cheerio = __importStar(require("cheerio"));
const getText = (elementNode) => {
    const values = [];
    elementNode.contents().filter(function () {
        if (this.nodeType === 3 && this.nodeValue && this.nodeValue.trim()) {
            const nodeValue = this.nodeValue.trim();
            for (let i = 0, sI = 0; i <= nodeValue.length; i++) {
                if (i === nodeValue.length ||
                    (nodeValue[i] === "{" && nodeValue[i + 1] === "{")) {
                    values.push(nodeValue.substring(sI, i).trim());
                    sI = i;
                }
            }
        }
        return false; // Required because `.filter()` expects a boolean
    });
    return values.filter((x) => x);
};
function getLineAndColumn(html, value) {
    const letter = value === null || value === void 0 ? void 0 : value.split("\n")[0];
    for (let i = 0; i < html.length; i++) {
        if (html[i].includes(letter)) {
            return { line: i + 1, column: html[i].indexOf(letter) };
        }
    }
    return { line: 0, column: 0 };
}
const rule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Enforce I18n on Monorepo",
            category: "Best Practices",
            recommended: true,
        },
        schema: [],
        messages: {},
    },
    create: function (context) {
        const filePath = context.getFilename();
        const fileContent = fs.readFileSync(filePath, "utf8");
        const html = fileContent.split("\n");
        const $ = cheerio.load(fileContent);
        const startKey = `app.${filePath
            .replace(/\\/g, "/")
            .split("/")
            .pop()
            .split(".component.")[0]
            .toLowerCase()}`;
        const reportError = (text, loc) => {
            const uniqueId = text
                .replace(/[^a-zA-Z\s.]/g, "")
                .replace(/[\s.]+/g, "-")
                .split("-")
                .filter((x) => x)
                .slice(0, 3)
                .join("-")
                .toLowerCase();
            context.report({
                node: null, // We don't have an AST node here
                message: `Expected ('${startKey}.${uniqueId}' | translate) for ${text
                    .split("\n")
                    .join(" ")
                    .replace(/\s+/g, " ")}`,
                loc,
            });
        };
        $("*").each((index, element) => {
            const sections = getText($(element));
            if (sections.length > 0) {
                for (const section of sections) {
                    if (/\w/.test(section) &&
                        !/\|\s+translate/.test(section) &&
                        !/\{\{\s*\(*[a-z]/.test(section)) {
                        reportError(section, getLineAndColumn(html, section));
                    }
                }
            }
            else {
                const attr = (element.attributes || []).filter(({ name }) => /\[(innertext|innerhtml|title|label|placeholder)]/i.test(name));
                if (attr.length > 0) {
                    for (const section of attr) {
                        if (/\w/.test(section.value) &&
                            !/\|\s+translate/.test(section.value) &&
                            section.value.split("|")[0].includes("'")) {
                            reportError(section.value, getLineAndColumn(html, section.value));
                        }
                    }
                }
                else {
                    for (const section of (element.attributes || []).filter(({ name }) => /innertext|innerhtml|title|label|placeholder|translate/i.test(name))) {
                        if (/\w/.test(section.value) &&
                            /[A-Z]/.test(section.value.replace(/[^a-zA-Z]/g, "")[0])) {
                            reportError(section.value, getLineAndColumn(html, section.value));
                        }
                    }
                }
            }
        });
        return {};
    },
};
exports.default = rule;
