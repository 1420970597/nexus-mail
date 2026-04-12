# 极径 | Nexus-Mail

**Nexus-Mail** is a high-performance, edge-isolated Catch-All email routing and verification code extraction platform. Designed for automation and scale, it acts as a secure nexus between dynamic domain providers, SMTP sending platforms, and your API consumers. 

Unlike traditional single-node mail servers, Nexus-Mail separates the vulnerable SMTP receiving edge (Port 25) from the core API and database infrastructure. This architecture ensures maximum security, IP anonymity for the main server, and high availability even under direct network attacks.

**Nexus-Mail** 是一个高性能、基于边缘隔离架构的 Catch-All 邮件路由与验证码自动化提取平台。作为连接动态域名供应商、发件平台与 API 用户的“安全枢纽”，它专为高并发验证码接收与自动化脚本流转而设计。

与传统的单节点邮局不同，Nexus-Mail 在物理与网络层面上将脆弱的 SMTP 收信边缘（25 端口）与核心 API 及数据库进行了彻底剥离。这种动静分离的设计不仅保证了核心业务的绝对安全与主服务器 IP 的隐匿，还能在面对外部网络扫描与恶意攻击时提供极高的业务可用性。

### 🛡️ Core Features | 核心特性
* **Edge Isolation Architecture (边缘隔离架构):** Protects your core database and API behind WAFs (like Cloudflare) while using lightweight, disposable edge nodes for SMTP reception.
* **Catch-All Routing (全收件路由):** Automatically captures all incoming emails for managed domains without pre-creating user accounts.
* **Smart Regex Extraction (智能正则提取):** Parses incoming HTML/Text emails on the fly to extract 4-6 digit codes, magic links, and OTPs.
* **RESTful API Delivery (API 分发):** Provides clean, developer-friendly endpoints for fetching generated emails and retrieving parsed verification codes.