import * as core from '@actions/core';
import * as github from '@actions/github';
import anymatch from 'anymatch';

export function getOctokit() {
	const token = core.getInput('GITHUB_TOKEN', { required: true });
	return github.getOctokit(token);
}

export function isValidEvent(event: string, actions?: string | string[]) {
	const { context } = github;
	const { payload } = context;
	if (event === context.eventName) {
		if (actions == undefined) {
			return true;
		}
		if (Array.isArray(actions)) {
			return actions.includes(payload.action!);
		}

		return actions === payload.action;
	}
	return false;
}

export function isValidTitle(title: string) {
	const filter = core.getInput('filter');
	if (filter) {
		const filters = filter
			.split(/\n/)
			.map((str) => str.trim())
			.filter((str) => str.length > 0);
		core.info(`filters: ${JSON.stringify(filters, null, 2)}`);
		return !anymatch(filters, title, { nocase: true } as any);
	}
	return true;
}

export function formatTitle(title: string) {
	const exclude = core.getInput('exclude');
	if (exclude) {
		return exclude
			.split(/\s+/)
			.map((keyword) => keyword.trim())
			.filter((keyword) => keyword.length > 0)
			.reduce(
				(memo, keyword) =>
					memo.replaceAll(new RegExp(keyword, 'igm'), ''),
				title,
			)
			.replace(/\s+/, ' ')
			.trim();
	}
	return title;
}
