// @ts-check

import stylisticTs from '@stylistic/eslint-plugin-ts'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	// Eslint rules for TS
	...tseslint.configs.recommended,
	{
		plugins: {
			'@stylistic/ts': stylisticTs,
		},

		rules: {
			// Formatting
			"@stylistic/ts/indent": ['error', "tab", {
				SwitchCase: 1,
				ObjectExpression: "first",
			}],
			"@stylistic/ts/object-curly-spacing": ['error', 'always'],
			"@stylistic/ts/object-property-newline": ['error', {
				"allowAllPropertiesOnSameLine": true
			}],
			"@stylistic/ts/space-before-blocks": "error",
			"@stylistic/ts/brace-style": ['error', '1tbs', { allowSingleLine: true }],
			"@stylistic/ts/key-spacing": ['error', { beforeColon: false, afterColon: true, mode: "strict" }],
			"no-multi-spaces": 'warn',

			"curly": ['error', 'multi-or-nest'],
			"linebreak-style": ['error', 'windows'],

			"no-warning-comments": [
				"warn",
				{
					"terms": ['TODO'],
					"location": 'start',
				}
			],

			"keyword-spacing": [
				"error",
				{
					"before": true,
					"after": true
				}
			],

			"comma-spacing": [
				"error",
				{
					before: false,
					after: true,
				},
			],

			// TypeScript Specific
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					"argsIgnorePattern": "^_",
					"varsIgnorePattern": "^_",
					"caughtErrorsIgnorePattern": "^_"
				}
			],
			"@typescript-eslint/no-explicit-any": 'off',
			"@typescript-eslint/no-non-null-assertion": 'off',
			"@typescript-eslint/explicit-module-boundary-types": 'off',
			"@typescript-eslint/no-require-imports": 'off',
			"@typescript-eslint/no-unused-expressions": 'off',
			"@typescript-eslint/no-empty-function": 'error',
			"@typescript-eslint/no-non-null-asserted-optional-chain": "off",

			// General Rules
			"no-undef": 'off',
			"no-empty": 'error',
			"no-console": 'warn',
		}
	},
	{
		ignores: ['dist/*', 'babel.config.js', 'test*', 'scripts/*']
	},
	{
		files: ['src/**/*.ts']
	}
)