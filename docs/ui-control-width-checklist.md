# UI 控件宽度检查清单（Content-Driven Width）

> **宗旨**：宽度跟信息密度匹配；同一行尽量多放必要控件；原生下拉展开宽度不要远大于选项文字。  
> **范围**：本清单仅记录 **本仓库已存在** 的代码事实（2026-05-21 扫描），不含未验证的「全站已修好」类结论。

---

## 1. 原则（执行标准）

| # | 原则 | 可验收标准 |
|---|------|------------|
| P1 | **内容驱动宽度** | 短文案字段（区域、Incoterm、SKU、状态、是/否）触发框宽度 ≈ 内容 + 内边距，不抢满整行 |
| P2 | **一行多控件** | 筛选/新建顶栏用 `flex flex-wrap items-end gap-*`，短字段 **禁止** `flex-1` 撑满 |
| P3 | **表格分列分级** | 表内 `select`/`input` 不用统一 `w-full` 涂满宽列；列宽按字段类型设 `w-*` / `max-w-*`，不是一律 `min-w-[10rem]` |
| P4 | **长文才拉宽** | 产品名、备注、URL、供应商名等才用 `min-w` + `truncate` / `max-w` |
| P5 | **说明不占高/宽** | Incoterm、目的国等长说明用 `title` / `?` / `<details>`，不常驻段落撑布局 |
| P6 | **原生 select 限制** | 浏览器下拉面板宽度 ≥ 触发框；**触发框窄，面板才窄**（无法单靠 CSS 让面板小于触发框） |

---

## 2. 仓库根因（已核实）

### 2.1 全局样式 `app/globals.css`

```60:73:app/globals.css
  input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]),
  select,
  textarea {
    border-radius: 0.75rem;
    /* 未设置 width — 宽度 100% 来自组件 class */
  }
```

- 全局 **未** 强制 `width: 100%`。
- 过宽来自各组件普遍使用的 **`w-full` / `flex-1` / 表格列 `min-w-[…]` + 单元格内 `w-full`**。

### 2.2 高频反模式（rg 可复现）

```bash
# 组件内 w-full（约 20+ 文件，forecast-form 22 处）
rg 'className=.*w-full' components --glob '*.tsx' -c

# 新建区 flex-1 撑宽（当前仅 forecast-form 顶栏 3 处）
rg 'flex-1' components/forecast/forecast-form.tsx

# 表内 select + 宽表
rg '<select' components --glob '*.tsx' -l
rg 'min-w-\[' components --glob '*.tsx'
```

### 2.3 推荐宽度档位（新代码用）

| 档位 | 典型字段 | Tailwind 示例 |
|------|----------|----------------|
| **XS** | Incoterm、序号、布尔 | `w-16 max-w-[4.5rem]` 或 `w-[4.5rem]` |
| **S** | 区域、SKU、月份 | `w-auto min-w-[6rem] max-w-[9rem]` |
| **M** | 目的国、状态枚举 | `min-w-[8rem] max-w-[14rem]` |
| **L** | 产品名、备注 | `min-w-0 flex-1 max-w-[…]` + `truncate` |
| **Full** | 登录用户名、长文本 | 表单单列时 `w-full` 合理 |

工具类（已在 `app/globals.css` `@layer components`）：

- `.app-control-xs` → `w-auto max-w-[5rem]`
- `.app-control-sm` → `w-auto min-w-[5.5rem] max-w-[10rem]`
- `.app-control-md` → `w-auto min-w-[8rem] max-w-[14rem]`

---

## 3. 按路由审计表（事实）

**图例**：🔴 已确认问题 · 🟡 部分/上下文合理 · 🟢 暂未发现典型撑宽 · ⚪ 无 `<select>`

| 路由 | 主组件 | `<select>` 数量 | 宽度相关事实（代码） | 优先级 |
|------|--------|-----------------|----------------------|--------|
| `/forecast` | `forecast-form.tsx` | 12 | 🟡 P0 已修：顶栏/录入表/编辑条用 `app-control-*`；记录表 Ops/评论仍宽表布局（`min-w-[1280px]`） | P0 样板完成 |
| `/dashboard` | `cockpit-visualizations.tsx` | 11 | 🔴 筛选区全部 `select.mt-1.w-full`（L282–561）；网格列导致短枚举拉满 | P1 |
| `/order-progress` | `order-progress-panel.tsx` | 7 | 🟡 创建/编辑表单与分批行已 `app-control-*` + `flex-wrap`；表 `min-w-[1280px]` 保留 | P1 表单完成 |
| `/order-progress/production-management` | `production-management-panel.tsx` | 0* | 🟡 以表格/看板为主，继承 order 系 `w-full` 模式需 spot check | P2 |
| `/mass-production-kanban` | `mass-production-kanban-section.tsx` | 2 | 🟡 表单已 `app-control-*` + `flex-wrap`；表 `min-w-[1100px]` 保留 | P2 表单完成 |
| `/logistics-progress` | `logistics-progress-panel.tsx` | 8 | 🟡 创建/编辑表单已 `app-control-*` + `flex-wrap`；表 `min-w-[1100px]` 保留 | P1 表单完成 |
| `/logistics-progress/order-fulfillments` | `order-fulfillments-panel.tsx` | 2 | 🔴 单元格常量 `cellInputClass` 含 `w-full min-w-[6.5rem]`（L48–52） | P1 |
| `/logistics-progress/shipping-report` | `shipping-report-panel.tsx` | 1 | 🟡 录入表单已 `app-control-*` + `flex-wrap`；表 `min-w-[3200px]` 保留 | P2 表单完成 |
| `/logistics-progress/inventory-global` | `inventory-global-panel.tsx` | 1 | 🟡 录入表单已 `app-control-*` + `flex-wrap`；表 `min-w-[7200px]` 保留 | P2 表单完成 |
| `/logistics-progress/landed-cost-consolidate` | `landed-cost-consolidate-panel.tsx` | 2 | 🟡 表 `min-w-[1600px]`；Incoterm 列 `min-w-[6rem]` 相对合理 | P2 |
| `/cost-control` | `cash-flow-dashboard.tsx` 等 | 3+ | 🟡 筛选/表单已 `app-control-*` + `flex-wrap`；宽表 `min-w-[1080–2200px]` 保留横向滚动 | P1 表单完成 |
| `/supply-chain/cost-control` | 同上 | — | 🟡 同 cost-control（成本分析 + PO 现金流 + 仪表盘筛选） | P1 表单完成 |
| `/supply-chain/cost-control/unit-cost` | `unit-cost-panel.tsx` | 5 | 🟡 新建/编辑/筛选已 `app-control-*` + `flex-wrap`；历史宽表 `min-w-[840px]` 保留 | P1 表单完成 |
| `/contracts` · `/supply-chain/contracts` | `contract-management.tsx` | 3 | 🟡 创建表单/筛选已 `app-control-*` + `flex-wrap`；表 `min-w-[1220px]` 保留 | P1 表单完成 |
| `/suppliers` · `/supply-chain/suppliers` | `supplier-management.tsx` | 0 | 🟡 表 `min-w-[1300px]`，表单若新增 select 需按档位 | P2 |
| `/admin/users` | `user-management.tsx` | 2 | 🟢 创建用户 `select` 无 `w-full`（L349）；表内 role 下拉在单元格内 | P3 |
| `/admin/products` | `product-management.tsx` | 0 | 🟡 表 `min-w-[1080px]` | P2 |
| `/npi/*` | bom/ecn/sop/tooling | 2–3/页 | 🟡 各表 `min-w-[1200–1500px]`；bom 等表单 `w-full` 常见 | P2 |
| `/quality-control/*` | test-case 等 | 1–3/页 | 🟡 多为宽表 + 紧凑表单；cert 等单文件组件 | P3 |
| `/login` | `app/login/page.tsx` | 0 | 🟢 单列登录，`w-full` 符合 P4「长输入」 | — |
| `/potentials` | `app/potentials/page.tsx` | 0 | ⚪ 静态/展示页 | — |
| `/` | redirect | — | — | — |

\* `production-management-panel.tsx` 未检出 `<select>`，以本次 rg 为准。

---

## 4. 文件级待办（含 `<select>` 的 23 个组件）

修复时 **按文件** 勾选，避免遗漏：

- [x] `components/forecast/forecast-form.tsx` — **P0 样板页**（新建区 + 编辑条；记录宽表待二期）
- [ ] `components/dashboard/cockpit-visualizations.tsx`
- [x] `components/order-progress/order-progress-panel.tsx`
- [x] `components/logistics/logistics-progress-panel.tsx`
- [ ] `components/logistics/order-fulfillments-panel.tsx`
- [x] `components/cost-control/cash-flow-dashboard.tsx` — 筛选条 + 表内 date/shipping select
- [x] `components/cost-control/unit-cost-panel.tsx`
- [x] `components/cost-control/cost-analysis-panel.tsx`
- [x] `components/cost-control/cash-flow-panel.tsx`
- [x] `components/cost-control/po-cash-flow-panel.tsx`
- [x] `components/contract/contract-management.tsx`
- [ ] `components/logistics/landed-cost-consolidate-panel.tsx`
- [x] `components/logistics/shipping-report-panel.tsx`
- [x] `components/logistics/inventory-global-panel.tsx`
- [x] `components/order-progress/mass-production-kanban-section.tsx`
- [ ] `components/npi/bom-management.tsx`
- [ ] `components/npi/ecn-management.tsx`
- [ ] `components/npi/sop-management.tsx`
- [ ] `components/npi/tooling-management.tsx`
- [ ] `components/quality-control/test-case-management.tsx`
- [ ] `components/quality-control/eight-d-management.tsx`
- [ ] `components/quality-control/certification-management.tsx`
- [ ] `components/quality-control/ort-report-management.tsx`
- [ ] `components/admin/user-management.tsx`（低优先级，作对照）

---

## 5. 单页修复步骤（可复制）

### 5.1 筛选/新建顶栏（非表格）

1. 外层：`flex flex-wrap items-end gap-2`（不要 `grid` 每列等宽）。
2. 每个字段：`label` 用 `shrink-0 w-auto`，**去掉 `flex-1`**。
3. `select`：`className="w-auto min-w-[…] max-w-[…]"`，按 §2.3 档位。
4. 同类短字段可合并一行：`新建 | 月份 | 区域 | 复用 #`。

### 5.2 表格内编辑

1. 列定义：短列 `w-[5rem]` / `w-[7rem]`，长列才 `min-w-[12rem]`。
2. 单元格内：**不要** 默认 `w-full`；改为 `w-full max-w-[列上限]` 或 `w-auto`。
3. 数字列：`w-20 text-right tabular-nums`。
4. 产品名：`max-w-[16rem] truncate` + `title={full}`。

### 5.3 验收（人工，非 AI 断言）

- [ ] 区域/APAC、Incoterm/EXW、SKU/ML5：触发框宽度明显窄于产品名列。
- [ ] 1920px 宽屏：顶栏至少 4 个短控件可在同一行无巨大空隙。
- [ ] 打开下拉：列表宽度可接受（原生限制下与触发框同宽即可）。
- [ ] 1280px 笔记本：可横向滚动表格，但**筛选区不先出现大面积空白**。

---

## 6. 回归扫描命令（发版前）

```bash
# 新建区不应再出现 label+flex-1 组合（forecast 修完后可改为全库）
rg 'label.*flex-1|flex-1.*label' components --glob '*.tsx'

# 表内短列 Incoterm 不应 w-full 且无 max-w（按文件抽查）
rg 'incoterm|Incoterm' components -i -A2 --glob '*.tsx' | rg 'w-full'

# 统计仍使用 mt-1 w-full 的 select（应趋近 0）
rg 'select' components -A1 --glob '*.tsx' | rg 'w-full'
```

---

## 7. 与 Forecast 事故的对应关系（教训写入清单）

| 失误 | 清单中的对策 |
|------|----------------|
| 用 `flex-1` 做「一行放下」 | P2 + §5.1 禁止顶栏 flex-1 |
| 表格统一 `w-full` | P3 + §5.2 按列档位 |
| 为压高度牺牲宽度 | P6 + 验收 §5.3 必须看截图 |
| 未分字段类型 | §2.3 档位表 |
| build 通过即交付 | §5.3 人工验收勾选 |

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-21 | 初版：rg 扫描 38 个 `page.tsx`、23 个含 select 组件；根因指向组件 class 而非 globals |
| 2026-05-21 | Forecast P0：`app-control-xs/sm/md/num` + `forecast-form` 顶栏/录入表/编辑条 |

**下次修订**：某文件修复合并后，更新 §3 状态列（🔴→🟢）并注明 PR/commit，避免清单与代码脱节。
