import * as core from '@actions/core';
import * as github from '@actions/github';

const presets = [
	'+1',
	'-1',
	'laugh',
	'confused',
	'heart',
	'hooray',
	'rocket',
	'eyes',
] as const;

type ReactionType = (typeof presets)[number];

function getReactions(inputs: string | string[]) {
	const candidates = Array.isArray(inputs)
		? inputs
		: inputs.split(inputs.indexOf(',') >= 0 ? ',' : /\s+/g);

	return candidates
		.map((item) => item.trim())
		.filter((item) => {
			if (item) {
				if (presets.includes(item as ReactionType)) {
					return true;
				}
				core.debug(`Skipping invalid reaction '${item}'.`);
			}
			return false;
		}) as ReactionType[];
}

export async function addReaction(
	octokit: ReturnType<typeof github.getOctokit>,
	comment_id: number,
	reactions: string | string[],
	owner: string = github.context.repo.owner,
	repo: string = github.context.repo.repo,
) {
	const candidates = getReactions(reactions);

	if (candidates.length <= 0) {
		core.debug(`No valid reactions are contained in '${reactions}'.`);
		return;
	}

	core.debug(`Setting '${candidates.join(', ')}' reaction on comment.`);

	const deferreds = candidates.map((content) => {
		try {
			return octokit.rest.reactions.createForIssueComment({
				owner,
				repo,
				comment_id,
				content,
			});
		} catch (err) {
			core.debug(
				`Adding reaction '${content}' to comment failed with: ${(err as Error).message}.`,
			);
			throw err;
		}
	});

	Promise.all(deferreds).catch((e) => {
		throw e;
	});
}
