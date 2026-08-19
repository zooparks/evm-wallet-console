# EVM Multi-Wallet Asset Management Platform — Product Plan V1

## 1. 产品定位

面向 EVM 多钱包的资产管理与批量链上操作控制台。

核心能力：
- 多钱包统一资产总览
- 多链余额查询
- Wallet / Group / Tag 管理
- 批量 Swap / Bridge / Transfer
- Fixed / Percentage / Random Range / Custom / CSV 金额策略
- 自定义执行时间与时间窗口
- Quote / Simulation / Preview
- Batch Task / Scheduler / Executor
- Task Center / Transaction Tracking
- Retry / Pause / Resume
- 权限、安全与审计

核心目标：把大量钱包的资产管理和链上操作变成可配置、可预览、可监控的批量任务系统。

## 2. 核心用户流程

```text
Wallets
  ↓
选择钱包
  ↓
Operation: Swap / Bridge / Transfer
  ↓
Amount Strategy
  ↓
Schedule Strategy
  ↓
Quote
  ↓
Simulation / Validation
  ↓
Preview
  ↓
Confirm
  ↓
Batch Task
  ↓
Scheduler / Executor
  ↓
Transaction Tracking
  ↓
Success / Failed
```

## 3. 核心对象

### Wallet
Address、Name、Group、Tags、Chains、Balances、Transactions、Tasks。

### Group
钱包集合，可直接用于批量选择。

### Asset
钱包在不同链上的 Native Token 与 ERC-20 等资产。

### Operation
Swap、Bridge、Transfer。

### Batch Task
一次批量操作创建的任务集合。

### Task Item
Batch Task 中单个钱包对应的执行任务。

## 4. Dashboard

展示：
- Total Portfolio
- Wallet Count
- Chain Count
- Token Count
- Pending / Running / Failed Tasks
- Chain / Token Asset Distribution
- Portfolio Trend
- Recent Tasks

## 5. Wallet Management

### Wallet List
支持 Add、Import CSV、Search、Filter、Sort、Group、Tag、Enable / Disable、Archive。

字段：
```text
Name
Address
Group
Tags
Total Assets
Native Balance
Last Activity
Status
```

### Wallet Detail
- Portfolio
- Chain Balances
- Token Balances
- Transactions
- Tasks

### Wallet Group
Create、Rename、Delete、Add / Remove Wallets、Batch Operation。

## 6. Asset Management

Portfolio 支持按 Chain / Token / Group 汇总。

示例：
```text
Ethereum  $520,300
Arbitrum  $310,200
Base      $180,500
```

## 7. Chain Architecture

第一阶段建议：
- Ethereum
- Arbitrum
- Base
- Optimism
- Polygon
- BNB Smart Chain

通过 Chain Adapter 扩展。

统一接口：
```text
getBalance()
getTokenBalance()
estimateGas()
getNonce()
sendTransaction()
getTransaction()
getBlock()
```

## 8. Batch Operation

统一流程：
```text
Wallets
→ Operation
→ Amount
→ Schedule
→ Quote
→ Simulation
→ Preview
→ Confirm
→ Execute
```

## 9. Batch Swap

配置：
```text
Chain
From Token
To Token
Wallets
Amount Strategy
Schedule Strategy
```

每个钱包生成独立 Task Item。

## 10. Amount Strategy

### Fixed
所有符合条件的钱包使用固定金额。

### Percentage
例如 10%～30%，根据钱包可用余额计算。

### Random Range
例如：
```text
Minimum: 80 USDC
Maximum: 300 USDC
Precision: 2
```

系统为每个钱包生成具体金额并执行余额校验。

### Custom
逐钱包指定金额。

### CSV
```csv
wallet,amount
0x123...,100
0x456...,250
```

### Validation
必须检查：
- Wallet Balance
- Native Gas Balance
- Token Balance
- Minimum Balance Rule

## 11. Batch Bridge

配置：
```text
Source Chain
Destination Chain
Token
Wallets
Amount Strategy
Schedule Strategy
```

生命周期：
```text
Source Transaction
↓
Source Confirmed
↓
Bridge Processing
↓
Destination Transaction
↓
Destination Confirmed
↓
Balance Updated
```

## 12. Batch Transfer

支持：
- Wallet → Wallet
- Wallet → Address
- Same Chain
- 多钱包批量发送

## 13. Schedule System

支持：
- Immediate
- Fixed Time
- Time Window
- Custom

配置：
```text
Start Time
End Time
Minimum Interval
Maximum Concurrency
Retry Policy
Timezone
```

调度结果示例：
```text
Wallet 001  18:07:32
Wallet 002  18:23:51
Wallet 003  18:41:08
```

> 时间策略用于任务调度与执行负载控制；实际执行仍受链上状态、余额、Gas、Quote、Simulation 和安全规则约束。

## 14. Quote / Simulation

执行前检查：
```text
Balance Check
Gas Check
Allowance Check
Quote
Simulation
Slippage Check
Chain Status Check
```

输出：
```text
97 Ready
3 Attention
```

## 15. Preview

Preview 是批量执行前的强制确认阶段。

展示：
- Wallet Count
- Total Input
- Estimated Output
- Estimated Gas
- Fees
- 每钱包 Amount
- Scheduled Time
- Quote
- Validation Status

支持 Search、Filter、Sort、Export、Regenerate。

## 16. Batch Task

Batch Task 状态：
```text
Draft
Scheduled
Running
Completed
Partial Failed
Failed
Cancelled
```

Task Item 状态：
```text
Scheduled
Queued
Preparing
Quoted
Simulated
Submitted
Pending
Success
Failed
Retrying
Cancelled
```

Task Item 保存：
```text
Wallet
Operation
Chain
Token
Amount
Scheduled Time
Actual Time
Quote
Gas
Tx Hash
Error
Retry Count
```

## 17. Task Center

统一管理：
- Scheduled
- Running
- Success
- Failed
- Cancelled

支持 Search、Filter、Sort、Date Range、Chain、Operation、Status。

控制：
```text
Pause
Resume
Cancel Scheduled
Retry Failed
Export Results
```

已经广播到链上的交易不能通过应用层撤销。

## 18. Retry

可重试：
- RPC Timeout
- Quote Expired
- Temporary Provider Error
- Nonce Conflict
- Temporary Network Issue

不建议自动重试：
- Insufficient Balance
- Invalid Configuration
- Unsupported Token
- Simulation Failure
- Permission Failure

支持 Max Retry Count、Backoff、Retryable Error Types。

## 19. Transaction Tracking

记录：
```text
Tx Hash
Chain
Block
Gas Used
Gas Price
Status
Timestamp
Explorer URL
```

## 20. 数据模型

核心实体：
```text
users
wallets
wallet_groups
wallet_tags
chains
tokens
wallet_balances
rpc_endpoints
operations
batch_tasks
task_items
quotes
simulations
transactions
bridge_messages
schedules
retry_records
audit_logs
```

BatchTask：
```text
id
type
source_chain
destination_chain
from_token
to_token
wallet_count
amount_strategy
schedule_strategy
status
created_by
created_at
updated_at
```

TaskItem：
```text
id
batch_task_id
wallet_id
amount
scheduled_at
status
tx_hash
retry_count
error_code
error_message
started_at
completed_at
updated_at
```

## 21. 系统架构

```text
Frontend
   ↓
API / Backend
   ├── Wallet Service
   ├── Asset Service
   ├── Task Service
   ├── Scheduler
   └── Executor
          ↓
     Chain Adapters
          ├── Ethereum
          ├── Arbitrum
          └── Base
```

Scheduler 负责时间和队列；Executor 负责具体 Task Item 的链上生命周期。

## 22. Queue / Nonce / RPC

Queue 支持：
- Concurrency Limit
- Rate Limit
- Retry
- Backoff
- Dead Letter Queue

同一 Wallet + Chain 使用可靠的 Nonce Manager。

RPC 支持：
- 多 Provider
- Health Check
- Latency
- Error Rate
- Priority
- Failover

## 23. 安全

核心原则：

> 私钥不应以明文形式保存在普通业务数据库。

建议：
```text
Frontend
 ↓
Backend
 ↓
Signer / Key Management Layer
 ↓
Blockchain
```

Signer 与普通 API 服务隔离。

权限角色：
```text
Owner
Admin
Operator
Viewer
```

## 24. 风控

可配置：
```text
Max Batch Wallet Count
Max Total Amount
Max Single Wallet Amount
Allowed Chains
Allowed Tokens
Allowed Operations
Require Approval
```

## 25. Audit Log

记录：
```text
Who
What
When
Wallet
Operation
Task
Result
```

## 26. API 模块

```text
/api/auth
/api/wallets
/api/groups
/api/assets
/api/chains
/api/tokens
/api/swap
/api/bridge
/api/transfer
/api/quotes
/api/simulation
/api/tasks
/api/transactions
/api/settings
/api/audit
```

## 27. MVP

### Phase 1
- Wallet Import
- Wallet List / Group
- Multi-chain Balance
- Portfolio
- Fixed / Custom Amount
- Batch Swap
- Preview
- Task Queue
- Transaction Tracking

### Phase 2
- Random Range
- Percentage Strategy
- Time Window
- Custom Schedule
- Retry
- Pause / Resume
- Batch Bridge
- Quote / Simulation
- Task Center

### Phase 3
- Multi RPC
- Multiple Swap Providers
- Multiple Bridge Providers
- Approval Rules
- Role Permissions
- Audit Logs
- Advanced Analytics
- CSV Import / Export

## 28. 推荐技术栈

Frontend：
```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
TanStack Table
```

Backend：
```text
Node.js
TypeScript
NestJS / Fastify
```

Data / Queue：
```text
PostgreSQL
Redis
BullMQ
```

Blockchain：
```text
viem
```

## 29. 项目结构

```text
project/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── blockchain/
│   ├── chains/
│   ├── swap-adapters/
│   ├── bridge-adapters/
│   ├── task-engine/
│   └── shared/
└── infrastructure/
    ├── postgres/
    ├── redis/
    └── docker/
```

## 30. MVP 成功标准

用户能够：
1. 导入一批钱包
2. 查看所有钱包总资产
3. 查看不同链余额
4. 选择多个钱包
5. 创建批量 Swap
6. 为钱包配置不同金额
7. 配置执行时间窗口
8. Preview 全部任务
9. 创建 Batch Task
10. 查看每个钱包执行状态
11. 查看 Transaction
12. 定位失败原因
13. 对可重试失败任务 Retry

## 31. 最终产品结构

```text
Dashboard
   │
   ├── Wallets
   │      ↓
   │   Batch Operation
   │      ├── Swap
   │      ├── Bridge
   │      └── Transfer
   │             ↓
   │      Amount Strategy
   │             ↓
   │      Schedule Strategy
   │             ↓
   │      Quote / Simulation
   │             ↓
   │          Preview
   │             ↓
   │         Batch Task
   │             ↓
   │         Scheduler
   │             ↓
   │          Executor
   │             ↓
   │       Transactions
   │             ↓
   └──────── Task Center
```

## 32. 产品核心原则

整个系统围绕三个核心对象：

```text
WALLETS
   ↓
OPERATIONS
   ↓
TASKS
```

核心体验：

> 统一管理钱包 → 统一查看资产 → 批量配置操作 → Preview → 创建任务 → 自动调度 → 链上执行 → 实时监控。

前端 UI/UX 原型作为独立文档与本产品规划配套使用。
