# Postfix 部署说明

生产环境建议让宿主机或专用邮件入口节点运行 Postfix，并把入站邮件转发到 `mail-ingest:2525`。

后续阶段将补充：
- main.cf
- master.cf
- LMTP / SMTP relay 配置
- 25 端口安全与反垃圾策略
