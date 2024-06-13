import * as core from '@actions/core';
import * as github from '@actions/github';

import mustache from 'mustache';

import { isValidEvent, isValidTitle, formatTitle, getOctokit } from './util';
import { addReaction } from './reaction';
import { compare } from './algo';

export async function run() {
	const { context } = github;
	const payload = context.payload.issue;
	if (
		payload &&
		isValidEvent('issues', ['opened', 'edited']) &&
		isValidTitle(payload.title)
	) {
		const octokit = getOctokit();
		const duplicates = [];
		const response = await octokit.rest.issues.listForRepo({
			...context.repo,
			state: core.getInput('state') as 'all' | 'open' | 'closed',
		});

		const { title } = payload;
		const issues = response.data.filter(
			(i) => i.number !== payload.number && i.pull_request === undefined,
		);
		const threshold = Number.parseFloat(core.getInput('threshold'));

		const formattedTitle = formatTitle(title);
		if (formattedTitle === '') {
			core.info(
				`Issue title "${title}" is empty after excluding keywords`,
			);
			return;
		}

		for (const issue of issues) {
			const accuracy = compare(
				formatTitle(issue.title),
				formattedTitle,
			);

			core.debug(
				`${issue.title} ~ ${title} = ${Number.parseFloat(
					(accuracy * 100).toFixed(2),
				)}%`,
			);

			if (accuracy >= threshold) {
				duplicates.push({
					number: issue.number,
					title: issue.title,
					accuracy: Number.parseFloat((accuracy * 100).toFixed(2)),
				});
			}
		}

		if (duplicates.length > 0) {
			const label = core.getInput('label');
			if (label) {
				await octokit.rest.issues.addLabels({
					...context.repo,
					issue_number: payload.number,
					labels: [label],
				});
			}

			const comment = core.getInput('comment');
			const reactions = core.getInput('reactions');
			if (comment) {
				const body = mustache.render(comment, {
					issues: duplicates,
				});

				const { data } = await octokit.rest.issues.createComment({
					...context.repo,
					body,
					issue_number: payload.number,
				});

				if (reactions) {
					await addReaction(octokit, data.id, reactions);
				}
			}
		}
	}
}

run();
