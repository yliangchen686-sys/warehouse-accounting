/**
 * 2026-07-30 数据清理期初余额调账（每人清理前待转账 - 7/30起业务流水后的差额）
 * 在 employee_balance_adjustments 表尚未迁移完成前，由代码合并计入余额。
 */
export const OPENING_BALANCE_ADJUSTMENTS = {
  安柠: 26458,
  管理员: 1588,
  西瓜: 28954,
  小泵: 53756,
  小梦: 6480,
  君健: 32432,
  小靖: 3815,
  纯净: 2339,
  茶茶: 2021
};

export const OPENING_BALANCE_CUTOFF = '2026-07-30T00:00:00+07:00';
