import ruleModule from "./dist/index.js"
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({
	// Must use at least ecmaVersion 2015 because
	// that's when `const` variables were introduced.
	languageOptions: { ecmaVersion: 2015 },
});

const rule = ruleModule.default;


ruleTester.run("only-i18n", rule, {
    valid: [
        {
            code: `
                <h1 translate="app.dashboard.title"></h1>
            `,
        },
    ],
    invalid: [
        {
            code: `
                <h1>Dashboard</h1>
            `,
            errors: [
                {
                    messageId: "only-i18n",
                    type: "CallExpression",
                },
            ],
        },
    ],
});