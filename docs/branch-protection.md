# GitHub `main` 分支保护（管理员）

在仓库 **Settings → Branches → Add branch protection rule** 中针对 `main` 建议启用：

## 推荐选项

| 选项 | 建议 |
| --- | --- |
| Branch name pattern | `main` |
| Require a pull request before merging | 开启 |
| Require approvals | 可选（两人维护时可设为 1） |
| Require status checks to pass before merging | 可选，勾选 CI 工作流中的 **Validate** |
| Require branches to be up to date before merging | 建议开启 |
| Do not allow bypassing the above settings | 按团队规范决定 |

## 不建议

- 允许所有人直接 push 到 `main`（与 [CONTRIBUTING.md](../CONTRIBUTING.md) 冲突）
- 日常对 `main` 使用 force push

## 与部署的关系

合并到 `main` 后会触发 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)。分支保护可确保只有经过 PR（及可选 CI）的变更进入 `main`，从而降低误部署风险。
