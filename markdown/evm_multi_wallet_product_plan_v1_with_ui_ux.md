# EVM 多钱包资产与批量交易管理平台 — 产品规划 V1

## 1. 产品定位

构建一个面向**自有钱包资产管理与批量链上操作**的 EVM 钱包运营控制台。

核心能力：

> 一次管理一批钱包，统一查看多链资产，并通过统一任务系统执行 Swap、Bridge、Transfer 等操作。

### 核心目标

- 管理大量 EVM 钱包
- 查看钱包总资产、多链资产、Token 余额
- 钱包分组、标签和筛选
- 批量执行 Swap
- 批量执行跨链 Bridge
- 支持固定、比例、自定义、范围金额
- 支持自定义调度时间窗口
- 一键生成批量任务
- 交易前 Preview / Simulation
- 任务队列与实时状态监控
- 失败任务 Retry
- 完整操作日志和安全控制

> 设计原则：不同金额和不同时间用于正常的批量运营、任务调度和资源分散；不以规避链上风控、反女巫或 AML 检测为产品目的。

---

# 2. 产品整体架构

```text
┌─────────────────────────────────────────────────────┐
│                    Dashboard                        │
│                                                     │
│ 总钱包数   总资产   Ethereum   Arbitrum   Base ... │
└───────────────────────┬─────────────────────────────┘
                        │
       ┌────────────────┼─────────────────┐
       │                │                 │
       ▼                ▼                 ▼
   钱包管理          资产管理          Operations
       │                │          ┌──────┼──────┐
       │                │          ▼      ▼      ▼
       ▼                ▼        Swap   Bridge Transfer
   钱包列表          多链余额       │      │      │
   钱包分组          Token余额      └──────┼──────┘
   钱包标签          USD估值              ▼
                                  Batch Builder
                                         │
                             ┌───────────┴───────────┐
                             ▼                       ▼
                      Amount Strategy        Schedule Strategy
                             │                       │
                             └───────────┬───────────┘
                                         ▼
                                  Task Scheduler
                                         │
                                         ▼
                                  Transaction Engine
                                         │
                                         ▼
                                  Transaction Monitor
```

---

# 3. 页面结构

## 3.1 Dashboard

首页统一展示整个钱包体系的资产状况。

### 核心指标

- Total Portfolio Value
- Wallet Count
- Active Wallets
- Chain Count
- Token Count
- 24h Portfolio Change
- Pending Tasks
- Failed Tasks

### 链资产分布

```text
Ethereum       $520,300
Arbitrum       $310,200
Base           $180,500
BSC            $150,200
Polygon        $122,220
```

### Token 分布

```text
ETH            $520,000
USDC           $450,000
USDT           $210,000
WETH            $80,000
Others          $23,420
```

### 资产趋势

支持：

- 24H
- 7D
- 30D
- 90D

---

# 4. Wallets 钱包管理

## 4.1 钱包列表

字段：

| 字段 | 说明 |
|---|---|
| Name | 钱包名称 |
| Address | 钱包地址 |
| Group | 钱包分组 |
| Tags | 标签 |
| Total Assets | 总资产 |
| Native Balance | 原生币余额 |
| Status | 钱包状态 |
| Last Sync | 最后同步时间 |

支持：

- 搜索地址
- 搜索名称
- 分组筛选
- 标签筛选
- 链筛选
- 资产范围筛选
- 多选钱包
- 批量加入任务

## 4.2 Wallet Detail

展示：

### 基础信息

- Wallet Name
- Address
- Group
- Tags
- Created At
- Last Activity

### 多链资产

```text
Ethereum       $10,230
Arbitrum        $5,120
Base            $2,880
```

### Token

```text
Token   Chain       Amount       USD Value
ETH     Ethereum    2.31         $7,850
USDC    Ethereum    2,100        $2,100
USDC    Arbitrum    1,800        $1,800
WETH    Base        0.72         $2,880
```

### 交易历史

- Swap
- Bridge
- Transfer
- Approve
- Contract Interaction

---

# 5. Wallet Groups

钱包支持分组，例如：

```text
Main              100 wallets
Trading           150 wallets
Test               50 wallets
Operations         80 wallets
Others             120 wallets
```

同时支持标签：

```text
ETH
USDC
DeFi
Active
Test
```

批量操作时可以：

```text
选择 Group
      ↓
自动选择该组全部钱包
      ↓
设置 Operation
```

---

# 6. Assets 资产管理

## 6.1 Chain

第一阶段支持：

- Ethereum
- Arbitrum
- Base
- Optimism
- BSC
- Polygon
- Avalanche

后续可以继续增加其他 EVM 网络。

## 6.2 Token

Token 需要按：

```text
Chain + Contract Address
```

进行唯一识别。

例如：

```text
Ethereum USDC
Arbitrum USDC
Base USDC
```

不能简单只用 `USDC` 作为唯一标识。

## 6.3 Balance Indexer

后台定期同步：

- Native Token
- ERC-20
- Token USD Value
- Block Number
- Updated At

---

# 7. Operations

统一入口：

```text
Operations

├── Swap
├── Bridge
└── Transfer
```

未来可以增加：

```text
├── Approve
├── Wrap
├── Unwrap
└── Contract Call
```

所有操作复用同一个 Batch Builder。

---

# 8. Batch Builder

这是整个产品的核心。

统一流程：

```text
选择钱包
   ↓
选择操作
   ↓
选择链
   ↓
选择 Token
   ↓
设置金额策略
   ↓
设置时间策略
   ↓
设置执行规则
   ↓
获取 Quote
   ↓
Simulation
   ↓
Preview
   ↓
Confirm
   ↓
生成 Task
```

---

# 9. Amount Strategy 金额策略

支持四种模式。

## 9.1 Fixed

每个钱包使用固定金额。

```text
Amount: 100 USDC
```

适合简单批量操作。

## 9.2 Percentage

根据每个钱包余额计算。

```text
Min: 10%
Max: 30%
```

例如：

```text
Wallet 001
USDC Balance: 1000
Selected: 20%
Amount: 200 USDC
```

## 9.3 Random Range

在合法的金额范围内生成每个钱包的执行金额。

```text
Min: 80 USDC
Max: 300 USDC
```

生成结果示例：

```text
Wallet 001 → 127.43 USDC
Wallet 002 → 284.17 USDC
Wallet 003 → 96.82 USDC
Wallet 004 → 231.55 USDC
```

系统应提供：

- Minimum
- Maximum
- Decimal Precision
- Optional uniqueness constraint

## 9.4 Custom / CSV

支持每个钱包独立设置金额。

```csv
wallet,amount
0x123...,100
0x456...,250
0x789...,80
```

导入后进入 Preview。

---

# 10. Schedule Strategy 时间策略

## 10.1 Immediate

立即进入执行队列。

## 10.2 Fixed Time

指定统一执行时间。

适合内部批量运维场景。

## 10.3 Time Window

指定允许执行的时间窗口。

```text
Start: 18:00
End:   23:00
```

Scheduler 在窗口内安排任务。

可以设置：

- Minimum interval
- Maximum concurrency
- Per-wallet queue
- Retry delay

## 10.4 Custom Schedule

允许高级用户直接编辑每个 Task 的计划时间。

```text
Wallet 001 → 18:07
Wallet 002 → 18:23
Wallet 003 → 18:41
```

系统应避免无意中创建同一钱包的冲突任务。

---

# 11. One-Click Batch Execution

用户最终操作体验：

```text
Batch Operation

Operation
[ Swap ]

Chain
[ Ethereum ]

From
[ USDC ]

To
[ ETH ]

Wallets
127 selected

Amount Strategy
[ Random Range ]

Min
80 USDC

Max
300 USDC

Schedule
[ Time Window ]

18:00 — 23:00

Concurrency
10

[ Preview ]   [ Create Batch ]
```

点击 `Create Batch` 后：

```text
生成 127 个 Task
        ↓
进行 Quote / Simulation
        ↓
检查余额 / Gas / 参数
        ↓
进入 Scheduled Queue
        ↓
Scheduler 自动执行
```

---

# 12. Swap

## 12.1 Swap 流程

```text
Select Wallets
      ↓
Select Chain
      ↓
From Token
      ↓
To Token
      ↓
Amount Strategy
      ↓
Quote
      ↓
Simulation
      ↓
Preview
      ↓
Confirm
      ↓
Task
```

## 12.2 Swap Preview

```text
Ethereum

USDC → ETH

Wallets: 127
Total Input: 32,450 USDC

Estimated Output: 10.21 ETH
Estimated Gas: $183
Slippage: 0.5%
```

每个钱包：

| Wallet | Input | Estimated Output | Gas | Status |
|---|---:|---:|---:|---|
| 001 | 127.43 | 0.039 ETH | $1.82 | Ready |
| 002 | 284.17 | 0.087 ETH | $1.75 | Ready |
| 003 | 96.82 | 0.030 ETH | $1.91 | Ready |

---

# 13. Bridge

## 13.1 Bridge 流程

```text
Source Chain
      ↓
Destination Chain
      ↓
Token
      ↓
Wallets
      ↓
Amount Strategy
      ↓
Schedule Strategy
      ↓
Bridge Quote
      ↓
Preview
      ↓
Confirm
      ↓
Bridge Task
```

示例：

```text
Ethereum → Arbitrum
USDC

Wallet 001 → 100 USDC
Wallet 002 → 250 USDC
Wallet 003 → 500 USDC
```

系统需要持续追踪：

- Source Transaction
- Bridge Status
- Destination Transaction
- Destination Balance

---

# 14. Task Center

所有操作统一进入 Task Center。

## Task 状态

```text
Draft
↓
Quoted
↓
Simulated
↓
Scheduled
↓
Running
↓
Submitted
↓
Confirmed
```

异常状态：

```text
Failed
Retrying
Cancelled
Expired
```

## Batch Task

```text
Task #20260817-001

Type: Batch Swap
Chain: Ethereum
USDC → ETH

Total Wallets: 127

Success:     82
Running:      8
Scheduled:   32
Failed:       5
```

---

# 15. Task Detail

每个钱包一个独立 Task Item。

```text
Wallet 001

Amount:
127.43 USDC

Scheduled:
18:07:32

Status:
Success

Transaction:
0x123...
```

失败：

```text
Wallet 004

Amount:
231.55 USDC

Status:
Failed

Reason:
Insufficient native token for gas

[Retry]
```

---

# 16. Scheduler

Scheduler 是系统核心服务之一。

```text
Batch Task
    ↓
Task Items
    ↓
Scheduler
    ↓
判断 Scheduled At
    ↓
Execution Queue
    ↓
Transaction Executor
```

建议支持：

- 最大并发数
- 每钱包独立队列
- Retry
- Exponential Backoff
- RPC Failover
- Task Timeout
- Quote Expiration
- Gas Threshold

---

# 17. Transaction Executor

执行前：

```text
1. 检查 Wallet 状态
2. 检查 Native Balance
3. 检查 Token Balance
4. 检查 Allowance
5. 获取最新 Quote
6. Simulation
7. 检查 Slippage
8. 构造 Transaction
9. 获取正确 Nonce
10. Sign
11. Broadcast
12. Monitor
```

执行后：

```text
Pending
   ↓
Confirmed / Failed
   ↓
更新 Wallet Balance
   ↓
更新 Task
   ↓
记录 Transaction
```

---

# 18. Nonce 与队列

同一个 EVM 地址的交易需要严格管理 nonce。

建议架构：

```text
Scheduler
    │
    ├── Wallet 001 Queue
    ├── Wallet 002 Queue
    ├── Wallet 003 Queue
    └── Wallet 004 Queue
```

而不是让多个 Worker 无限制地同时发送同一个钱包的交易。

---

# 19. 安全架构

不要将私钥明文放在普通数据库。

建议：

```text
Web UI
   ↓
Backend API
   ↓
Transaction Service
   ↓
Signer / Key Vault
   ↓
RPC
```

支持的签名方式可以包括：

- 加密 Key Vault
- Hardware Wallet
- External Signer
- 多签钱包

安全能力：

- 私钥加密
- 权限控制
- 交易审批
- 操作日志
- Session 管理
- API Key 权限
- 风险检查
- 防重复执行

---

# 20. 数据库设计

核心实体：

```text
users
wallets
wallet_groups
wallet_tags
wallet_tag_relations

chains
tokens
wallet_balances
token_prices

batch_tasks
task_items

swap_tasks
bridge_tasks
transfer_tasks

quotes
simulations

transactions
transaction_logs

rpc_endpoints
signers
audit_logs
```

关系：

```text
User
 │
 └── Wallet
       │
       ├── Group
       ├── Tags
       └── Balances
             │
             ├── Chain
             └── Token

BatchTask
 │
 └── TaskItem
       │
       └── Transaction
```

---

# 21. 推荐技术栈

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Node.js
- TypeScript
- NestJS / Fastify

## Database

- PostgreSQL

## Queue

- Redis
- BullMQ

## EVM

- viem
- EVM RPC Provider

## Indexing

第一版可以：

- RPC
- Event Logs
- Multicall

后续再增加专用 Indexer。

---

# 22. MVP 开发阶段

## Phase 1 — Asset Management

- [ ] 钱包导入
- [ ] 钱包分组
- [ ] 钱包标签
- [ ] 多链余额
- [ ] Token 余额
- [ ] USD 估值
- [ ] Dashboard
- [ ] Wallet Detail
- [ ] Transaction History

## Phase 2 — Swap

- [ ] Quote
- [ ] Simulation
- [ ] 单钱包 Swap
- [ ] 批量钱包选择
- [ ] Fixed Amount
- [ ] Percentage Amount
- [ ] Random Range
- [ ] Custom Amount
- [ ] CSV Import
- [ ] Batch Preview
- [ ] Task Center
- [ ] Retry

## Phase 3 — Scheduler

- [ ] Immediate
- [ ] Fixed Time
- [ ] Time Window
- [ ] Custom Schedule
- [ ] Concurrency
- [ ] Queue
- [ ] Retry
- [ ] Task Monitor

## Phase 4 — Bridge

- [ ] Bridge Quote
- [ ] 单钱包 Bridge
- [ ] 批量 Bridge
- [ ] Amount Strategy
- [ ] Schedule Strategy
- [ ] Destination Tracking
- [ ] Retry

## Phase 5 — Security & Operations

- [ ] Key Vault
- [ ] External Signer
- [ ] 权限
- [ ] 审批
- [ ] Audit Log
- [ ] RPC Failover
- [ ] Gas Management
- [ ] Monitoring

---

# 23. 最终产品工作流

```text
                    Dashboard
                        │
                        ▼
                     Wallets
                        │
                 选择钱包 / 分组
                        │
                        ▼
                  Batch Builder
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
      Amount Strategy        Schedule Strategy
            │                       │
            └───────────┬───────────┘
                        ▼
                  Quote / Simulation
                        │
                        ▼
                     Preview
                        │
                        ▼
                  Confirm Batch
                        │
                        ▼
                  Task Scheduler
                        │
                        ▼
                Transaction Executor
                        │
                        ▼
                   Blockchain
                        │
                        ▼
                 Monitor / Retry
                        │
                        ▼
                  Update Assets
```

---

# 24. V1 最终菜单

```text
EVM Wallet Console

├── Dashboard
│
├── Wallets
│   ├── All Wallets
│   ├── Groups
│   └── Tags
│
├── Assets
│   ├── Overview
│   ├── Chains
│   └── Tokens
│
├── Operations
│   ├── Swap
│   ├── Bridge
│   └── Transfer
│
├── Tasks
│   ├── All
│   ├── Scheduled
│   ├── Running
│   ├── Success
│   └── Failed
│
├── Transactions
│
└── Settings
    ├── Chains
    ├── RPC
    ├── Signers
    ├── Security
    └── Audit Logs
```

---

# 25. 产品核心原则

整个系统最终围绕 5 个核心对象设计：

```text
Wallet
   ↓
Asset
   ↓
Operation
   ↓
Task
   ↓
Transaction
```

其中：

**Wallet** 管理“谁来执行”。

**Asset** 管理“有什么资产”。

**Operation** 定义“要做什么”。

**Task** 定义“什么时候、以什么参数执行”。

**Transaction** 记录“链上最终发生了什么”。

这样后续即使增加新的链、新的 Swap 路由、新的 Bridge Provider 或新的批量操作，也不需要重做整个系统。

---

# EVM 多钱包资产与批量交易管理平台 — UI/UX 原型规划

## 1. UI 设计目标

前端围绕一条核心用户路径设计：

```text
Wallets
  ↓
选择钱包
  ↓
选择 Operation
  ↓
设置 Amount Strategy
  ↓
设置 Schedule Strategy
  ↓
Quote / Simulation
  ↓
Preview
  ↓
Confirm
  ↓
Task Center
  ↓
实时监控
```

设计重点：

- 批量钱包选择要高效
- Swap / Bridge 使用统一交互模式
- 金额策略和时间策略可视化
- 执行前必须有 Preview
- 执行后进入统一 Task Center
- 大批量任务使用表格、筛选、进度和状态标签
- 任何失败都可以定位到具体钱包和具体原因

---

# 2. 全局 Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo / Product Name                 Search   🔔   User / ⚙   │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ Dashboard     │                                              │
│               │                 Main Content                 │
│ Wallets       │                                              │
│               │                                              │
│ Assets        │                                              │
│               │                                              │
│ Operations    │                                              │
│  ├ Swap       │                                              │
│  ├ Bridge     │                                              │
│  └ Transfer   │                                              │
│               │                                              │
│ Tasks         │                                              │
│               │                                              │
│ Transactions  │                                              │
│               │                                              │
│ Settings      │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

### Sidebar

- Dashboard
- Wallets
- Assets
- Operations
  - Swap
  - Bridge
  - Transfer
- Tasks
- Transactions
- Settings

---

# 3. Dashboard

## 页面结构

```text
Dashboard

┌────────────────────────────────────────────────────────────┐
│ Total Portfolio                                             │
│ $1,283,420.52                         +2.31% Today           │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Wallets      │ Chains       │ Tokens       │ Pending Tasks │
│ 500          │ 8            │ 126          │ 23            │
└──────────────┴──────────────┴──────────────┴───────────────┘

Asset Distribution
┌────────────────────────────────────────────────────────────┐
│ Ethereum      $520,300                                      │
│ Arbitrum      $310,200                                      │
│ Base          $180,500                                      │
│ BSC           $150,200                                      │
│ Polygon       $122,220                                      │
└────────────────────────────────────────────────────────────┘

Portfolio Trend
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                       ╭────╮                               │
│              ╭────────╯    ╰──────                         │
│       ╭──────╯                                             │
│───────╯                                                    │
└────────────────────────────────────────────────────────────┘

Recent Tasks
┌────────┬──────────┬─────────┬────────────┬──────────┐
│ Task   │ Type     │ Wallets │ Progress   │ Status   │
├────────┼──────────┼─────────┼────────────┼──────────┤
│ #1001  │ Swap     │ 100     │ 82 / 100   │ Running  │
│ #1002  │ Bridge   │ 80      │ 50 / 80    │ Running  │
└────────┴──────────┴─────────┴────────────┴──────────┘
```

## 组件

- Portfolio Summary
- KPI Cards
- Chain Distribution
- Token Distribution
- Portfolio Chart
- Recent Tasks
- Recent Transactions

## 状态

- Loading
- Empty Wallet
- RPC Syncing
- Partial Data
- Error

---

# 4. Wallets 页面

## 页面结构

```text
Wallets

[ Search address / name ]
[ Group ▼ ] [ Chain ▼ ] [ Asset ▼ ] [ Status ▼ ]

[ + Add Wallet ] [ Import CSV ] [ Batch Operation ]

Selected: 0

┌──┬──────────┬──────────────┬──────────┬──────────┬─────────┐
│☐ │ Name     │ Address      │ Group    │ Assets   │ Status  │
├──┼──────────┼──────────────┼──────────┼──────────┼─────────┤
│☐ │ Wallet01 │ 0x123...567  │ Trading  │ $18.2K   │ Active  │
│☐ │ Wallet02 │ 0xabc...789  │ Trading  │ $12.8K   │ Active  │
│☐ │ Wallet03 │ 0xdef...123  │ Main     │ $31.2K   │ Active  │
└──┴──────────┴──────────────┴──────────┴──────────┴─────────┘
```

## 批量选择

选中钱包后，顶部出现：

```text
Selected: 100

[ Batch Swap ]
[ Batch Bridge ]
[ Batch Transfer ]
```

支持：

- Select All
- Select Current Page
- Select Group
- Clear Selection
- Invert Selection

---

# 5. Wallet Detail

```text
← Back to Wallets

Wallet 001
0x1234...5678

Total Assets
$18,230.22

┌────────────┬────────────┬────────────┐
│ Ethereum   │ Arbitrum   │ Base       │
│ $10,230    │ $5,120     │ $2,880     │
└────────────┴────────────┴────────────┘
```

### Tabs

- Overview
- Assets
- Transactions
- Tasks

### Assets Table

```text
Token   Chain       Balance       USD Value
ETH     Ethereum    2.31         $7,850
USDC    Ethereum    2,100        $2,100
USDC    Arbitrum    1,800        $1,800
WETH    Base        0.72         $2,880
```

---

# 6. Batch Operation Wizard

Swap、Bridge、Transfer 统一使用 Wizard。

```text
① Wallets
   →
② Operation
   →
③ Amount
   →
④ Schedule
   →
⑤ Preview
   →
⑥ Execute
```

顶部显示进度。

---

# 7. Step 1 — Select Wallets

```text
Batch Swap

① Wallets   ② Swap   ③ Amount   ④ Schedule   ⑤ Preview

[ Search ]

Group
[ Trading ▼ ]

☑ Wallet 001
☑ Wallet 002
☑ Wallet 003
☑ Wallet 004
...

Selected: 100 wallets

                         [Next]
```

### UX

- 左侧筛选
- 中间钱包列表
- 顶部 Selected Count
- 支持按 Group 一键选择
- 进入下一步时保存当前选择

---

# 8. Step 2 — Operation

## Swap

```text
Network
[ Ethereum ▼ ]

From Token
[ USDC ▼ ]

To Token
[ ETH ▼ ]

Wallets
100 selected

[Next]
```

## Bridge

```text
Source Chain
[ Ethereum ▼ ]

Destination Chain
[ Arbitrum ▼ ]

Token
[ USDC ▼ ]

Wallets
100 selected

[Next]
```

---

# 9. Step 3 — Amount Strategy

```text
Amount Strategy

┌─────────────────────────────────────────────┐
│ ○ Fixed                                     │
│ ○ Percentage                                │
│ ● Random Range                              │
│ ○ Custom                                    │
│ ○ Import CSV                                │
└─────────────────────────────────────────────┘
```

## Random Range

```text
Minimum
[ 80.00 ]

Maximum
[ 300.00 ]

Decimal Precision
[ 2 ]

☑ Avoid duplicate amounts
```

### 实时预览

```text
Wallet       Balance      Generated Amount
──────────────────────────────────────────
Wallet 001   820 USDC     127.43 USDC
Wallet 002   560 USDC     284.17 USDC
Wallet 003   910 USDC      96.82 USDC
Wallet 004   300 USDC     231.55 USDC
```

## Percentage

```text
Minimum
[ 10% ]

Maximum
[ 30% ]
```

## Custom

直接编辑每个钱包：

```text
Wallet       Amount
001          100
002          237
003           82
004          351
```

## CSV

```text
[ Upload CSV ]

Expected:
wallet,amount
0x123...,100
0x456...,250
```

---

# 10. Step 4 — Schedule Strategy

```text
Schedule Strategy

○ Immediate
○ Fixed Time
● Time Window
○ Custom
```

## Time Window

```text
Start
[ 18:00 ]

End
[ 23:00 ]

Minimum Interval
[ 30 sec ]

Maximum Concurrent Tasks
[ 10 ]

☑ Preview generated schedule
```

### 时间预览

```text
Wallet       Amount       Scheduled
────────────────────────────────────
001          127.43       18:07:32
002          284.17       18:23:51
003           96.82       18:41:08
004          231.55       19:16:44
```

---

# 11. Step 5 — Quote / Simulation

进入 Preview 前执行：

1. Balance Check
2. Gas Check
3. Allowance Check
4. Quote
5. Simulation
6. Slippage Check
7. Task Validation

UI：

```text
Preparing Preview...

✓ Wallet balance
✓ Native gas balance
✓ Token allowance
✓ Quote
✓ Simulation

127 wallets ready
3 wallets require attention
```

---

# 12. Step 6 — Preview

这是批量操作最重要的确认页面。

```text
Batch Swap Preview

Ethereum
USDC → ETH

Wallets
100

Total Input
24,832.41 USDC

Estimated Output
7.82 ETH

Estimated Gas
$183.20

Slippage
0.5%
```

### Task Table

```text
Wallet       Amount       Time       Status
────────────────────────────────────────────
001          127.43       18:07      Ready
002          284.17       18:23      Ready
003           96.82       18:41      Ready
004          231.55       19:16      Ready
```

底部：

```text
[ Regenerate ]
[ Cancel ]
[ Confirm & Create ]
```

---

# 13. Regenerate

如果金额/时间策略采用范围生成，可以重新生成 Preview。

```text
Regenerate Preview?

Current generated values will be replaced.

[Cancel] [Regenerate]
```

重新生成后必须再次 Preview。

---

# 14. Task Center

```text
Tasks

[All] [Scheduled] [Running] [Success] [Failed]

┌────────┬──────────┬─────────┬────────────┬──────────┐
│ Task   │ Type     │ Wallets │ Progress   │ Status   │
├────────┼──────────┼─────────┼────────────┼──────────┤
│ #1001  │ Swap     │ 100     │ 82 / 100   │ Running  │
│ #1002  │ Bridge   │ 80      │ 50 / 80    │ Running  │
│ #1003  │ Transfer │ 200     │ 200 / 200  │ Success  │
└────────┴──────────┴─────────┴────────────┴──────────┘
```

支持：

- Search
- Filter
- Sort
- Date Range
- Type
- Chain
- Status

---

# 15. Task Detail

```text
Batch Swap #1001

Ethereum
USDC → ETH

100 Wallets

Success       82
Running        5
Scheduled      8
Failed         5
```

进度条：

```text
████████████████░░░░ 82%
```

### Task Items

```text
Wallet      Amount     Scheduled     Status
─────────────────────────────────────────────
001         127.43     18:07         ✓ Success
002         284.17     18:23         ✓ Success
003          96.82     18:41         ● Running
004         231.55     19:16         ○ Scheduled
005         143.29     19:52         ✕ Failed
```

支持：

- Retry Failed
- Cancel Scheduled
- Pause Batch
- Resume Batch
- Export Results

---

# 16. Task Item Detail Drawer

点击某一行，从右侧打开 Drawer：

```text
Wallet 005

Status
Failed

Operation
Swap

Chain
Ethereum

From
USDC

To
ETH

Amount
143.29 USDC

Scheduled
19:52:13

Started
19:52:15

Transaction
0x123...

Error
Insufficient native balance

[Retry]
```

这样不需要离开 Task Detail 页面。

---

# 17. Transactions

```text
Transactions

[ Search TX / Wallet ]
[ Chain ▼ ]
[ Type ▼ ]
[ Status ▼ ]
[ Date ▼ ]

Tx Hash       Wallet      Type       Amount     Status
─────────────────────────────────────────────────────
0x123...      Wallet001   Swap       127 USDC   Success
0x456...      Wallet002   Swap       284 USDC   Success
0x789...      Wallet003   Bridge      96 USDC   Pending
```

点击交易打开：

```text
Transaction Detail

Hash
0x123...

Wallet
Wallet 001

Chain
Ethereum

Type
Swap

Status
Confirmed

Block
12345678

Gas Used
...

Explorer
[Open Explorer]
```

---

# 18. Bridge 状态 UI

Bridge 不应该只显示一个 Pending。

建议：

```text
Source Transaction
      ✓ Confirmed
           ↓
Bridge Processing
      ● Processing
           ↓
Destination Transaction
      ○ Waiting
           ↓
Destination Balance
      ○ Waiting
```

完成后：

```text
✓ Source Confirmed
✓ Bridge Completed
✓ Destination Confirmed
✓ Balance Updated
```

---

# 19. Settings

## Chains

```text
Ethereum      Connected ✓
Arbitrum      Connected ✓
Base          Connected ✓
Optimism      Connected ✓
BSC           Connected ✓
Polygon       Connected ✓
```

## RPC

```text
Network       Endpoint      Latency     Status
Ethereum      Provider A    120ms       ✓
Arbitrum      Provider A     80ms       ✓
Base          Provider B     92ms       ✓
```

## Security

- Signer
- Key Vault
- Permissions
- Approval Rules
- Session
- Audit Logs

---

# 20. 全局组件规范

## Button

主要操作：

- Primary
- Secondary
- Ghost
- Danger

危险操作必须二次确认。

## Status Badge

```text
Scheduled
Running
Success
Failed
Pending
Cancelled
```

## Modal

用于：

- Confirm Batch
- Cancel Task
- Retry
- Regenerate
- Delete Wallet
- Remove Group

## Drawer

用于：

- Wallet Quick Detail
- Task Item Detail
- Transaction Detail

---

# 21. Loading / Empty / Error

每个页面都必须设计三类状态。

### Loading

```text
Loading wallets...
```

表格使用 Skeleton。

### Empty

```text
No wallets found.

[Add Wallet]
[Import CSV]
```

### Error

```text
Unable to load wallet balances.

[Retry]
```

---

# 22. 批量操作 UX 原则

### 原则 1：不直接执行

所有批量交易必须：

```text
Configure
→ Quote
→ Simulation
→ Preview
→ Confirm
→ Execute
```

### 原则 2：任何时候都知道选中了多少钱包

例如：

```text
Selected: 127 wallets
```

固定显示在操作区域。

### 原则 3：任何时候都能看到任务状态

```text
82 Success
5 Running
8 Scheduled
5 Failed
```

### 原则 4：失败必须可定位

不要只显示：

```text
Batch Failed
```

而应该显示：

```text
Wallet 005
Failed
Insufficient gas
```

---

# 23. 响应式策略

第一版优先：

- Desktop
- 1440px
- 1920px

其次支持：

- 1280px Laptop

移动端不作为第一阶段重点，因为钱包批量操作表格和任务管理需要较大屏幕。

---

# 24. 推荐前端组件目录

```text
src/
├── app/
│   ├── dashboard/
│   ├── wallets/
│   ├── assets/
│   ├── operations/
│   │   ├── swap/
│   │   ├── bridge/
│   │   └── transfer/
│   ├── tasks/
│   ├── transactions/
│   └── settings/
│
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── wallets/
│   ├── assets/
│   ├── operations/
│   ├── tasks/
│   ├── transactions/
│   └── common/
│
└── features/
    ├── batch-builder/
    ├── amount-strategy/
    ├── schedule-strategy/
    ├── quote/
    ├── simulation/
    └── task-monitor/
```

---

# 25. 第一版需要制作的 UI 原型

建议优先制作这 10 张：

1. Dashboard
2. Wallets
3. Wallet Detail
4. Batch Swap — Wallet Selection
5. Batch Swap — Amount Strategy
6. Batch Swap — Schedule Strategy
7. Batch Swap — Preview
8. Batch Bridge — Preview
9. Task Center
10. Task Detail

这 10 张基本可以把产品的核心交互完整表达出来。

---

# 26. 最终用户体验

最终希望用户只需要：

```text
① 进入 Wallets
        ↓
② 选择 100 个钱包
        ↓
③ Batch Swap
        ↓
④ USDC → ETH
        ↓
⑤ 设置金额策略
        ↓
⑥ 设置执行时间窗口
        ↓
⑦ Preview
        ↓
⑧ Confirm
        ↓
⑨ 系统自动创建 Task
        ↓
⑩ Task Center 实时监控
```

Bridge 使用完全相同的交互模型。

---

# 27. UI 原型阶段的重点

第一阶段不要追求复杂视觉效果。

重点验证：

- 钱包选择是否方便
- 批量操作配置是否清晰
- 金额策略是否容易理解
- 时间策略是否容易理解
- Preview 是否足够清楚
- 用户能否快速发现失败钱包
- Task Center 是否能承担大量任务
- Swap 和 Bridge 是否能共享交互组件
