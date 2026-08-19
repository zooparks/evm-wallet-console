# EVM 多钱包资产与批量交易管理平台 — 前端 UI / UX 原型设计 V1

## 1. 设计目标

Desktop First 的 EVM 多钱包运营控制台。

核心流程：

```text
Wallets → 选择钱包 → Operation → Amount Strategy → Schedule Strategy
→ Quote / Simulation → Preview → Confirm → Task Center → 实时监控
```

核心原则：
- 批量操作优先
- 所有关键操作必须可 Preview
- Swap / Bridge / Transfer 使用统一交互模型
- 金额与调度策略可视化
- 失败可定位到具体钱包
- 大数据量下保持表格清晰

---

## 2. 信息架构

```text
EVM Wallet Console
├── Dashboard
├── Wallets
│   ├── All Wallets
│   ├── Groups
│   └── Tags
├── Assets
│   ├── Overview
│   ├── Chains
│   └── Tokens
├── Operations
│   ├── Swap
│   ├── Bridge
│   └── Transfer
├── Tasks
│   ├── All
│   ├── Scheduled
│   ├── Running
│   ├── Success
│   └── Failed
├── Transactions
└── Settings
    ├── Chains
    ├── RPC
    ├── Signers
    ├── Security
    └── Audit Logs
```

---

## 3. 全局 Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo / EVM Console          Search       🔔      User / ⚙   │
├────────────────┬─────────────────────────────────────────────┤
│ Dashboard      │                                             │
│ Wallets        │                 Main Content                │
│ Assets         │                                             │
│ Operations     │                                             │
│  ├ Swap        │                                             │
│  ├ Bridge      │                                             │
│  └ Transfer    │                                             │
│ Tasks          │                                             │
│ Transactions   │                                             │
│ Settings       │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

Header：Logo、全局搜索、通知、用户、Settings、系统状态。

Sidebar：展开/收起、Active 状态、Task 数量 Badge、Failed Task Badge。

---

# 4. Dashboard

```text
Dashboard

┌────────────────────────────────────────────────────────────┐
│ Total Portfolio                                             │
│ $1,283,420.52                              +2.31% Today     │
└────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Wallets      │ Chains       │ Tokens       │ Pending      │
│ 500          │ 8            │ 126          │ 23           │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────┬──────────────────────────────┐
│ Portfolio Trend             │ Chain Distribution           │
│       ╭─────╮               │ Ethereum      $520,300      │
│  ╭────╯     ╰────            │ Arbitrum      $310,200      │
│──╯                           │ Base          $180,500      │
└─────────────────────────────┴──────────────────────────────┘

Recent Tasks
┌────────┬──────────┬─────────┬────────────┬──────────┐
│ Task   │ Type     │ Wallets │ Progress   │ Status   │
├────────┼──────────┼─────────┼────────────┼──────────┤
│ #1001  │ Swap     │ 100     │ 82 / 100   │ Running  │
│ #1002  │ Bridge   │ 80      │ 50 / 80    │ Running  │
└────────┴──────────┴─────────┴────────────┴──────────┘
```

快捷入口：

`[ Batch Swap ] [ Batch Bridge ] [ Add Wallet ]`

---

# 5. Wallets

顶部：

```text
Wallets
[ Search address / name ] [ Group ▼ ] [ Chain ▼ ] [ Asset ▼ ] [ Status ▼ ]
[ + Add Wallet ] [ Import CSV ]
```

表格：

```text
┌──┬──────────┬──────────────┬──────────┬──────────┬─────────┐
│☐ │ Name     │ Address      │ Group    │ Assets   │ Status  │
├──┼──────────┼──────────────┼──────────┼──────────┼─────────┤
│☐ │ Wallet01 │ 0x123...567  │ Trading  │ $18.2K   │ Active  │
│☐ │ Wallet02 │ 0xabc...789  │ Trading  │ $12.8K   │ Active  │
│☐ │ Wallet03 │ 0xdef...123  │ Main     │ $31.2K   │ Active  │
└──┴──────────┴──────────────┴──────────┴──────────┴─────────┘
```

字段建议：

- Checkbox
- Wallet Name
- Address
- Group
- Tags
- Total Assets
- Native Balance
- Last Activity
- Status
- More

---

# 6. 批量选择体验

选中后出现 Sticky Action Bar：

```text
┌────────────────────────────────────────────────────────────┐
│ 100 wallets selected                                       │
│ [ Batch Swap ] [ Batch Bridge ] [ Batch Transfer ] [Clear] │
└────────────────────────────────────────────────────────────┘
```

支持 Select All、Current Page、Group、Clear、Invert。

---

# 7. Wallet Detail

```text
← Wallets

Wallet 001
0x1234...5678

[ Batch Swap ] [ Batch Bridge ]

Total Assets
$18,230.22

┌────────────┬────────────┬────────────┐
│ Ethereum   │ Arbitrum   │ Base       │
│ $10,230    │ $5,120     │ $2,880     │
└────────────┴────────────┴────────────┘

Overview | Assets | Transactions | Tasks
```

---

# 8. Batch Operation Wizard

Swap、Bridge、Transfer 统一使用：

```text
① Wallets → ② Operation → ③ Amount → ④ Schedule → ⑤ Preview → ⑥ Execute
```

顶部显示 `Step X of 5`，底部固定 `[Back] [Next]`。

---

# 9. Step 1 — Wallet Selection

```text
Batch Swap

① Wallets   ② Swap   ③ Amount   ④ Schedule   ⑤ Preview

[ Search wallet ]
Group [ Trading ▼ ]

☑ Wallet 001
☑ Wallet 002
☑ Wallet 003
...

Selected: 100 wallets

[Cancel]                              [Next]
```

---

# 10. Step 2 — Operation

## Swap

```text
Network
[ Ethereum ▼ ]

From Token
[ USDC ▼ ]

To Token
[ ETH ▼ ]

Selected Wallets: 100
Total USDC Balance: 32,450
Total ETH Balance: 12.31
```

## Bridge

```text
Source Chain
[ Ethereum ▼ ]

Destination Chain
[ Arbitrum ▼ ]

Token
[ USDC ▼ ]

Selected Wallets: 100
```

Token / Chain Selector 支持搜索、Icon、名称、余额、连接状态。

---

# 11. Step 3 — Amount Strategy

```text
Amount Strategy

┌────────────────────────────────────────────┐
│ ○ Fixed                                    │
│ ○ Percentage                               │
│ ● Random Range                             │
│ ○ Custom                                   │
│ ○ Import CSV                               │
└────────────────────────────────────────────┘
```

## Fixed

```text
Amount [100.00 USDC]
Estimated Wallets: 100
Total Input: 10,000 USDC
```

## Percentage

```text
Minimum [10%]
Maximum [30%]
☑ Keep minimum native gas balance
```

实时预览：

```text
Wallet       Balance       Selected
001          1,000 USDC    213.42
002            500 USDC     84.21
003          2,000 USDC    423.18
```

## Random Range

```text
Minimum [80.00 USDC]
Maximum [300.00 USDC]
Decimal Precision [2]
☑ Avoid duplicate amounts
☑ Validate against wallet balance
```

预览：

```text
Wallet       Balance      Generated Amount
001          820 USDC     127.43 USDC
002          560 USDC     284.17 USDC
003          910 USDC      96.82 USDC
004          300 USDC     231.55 USDC
```

## Custom

```text
Wallet       Amount
001          100.00
002          237.00
003           82.00
004          351.00
```

支持 Inline Edit、Paste、Multi-cell Edit、CSV Import。

---

# 12. CSV Import

```text
Import Amounts

┌───────────────────────────────────────────┐
│       Drop CSV file here                  │
│       or [Choose File]                    │
└───────────────────────────────────────────┘

Required columns:
wallet,amount
```

导入结果：

```text
Imported: 100
Matched: 98
Unmatched: 2

[View Issues] [Continue]
```

---

# 13. Step 4 — Schedule Strategy

```text
Schedule Strategy

○ Immediate
○ Fixed Time
● Time Window
○ Custom
```

## Immediate

```text
Execute Immediately
Concurrency [10]
Retry [3 attempts]
```

## Fixed Time

```text
Date [2026-08-17]
Time [20:00]
Timezone [System Timezone]
```

## Time Window

```text
Start [18:00]
End [23:00]
Minimum Interval [30 sec]
Maximum Concurrent Tasks [10]
☑ Preview generated schedule
```

预览：

```text
Wallet       Amount       Scheduled
001          127.43       18:07:32
002          284.17       18:23:51
003           96.82       18:41:08
004          231.55       19:16:44
```

## Custom

```text
Wallet       Amount       Scheduled Time
001          100.00       18:10
002          237.00       18:32
003           82.00       19:05
004          351.00       20:21
```

支持 Inline Edit、Sort、Filter、Bulk Time Adjustment。

---

# 14. Quote / Simulation

进入 Preview 前：

```text
Preparing Batch...

✓ Wallet balances
✓ Gas balances
✓ Token allowance
✓ Quote
✓ Simulation

97 Ready
3 Attention
```

Attention：

```text
Wallet 031  ⚠ Insufficient native gas
Wallet 074  ⚠ Token balance too low
Wallet 091  ⚠ Simulation failed
```

操作：

`[Remove Problematic] [Go Back]`

---

# 15. Preview

```text
Batch Swap Preview

Ethereum
USDC → ETH
100 Wallets
```

Summary：

```text
┌──────────────┬──────────────┬──────────────┬─────────────┐
│ Wallets      │ Input        │ Est. Output  │ Est. Gas    │
│ 100          │ 24,832 USDC  │ 7.82 ETH     │ $183.20     │
└──────────────┴──────────────┴──────────────┴─────────────┘
```

表格：

```text
Wallet       Amount       Scheduled     Quote       Status
001          127.43       18:07         0.039 ETH   Ready
002          284.17       18:23         0.087 ETH   Ready
003           96.82       18:41         0.030 ETH   Ready
004          231.55       19:16         0.071 ETH   Ready
```

支持 Search、Sort、Filter、Export。

底部：

`[ Regenerate ] [ Back ] [ Confirm & Create Batch ]`

---

# 16. Confirm Modal

```text
Confirm Batch

100 tasks will be created.

Total estimated input:
24,832.41 USDC

Estimated Gas:
$183.20

[Cancel] [Confirm]
```

---

# 17. Task Center

```text
Tasks

[All] [Scheduled] [Running] [Success] [Failed]

Search
[........................]

[Type ▼] [Chain ▼] [Date ▼]

Task       Type       Chain       Wallets    Progress    Status
#1001      Swap       Ethereum    100        82/100      Running
#1002      Bridge     Arbitrum    80         50/80       Running
#1003      Transfer   Base        200        200/200     Success
```

---

# 18. Task Detail

```text
Batch Swap #1001

Ethereum
USDC → ETH

Progress
████████████████░░░░ 82 / 100

Success 82
Running 5
Scheduled 8
Failed 5
```

Task Items：

```text
Wallet      Amount     Scheduled     Status
001         127.43     18:07         ✓ Success
002         284.17     18:23         ✓ Success
003          96.82     18:41         ● Running
004         231.55     19:16         ○ Scheduled
005         143.29     19:52         ✕ Failed
```

操作：

`[Pause] [Resume] [Cancel Scheduled] [Retry Failed] [Export]`

---

# 19. Task Item Drawer

```text
┌───────────────────────────────┐
│ Wallet 005                 ×  │
├───────────────────────────────┤
│ Status: Failed                │
│ Operation: Swap               │
│ Chain: Ethereum               │
│ Amount: 143.29 USDC           │
│ Scheduled: 19:52:13           │
│                               │
│ Error                         │
│ Insufficient native balance   │
│                               │
│ [Retry]                       │
└───────────────────────────────┘
```

---

# 20. Transactions

```text
Transactions

[ Search TX / Wallet ]
[ Chain ▼ ] [ Type ▼ ] [ Status ▼ ] [ Date ▼ ]

Tx Hash       Wallet      Type       Amount       Status
0x123...      Wallet001   Swap       127 USDC     Success
0x456...      Wallet002   Swap       284 USDC     Success
0x789...      Wallet003   Bridge      96 USDC     Pending
```

Transaction Detail：

```text
Status: Confirmed
Hash: 0x123...
Wallet: Wallet 001
Chain: Ethereum
Type: Swap
Amount: 127.43 USDC → 0.039 ETH
Block: 12345678
Gas Used: ...
[Open Explorer]
```

---

# 21. Bridge Progress UI

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

完成：

```text
✓ Source Confirmed
✓ Bridge Completed
✓ Destination Confirmed
✓ Balance Updated
```

---

# 22. Assets 页面

```text
Assets

Total
$1,283,420

ETH       $520,000
USDC      $450,000
USDT      $210,000
```

表格：

```text
Token       Chain       Amount       USD Value
ETH         Ethereum    320.12       $520,000
USDC        Ethereum    250K         $250,000
USDC        Arbitrum    200K         $200,000
```

支持 Chain、Token、Wallet Group 筛选。

---

# 23. Settings

## Chains

```text
Network       Status       RPC        Latency
Ethereum      Connected    Provider A 120ms
Arbitrum      Connected    Provider A  80ms
Base          Connected    Provider B  92ms
```

## RPC

- Add RPC
- Edit
- Enable / Disable
- Test Connection
- Set Priority

## Security

- Signers
- Key Vault
- Permissions
- Approval Rules
- Sessions
- Audit Logs

---

# 24. Groups

```text
Groups

Trading        150 wallets
Main           100 wallets
Operations      80 wallets
Test            50 wallets
```

进入 Group：

```text
Trading
150 wallets

[ Batch Swap ]
[ Batch Bridge ]

Wallet List
...
```

---

# 25. Global Search

支持：

- Wallet Address
- Wallet Name
- Task ID
- Transaction Hash
- Token
- Group

结果：

```text
Search Results

Wallet
Wallet 001

Task
#1001 Batch Swap

Transaction
0x123...
```

---

# 26. Notification Center

```text
✓ Batch #1001 completed
⚠ Batch #1002 has 5 failed tasks
● Bridge #1003 is processing
⚠ Wallet #032 has insufficient gas
```

点击通知直接进入对应页面。

---

# 27. Loading / Empty / Error

## Loading

所有表格使用 Skeleton，避免整页白屏。

```text
Loading wallets...
Loading balances...
```

## Empty

```text
No wallets yet.

[+ Add Wallet] [Import CSV]
```

## Error

```text
Unable to load data.

[Retry]
```

RPC：

```text
Ethereum RPC unavailable.
[Retry] [Open RPC Settings]
```

Quote：

```text
Unable to get a valid quote.
[Retry Quote]
```

Simulation：

```text
Simulation failed for 3 wallets.
[View Issues]
```

---

# 28. 全局组件规范

## Buttons

- Primary
- Secondary
- Ghost
- Danger

危险操作必须二次确认。

## Status Badge

- Draft
- Quoted
- Simulated
- Scheduled
- Running
- Submitted
- Pending
- Success
- Failed
- Retrying
- Cancelled

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

# 29. 表格 UX

考虑数百甚至数千钱包：

- Pagination
- Sticky Header
- Sticky Selection
- Column Sorting
- Column Filtering
- Search
- Bulk Selection
- Export
- Virtualized Rows

始终显示：

```text
Selected: 127
```

---

# 30. Responsive Strategy

第一版 Desktop First：

```text
1920px → Full Layout
1440px → Standard
1280px → Compact
1024px → Minimum supported
```

重点适配：

- 1440 × 900
- 1920 × 1080

移动端第一阶段不作为重点。

---

# 31. 前端组件目录

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

# 32. 第一阶段核心 UI 原型

优先设计：

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

---

# 33. 核心用户旅程

```text
登录
 ↓
Dashboard
 ↓
Wallets
 ↓
选择钱包
 ↓
Batch Swap / Batch Bridge
 ↓
选择 Chain / Token
 ↓
Amount Strategy
 ↓
Schedule Strategy
 ↓
Quote
 ↓
Simulation
 ↓
Preview
 ↓
Confirm
 ↓
创建 Batch Task
 ↓
Task Center
 ↓
实时监控
 ↓
Success / Failed
```

---

# 34. 最终 UI 目标

用户应该能够非常明确地完成：

> 选择一批钱包 → 配置操作 → 配置金额 → 配置调度 → 查看 Preview → 一键创建任务 → 实时监控。

Swap 和 Bridge 尽量共享同一套交互组件。

最终前端围绕三个核心对象展开：

```text
WALLETS
   ↓
OPERATIONS
   ↓
TASKS
```
