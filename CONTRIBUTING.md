# 协作开发约定

本仓库由多人维护。为避免互相覆盖、便于回滚，**请不要在本地长期直接修改 `main` 并 push**。

## 日常流程

### 1. 同步主分支

```sh
git checkout main
git pull origin main
```

### 2. 创建功能分支

```sh
git checkout -b feat/简短描述
# 修复类可用 fix/简短描述
```

### 3. 开发与自测

在分支上修改代码并本地验证（例如 `make dev` 或 `npm run dev`、`make test` 或 `cd backend && go test ./...`）。

### 4. 提交并推送分支

```sh
git add <文件>
git commit -m "说明做了什么、为什么"
git push -u origin feat/简短描述
```

**不要**执行 `git push origin main`（除非紧急流程且已与同事确认）。

### 5. 在 GitHub 开 Pull Request

- Base 分支：`main`
- Compare 分支：你的 `feat/*` 或 `fix/*`
- 请同事 review 后合并

合并到 `main` 后，CI 会按 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 自动校验并部署。

## 分支命名建议

| 前缀 | 用途 |
| --- | --- |
| `feat/` | 新功能、UI、品牌等 |
| `fix/` | 缺陷修复 |
| `docs/` | 仅文档 |
| `chore/` | 构建、依赖、杂项 |

## 回滚

- **推荐**：在 GitHub 对已合并 PR 使用 **Revert**，或本地 `git revert <commit>` 后 push `main`
- **避免**：对 `main` 使用 `git push --force`，除非团队明确同意且同事已协调

## 管理员可选设置

建议在 GitHub 为 `main` 配置分支保护，见 [docs/project/branch-protection.md](docs/project/branch-protection.md)。

## 本地 main 已与远程不一致时

若你已在本地 `main` 上提交了未推送的改动：

```sh
git checkout -b feat/你的分支名    # 从当前 main 拉出，保留所有提交
git push -u origin feat/你的分支名
git checkout main
git reset --hard origin/main       # 仅当上述分支已包含你的提交时
```

然后在 GitHub 用 PR 合并功能分支。
