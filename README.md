# Team Rotator (Vercel Version)

这是Team Rotator的Vercel版本，使用Next.js和JSON文件存储来替代原有的PostgreSQL数据库，以便在Vercel平台上部署。

## 功能特点

- 团队成员管理
- 任务管理
- 任务轮换分配
- Slack通知集成
- 响应式设计，支持移动设备

## 技术栈

- Next.js 14
- React 18
- Material-UI
- React Query
- TypeScript
- JSON文件存储

## 开始使用

1. 克隆仓库：

```bash
git clone <repository-url>
cd team-rotator-vercel
```

2. 安装依赖：

```bash
npm install
```

3. 从现有数据库导出数据（如果有）：

```bash
npm run export-data
```

4. 启动开发服务器：

```bash
npm run dev
```

5. 访问 http://localhost:3000

## 部署到Vercel

1. 在Vercel上创建新项目
2. 连接到GitHub仓库
3. 部署

## 数据存储

数据存储在`data`目录下的JSON文件中：

- `members.json` - 团队成员信息
- `tasks.json` - 任务信息
- `task_assignments.json` - 任务分配信息
- `system_configs.json` - 系统配置信息

## API端点

- `/api/members` - 成员管理
- `/api/tasks` - 任务管理
- `/api/assignments` - 任务分配管理
- `/api/config` - 系统配置管理
- `/api/assignments/update-rotation` - 任务轮换更新

## 环境变量

不需要设置环境变量，所有配置都存储在`system_configs.json`中。

## 注意事项

- 这个版本使用JSON文件存储数据，适合小型团队使用
- 所有数据更改都会直接写入JSON文件
- Vercel的无服务器环境中，文件系统是只读的，因此数据更改只会在部署时生效 