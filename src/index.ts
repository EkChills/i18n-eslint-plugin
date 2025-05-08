import * as fs from "fs";
import * as cheerio from "cheerio";
import { Rule } from "eslint";

type Loc = {
  line: number;
  column: number;
};

type Attribute = {
  name: string;
  value: string;
};

const getText = (elementNode: cheerio.Cheerio<any>): string[] => {
  const values: string[] = [];

  elementNode.contents().filter(function (this: cheerio.AcceptedElems<any>) {
    if (this.nodeType === 3 && this.nodeValue && this.nodeValue.trim()) {
      const nodeValue = this.nodeValue.trim();
      for (let i = 0, sI = 0; i <= nodeValue.length; i++) {
        if (
          i === nodeValue.length ||
          (nodeValue[i] === "{" && nodeValue[i + 1] === "{")
        ) {
          values.push(nodeValue.substring(sI, i).trim());
          sI = i;
        }
      }
    }
    return false; // Required because `.filter()` expects a boolean
  });

  return values.filter((x) => x);
};

function getLineAndColumn(html: string[], value: string): Loc {
  const letter = value?.split("\n")[0];
  for (let i = 0; i < html.length; i++) {
    if (html[i].includes(letter)) {
      return { line: i + 1, column: html[i].indexOf(letter) };
    }
  }
  return { line: 0, column: 0 };
}

const rule: Rule.RuleModule = {
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

  create: function (context: Rule.RuleContext): Rule.RuleListener {
    const filePath = context.getFilename();
    const fileContent = fs.readFileSync(filePath, "utf8");
    const html = fileContent.split("\n");
    const $ = cheerio.load(fileContent);
    const startKey = `app.${filePath
      .replace(/\\/g, "/")
      .split("/")
      .pop()!
      .split(".component.")[0]
      .toLowerCase()}`;

    const reportError = (text: string, loc: Loc) => {
      const uniqueId = text
        .replace(/[^a-zA-Z\s.]/g, "")
        .replace(/[\s.]+/g, "-")
        .split("-")
        .filter((x) => x)
        .slice(0, 3)
        .join("-")
        .toLowerCase();

      context.report({
        node: null as any, // We don't have an AST node here
        message: `Expected ('${startKey}.${uniqueId}' | translate) for ${text
          .split("\n")
          .join(" ")
          .replace(/\s+/g, " ")}`,
        loc,
      });
    };

    $("*").each((index: number, element: cheerio.AcceptedElems<any>) => {
      const sections = getText($(element));

      if (sections.length > 0) {
        for (const section of sections) {
          if (
            /\w/.test(section) &&
            !/\|\s+translate/.test(section) &&
            !/\{\{\s*\(*[a-z]/.test(section)
          ) {
            reportError(section, getLineAndColumn(html, section));
          }
        }
      } else {
        const attr: Attribute[] = (element.attributes || []).filter(
          ({ name }: { name: any }) =>
            /\[(innertext|innerhtml|title|label|placeholder)]/i.test(name)
        );

        if (attr.length > 0) {
          for (const section of attr) {
            if (
              /\w/.test(section.value) &&
              !/\|\s+translate/.test(section.value) &&
              section.value.split("|")[0].includes("'")
            ) {
              reportError(section.value, getLineAndColumn(html, section.value));
            }
          }
        } else {
          for (const section of (element.attributes || []).filter(({ name }: {name: any}) =>
            /innertext|innerhtml|title|label|placeholder|translate/i.test(name)
          )) {
            if (
              /\w/.test(section.value) &&
              /[A-Z]/.test(section.value.replace(/[^a-zA-Z]/g, "")[0])
            ) {
              reportError(section.value, getLineAndColumn(html, section.value));
            }
          }
        }
      }
    });

    return {};
  },
};

export default rule;
