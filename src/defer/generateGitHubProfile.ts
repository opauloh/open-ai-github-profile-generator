import { defer } from "@defer/client";
import { graphql } from "@octokit/graphql";
import { Configuration, OpenAIApi } from "openai";

interface GitHubUserInfo {
  user: {
    bio: string;
    login: string;
    location: string;
    reposLangs: {
      nodes: {
        name: string;
        languages: {
          edges: {
            size: number;
            node: {
              color: string;
              name: string;
            };
          }[];
        };
      }[];
    };
    reposStars: {
      totalCount: number;
      nodes: {
        name: string;
        stargazers: {
          totalCount: number;
        };
      }[];
    };
  };
  repository: {
    object: {
      text: string;
    };
  };
}

interface GithubInfo {
  location: string;
  stars: number;
  languages: {
    [k: string]: number;
  };
  username: string;
  bio: string;
  readme: string;
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_PA_TOKEN}`,
  },
});

const openAi = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

export async function getGithubInfo(
  githubUsername: string
): Promise<GithubInfo> {
  const result = await graphqlWithAuth<GitHubUserInfo>(
    `
      query userInfo($githubUsername: String!) {
        rateLimit {
          limit
          cost
          remaining
          resetAt
        }
        repository(owner: "${githubUsername}", name: "${githubUsername}") {
          object(expression: "master:README.md") {
            ... on Blob {
              text
            }
          }
        }
        user(login: $githubUsername) {
          bio
          login
          location
          reposLangs: repositories(ownerAffiliations: OWNER, first: 10) {
            nodes {
              name
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    name
                  }
                }
              }
            }
          }
          reposStars: repositories(first: 10, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
            totalCount
            nodes {
              stargazers {
                totalCount
              }
            }
          }
        }
      }
    `,
    {
      githubUsername,
    }
  );
  return {
    location: result.user.location,
    stars: (result.user.reposStars.nodes || []).reduce((sum, node) => {
      return sum + node.stargazers.totalCount;
    }, 0),
    languages: (result.user.reposLangs.nodes || []).reduce(
      (acc, node) => {
        (node.languages.edges || []).forEach((lang) => {
          if (!acc[lang.node.name]) {
            acc[lang.node.name] = lang.size;
          } else {
            acc[lang.node.name] = lang.size + acc[lang.node.name];
          }
          acc.total = acc.total + lang.size;
        });
        return acc;
      },
      { total: 0 } as Record<string, number>
    ),
    username: result.user.login,
    bio: result.user.bio,
    readme: result.repository.object.text,
  };
}

export async function generateGitHubProfile(githubUsername: string) {
  const { location, stars, bio, readme } = await getGithubInfo(githubUsername);

  // with gh data, format a prompt for openai
  const mood = "professional";
  const prompt = `Based on my Github profile: 
  ${readme}
- Write a more ${mood} version of my GitHub Profile, I want also to use words from Never gonna give you up songs to show how good I am. Additional info:
- I Live in ${location}
- I Have ${stars} Github stars
- My bio: ${bio}
`;

  const completion = await openAi.createCompletion({
    prompt,
    model: "text-davinci-003",
    max_tokens: 256,
    temperature: 1,
    top_p: 1,
    best_of: 5,
    frequency_penalty: 1,
    presence_penalty: 0,
  });

  return completion.data.choices[0].text;
}

export default defer(generateGitHubProfile, { concurrency: 10 });
