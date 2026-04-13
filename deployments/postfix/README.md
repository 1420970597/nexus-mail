# Postfix 部署说明

生产环境建议让宿主机或专用邮件入口节点运行 Postfix，并把入站邮件转发到 `mail-ingest:2525`。

## 当前仓库提供的样例
- `main.cf`：将所有入站邮件通过 SMTP 转发到 `mail-ingest:2525`
- `master.cf`：最小可运行服务定义，可作为宿主机 Postfix 基线配置

## 建议接入方式
1. 宿主机监听 `25` 端口
2. `myhostname` 改成你的真实 MX 主机名
3. 在宿主机 `/etc/postfix/main.cf` 中引用本仓库的 `main.cf` 参数
4. 保证宿主机到 Docker 网络里的 `mail-ingest:2525` 可达
5. 测试域名 MX 指向该宿主机后，再从外部邮箱投递验证

## 关键参数说明
- `virtual_transport = smtp:[mail-ingest]:2525`
  - 将本机接收的邮件转发到 `mail-ingest`
- `relay_transport = smtp:[mail-ingest]:2525`
  - 对 relay 流量同样走 ingest
- `local_recipient_maps =`
  - 关闭本地用户存在性检查，适合 catch-all/动态邮箱平台
- `message_size_limit = 10485760`
  - 默认限制 10MB，可按业务需要调整

## 推荐验证命令
```bash
postfix check
postfix reload
postconf -n
```

## 下一步
下一阶段会继续补充：
- LMTP / SMTP relay 更细致的生产配置
- 25 端口安全与反垃圾策略
- Postfix -> mail-ingest 联调与真实域名投递验证记录
