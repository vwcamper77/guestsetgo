# Deployment workflow

All Vercel deployments for this workspace must originate from the connected GitHub repository. Commit reviewed changes and push to GitHub; let Vercel's Git integration build and deploy them. Production uses main; other branches use Git-triggered previews.

Do not upload local source or prebuilt output with Vercel CLI, REST API, MCP, deploy hooks, or other direct deployment tools. Do not promote or alias a deployment created from local uploads. Use Vercel tools for inspection, logs, and settings only. If Git deployment fails, fix and push through GitHub. Report a blocked Git deployment instead of bypassing this workflow.
