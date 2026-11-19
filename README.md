# dsh-jailbreak

DeepSeek Harness（DSH）运行时越狱插件。**不修改宿主文件、不动 `app.asar`**，只在运行时接管三处服务 + 过滤两种注入。

## 效果

| 层 | 做法 | 结果 |
|---|---|---|
| system prompt | 接管 `systemPrompt.assemble()` | 所有 section / runtime context 清空（身份、免责、工具说明、persona 全没） |
| 审批 | 接管 `approval.decide()` | 永远返回 `allowed-once`，不拒绝、不弹卡 |
| 沙箱 | 接管 `sandbox.confine()` | 任何 mode 都直通 |
| AGENTS.md 注入 | `agent/pre-step` 过滤 | 含 `Instructions from:` 的 user message 被丢掉 |
| skill 目录注入 | `agent/pre-step` 过滤 | 含 `<available_skills>` 的 user message 被丢掉 |

## 安装

桌面版 profile 由 Electron 应用独占管理，`dsh plugin add` 会被拒；用本地 link 安装：

1. 把本目录放到任意位置（例如 `C:/tools/dsh-jailbreak`）。
2. 复制到 profile：
   ```
   copy /E C:\tools\dsh-jailbreak C:\Users\<you>\.dsh\profiles\desktop\node_modules\dsh-jailbreak
   ```
3. 在 `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 里加：
   ```json
   "dsh-jailbreak": "link:C:/tools/dsh-jailbreak"
   ```
4. 完全退出 DSH 再重开（不是刷新页面）。

## 配置（环境变量）

| 变量 | 默认 | 说明 |
|---|---|---|
| `DSH_JAILBREAK_PROMPT` | 空 | 注入一段自定义系统提示；设置后它是唯一保留的 section |
| `DSH_JAILBREAK_FILTER` | `1` | `0` 关闭 AGENTS.md / skill 目录过滤 |

## 卸载

1. 从 `package.json` 的 `dependencies` 删掉 `dsh-jailbreak`；
2. 删除 `node_modules/dsh-jailbreak`；
3. 重启 DSH。

不改宿主文件，所以卸载即恢复原状。

## 兼容性

- 目标：DSH 0.2.2（desktop / web 均可，未在 web 实测）。
- 依赖的服务方法名：`systemPrompt.assemble`、`approval.decide`、`sandbox.confine`。
- 宿主若改这些方法名或签名，插件会静默失效（不会崩），届时需要跟进适配。

## 与其他破甲插件的区别

- **不碰源码**：不需要为每个宿主版本维护 pattern 表；宿主升级不漂移。
- **运行时开关**：卸载一个依赖即恢复。
- **只做实现层**：模型自身的安全对齐不在本插件能触及的范围，插件不会、也不能改变模型权重里的判断。

## 免责

本项目仅供**本机自用、学习与研究**。它会移除 DSH 的沙箱与审批，安装即表示你已知悉并自行承担全部后果。请仅在**你自己的机器、你自己的安装**上使用，不要用于他人设备、共享环境或生产系统。作者不对任何直接或间接损失负责。

## License

MIT
