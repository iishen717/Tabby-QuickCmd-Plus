/**
 * QuickCommand+ 设置面板
 * 功能描述：在 Tabby 设置左侧栏注册 QuickCmd+ 配置入口（语言、命令管理、数据备份）
 *   参考 SFTP+ 设置页的 UI 风格
 * 创建人：DD1024z + Deepseek-V4-Flash
 * 创建时间：2026-06-27
 */
import { Component, Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { QuickCommandService, QuickCommand, QuickCommandGroup } from './qc-command.service'

/**
 * 检测 Tabby 实际使用的系统语言
 */
function detectSystemLocale(): 'zh-CN' | 'en-US' {
  try {
    const keys = ['locale', 'language', 'tabby-language', 'tabby-locale',
      'config', 'tabby-config', 'settings', 'tabby-settings',
      'tabby-config.json']
    for (const key of keys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      if (/^zh/i.test(raw)) return 'zh-CN'
      if (/^en/i.test(raw)) return 'en-US'
      try {
        const obj = JSON.parse(raw)
        const lang = obj?.appearance?.language
          || obj?.appearance?.locale
          || obj?.language || obj?.locale
          || obj?.app?.language || obj?.general?.language
          || obj?.locale
        if (lang) return /^zh/i.test(String(lang)) ? 'zh-CN' : 'en-US'
      } catch {}
    }
  } catch {}

  try {
    const langs = navigator.languages || [navigator.language]
    const zhLang = langs.find(l => /^zh/i.test(l))
    if (zhLang) return 'zh-CN'
  } catch {}

  try {
    const navLang = navigator.language || ''
    if (navLang) return /^zh/i.test(navLang) ? 'zh-CN' : 'en-US'
  } catch {}

  return 'zh-CN'
}

@Component({
  template: `
    <div class="qc-settings-page">
      <h3 class="qs-title">QuickCmd+</h3>
      <p class="qs-desc">{{ t('快捷命令管理面板，创建和管理常用命令。', 'Quick command panel, create and manage commands.') }}</p>

      <!-- 语言 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('语言', 'Language') }}</label>
        <select [(ngModel)]="lang" (ngModelChange)="onLangChange()" class="qs-select">
          <option value="">{{ t('自动', 'Auto') }}</option>
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <!-- 界面 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('界面', 'Interface') }}</label>
        <div class="qs-color-row">
          <label *ngFor="let c of colorThemes" class="qs-color-swatch"
            [class.qs-color-active]="colorTheme === c.value"
            (click)="setColorTheme(c.value)">
            <span class="qs-color-swatch-name">{{ themeLabel(c) }}</span>
            <span class="qs-color-swatch-preview" [style.background]="c.bg">
              <span class="qs-cp-title" [style.background]="c.surface" [style.color]="c.text">{{ themeLabel(c) }}</span>
              <span class="qs-cp-body" [style.color]="c.muted">
                <span class="qs-cp-line" [style.color]="c.text">cmd</span>
                <span class="qs-cp-accent" [style.background]="c.primary"></span>
              </span>
            </span>
          </label>
        </div>

        <div class="qs-scheme-preview" *ngFor="let c of colorThemes" [hidden]="colorTheme !== c.value">
          <div class="qs-glass-preview" [style.background]="c.bg" [style.backdrop-filter]="'blur(' + (c.blur || '24px') + ') saturate(' + (c.saturate || '160%') + ')'" [style.border]="'1px solid ' + (c.border || 'rgba(255,255,255,0.1)')" [style.box-shadow]="c.shadow">
            <div class="qs-gp-titlebar" [style.background]="c.surface">
              <span class="qs-gp-dot" [style.background]="c.primary"></span>
              <span class="qs-gp-title" [style.color]="c.text">Quick Cmd+</span>
            </div>
            <div class="qs-gp-body">
              <span class="qs-gp-cmd" [style.color]="c.textSecondary || c.text">deploy-app</span>
              <span class="qs-gp-cmd" [style.color]="c.textMuted || c.muted">./deploy.sh --prod</span>
            </div>
          </div>
          <div class="qs-color-fields">
            <div class="qs-color-field">
              <label>{{ t('主色调', 'Primary') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'primary')" (ngModelChange)="onColorChange('primary', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'primary') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('背景', 'Bg') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'bg')" (ngModelChange)="onColorChange('bg', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'bg') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('文字', 'Text') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'text')" (ngModelChange)="onColorChange('text', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'text') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('标题栏', 'Surface') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'surface')" (ngModelChange)="onColorChange('surface', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'surface') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('边框', 'Border') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'border')" (ngModelChange)="onColorChange('border', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'border') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('次要文字', 'Muted') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'muted')" (ngModelChange)="onColorChange('muted', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'muted') }}</span>
            </div>
            <div class="qs-color-field">
              <label>{{ t('分组名称', 'Group Name') }}</label>
              <input type="color" [ngModel]="currentColor(c, 'groupName')" (ngModelChange)="onColorChange('groupName', $event)" class="qs-color-input">
              <span class="qs-color-val">{{ currentColor(c, 'groupName') }}</span>
            </div>
          </div>
        </div>

        <!-- 字体大小 -->
        <div class="qs-font-row">
          <label class="qs-font-label">{{ t('字体大小', 'Font Size') }}</label>
          <div class="qs-font-control">
            <input type="range" min="11" max="18" step="1"
              [value]="fontSize" (input)="onFontSizeChange(+$any($event.target).value)"
              class="qs-range">
            <span class="qs-font-val">{{ fontSize }}px</span>
          </div>
        </div>

        <!-- 入口模式 -->
        <div class="qs-entry-mode-row">
          <label style="font-size:13px; font-weight:500;">{{ t('入口模式', 'Entry Mode') }}</label>
          <div class="qs-entry-mode-options">
            <label class="qs-entry-mode-option"
              [class.qs-entry-mode-active]="entryMode === 'toolbar'">
              <input type="radio" name="entryMode" value="toolbar"
                [(ngModel)]="entryMode" (ngModelChange)="onEntryModeChange()">
              <span>{{ t('工具栏按钮', 'Toolbar') }}</span>
            </label>
            <label class="qs-entry-mode-option"
              [class.qs-entry-mode-active]="entryMode === 'floating'">
              <input type="radio" name="entryMode" value="floating"
                [(ngModel)]="entryMode" (ngModelChange)="onEntryModeChange()">
              <span>{{ t('浮动按钮', 'Floating') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 数据 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('数据', 'Data') }}</label>
        <div class="qs-backup-row">
          <button class="qs-btn" (click)="exportData()">[&uarr;] {{ t('导出数据', 'Export') }}</button>
          <label class="qs-btn qs-btn-import">[&darr;] {{ t('导入数据', 'Import') }}
            <input type="file" accept=".json" (change)="onImport($event)" style="display:none" />
          </label>
          <button class="qs-btn qs-btn-danger" (click)="openClearConfirm()">[&times;] {{ t('清空数据', 'Clear All') }}</button>
        </div>
      </div>

      <!-- 关于 -->
      <div class="qs-section">
        <label class="qs-label">{{ t('关于', 'About') }}</label>
        <div class="qs-about-row">
          <span class="qs-about-item">{{ t('版本', 'Version') }}: 1.0.0</span>
          <span class="qs-about-item">{{ t('作者', 'Author') }}: DD1024z</span>
          <span class="qs-about-link" (click)="openGithub()">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>
            {{ t('Github源码', 'GitHub Source') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 清空数据确认弹窗 -->
    <div class="qc-overlay" *ngIf="showClearConfirm" (click)="closeClearConfirm()">
      <div class="qc-edit-modal" (click)="$event.stopPropagation()">
        <div class="qc-edit-title" style="color:var(--_primary,#e24b4a);">{{ t('⚠️ 清空数据', '⚠️ Clear All Data') }}</div>
        <div class="qc-edit-field">
          <p style="font-size:13px; line-height:1.6; margin:0 0 12px 0;">
            {{ t('此操作将删除所有命令和分组数据，不可撤销！', 'This will delete all commands and groups, and cannot be undone!') }}
          </p>
          <label style="font-size:12px; opacity:.8;">
            {{ t('请输入 DELETE 确认：', 'Please type DELETE to confirm:') }}
          </label>
          <input class="qc-edit-input" type="text" [(ngModel)]="clearConfirmInput"
            (keydown.enter)="doClearData()" placeholder="DELETE" #clearInput
            style="margin-top:6px; width:100%; box-sizing:border-box;" />
        </div>
        <div class="qc-edit-footer">
          <button class="qs-btn" (click)="closeClearConfirm()">{{ t('取消', 'Cancel') }}</button>
          <button class="qs-btn qs-btn-danger" (click)="doClearData()"
            [style.opacity]="clearConfirmInput !== 'DELETE' ? '0.5' : '1'"
            [disabled]="clearConfirmInput !== 'DELETE'">{{ t('清空', 'Clear') }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qc-settings-page { padding:20px; max-width:600px; }
    .qs-title { color:var(--primary-color,#3b82f6); font-size:18px; margin-bottom:6px; }
    .qs-desc { opacity:.7; font-size:13px; line-height:1.6; margin-bottom:24px; }
    .qs-section { border-top:1px solid rgba(128,128,128,0.2); padding-top:16px; margin-bottom:16px; }
    .qs-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .qs-label { display:block; font-size:16px; font-weight:600; margin-bottom:10px; }
    .qs-select {
      width:100%; max-width:280px;
      padding:7px 10px; border-radius:6px;
      background: rgba(128,128,128,0.1);
      border:1px solid rgba(128,128,128,0.25);
      font-size:13px; cursor:pointer; outline:none;
      color: inherit;
    }
    .qs-select option { color: #000; background: #fff; }
    .qs-select:focus { border-color: var(--primary-color, #3b82f6); }
    .qs-hint { opacity:.6; font-size:11px; line-height:1.5; margin-top:6px; }

    /* 颜色主题 */
    .qs-color-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
    .qs-color-swatch {
      display:inline-flex; flex-direction:column; align-items:center; gap:6px;
      padding:10px; border-radius:12px; border:2px solid transparent;
      font-size:12px; font-weight:500; cursor:pointer; transition:all .18s;
      min-width:80px;
    }
    .qs-color-swatch:hover { opacity:.85; transform:translateY(-1px); }
    .qs-color-active { border-color: var(--primary-color,#3b82f6) !important; box-shadow:0 0 0 3px rgba(59,130,246,.2); }
    .qs-color-swatch-name { font-size:11px; font-weight:600; }
    .qs-color-swatch-preview {
      display:flex; flex-direction:column; border-radius:8px; overflow:hidden;
      width:72px;
    }
    .qs-cp-title { display:block; padding:4px 6px; font-size:8px; font-weight:600; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .qs-cp-body { display:block; padding:4px 6px; font-size:8px; font-family:monospace; min-height:18px; }
    .qs-cp-line { display:block; line-height:1.4; }
    .qs-cp-accent { display:inline-block; width:12px; height:3px; border-radius:2px; margin-top:2px; }
    /* 玻璃预览卡片 */
    .qs-glass-preview {
      width:240px; margin:0 auto 16px;
      border-radius:12px; overflow:hidden;
      padding:0;
    }
    .qs-gp-titlebar {
      display:flex; align-items:center; gap:6px;
      padding:8px 12px;
    }
    .qs-gp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .qs-gp-title { font-size:11px; font-weight:600; }
    .qs-gp-body { padding:10px 14px; }
    .qs-gp-cmd { display:block; font-size:11px; font-family:monospace; line-height:1.6; }
    .qs-color-fields { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start; margin-top:8px; }
    .qs-color-field { display:flex; flex-direction:column; gap:3px; }
    .qs-color-field label { font-size:12px; font-weight:500; }
    .qs-color-input { width:44px; height:30px; border:none; border-radius:6px; cursor:pointer; }
    .qs-color-val { font-size:11px; font-family:monospace; opacity:.6; }

    /* 命令列表 */
    .qs-empty { padding:24px; text-align:center; opacity:.5; font-size:13px; }
    .qs-cmd-item { padding:10px; margin-bottom:8px; border:1px solid rgba(128,128,128,0.2); border-radius:8px; }
    .qs-cmd-top { display:flex; align-items:center; gap:8px; }
    .qs-cmd-info { display:flex; align-items:center; gap:6px; flex-wrap:wrap; flex:1; min-width:0; }
    .qs-cmd-name { font-weight:500; font-size:14px; flex-shrink:0; }
    .qs-cmd-badge { background: var(--primary-color,#3b82f6); color:#fff; padding:1px 8px; border-radius:10px; font-size:11px; flex-shrink:0; }
    .qs-cmd-shortcut { background: rgba(128,128,128,0.15); padding:1px 6px; border-radius:4px; font-size:11px; font-family:monospace; flex-shrink:0; }
    .qs-cmd-text { background: rgba(128,128,128,0.08); padding:6px 10px; border-radius:4px; font-family:monospace; font-size:12px; white-space:pre-wrap; margin:6px 0 0; overflow-x:auto; }
    .qs-cmd-text-inline { font-family:monospace; font-size:11px; opacity:.55; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:60px; flex:1; cursor:default; }
    .qs-cmd-actions { display:flex; gap:4px; flex-shrink:0; }
    .qs-btn-xs { padding:2px 8px; border-radius:4px; border:1px solid rgba(128,128,128,0.2); background:rgba(128,128,128,0.06); font-size:11px; cursor:pointer; color:inherit; line-height:1.4; }
    .qs-btn-xs:hover { background: rgba(128,128,128,0.15); }
    .qs-btn-xs-danger { border-color:#e24b4a; color:#e24b4a; }
    .qs-btn-xs-danger:hover { background: rgba(226,75,74,0.1); }

    /* 分组 */
    .qs-group-item { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(128,128,128,0.1); font-size:13px; }
    .qs-group-actions { display:flex; gap:6px; }

    /* 按钮 */
    .qs-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 16px; border-radius:8px;
      border:1px solid rgba(128,128,128,0.25);
      background: rgba(128,128,128,0.08);
      font-size:13px; cursor:pointer; transition:background .15s;
      color: inherit;
    }
    .qs-btn:hover { background: rgba(128,128,128,0.15); }
    .qs-btn-primary { background: var(--primary-color,#3b82f6); color:#fff; border-color:var(--primary-color,#3b82f6); }
    .qs-btn-primary:hover { opacity:.85; }
    .qs-btn-danger { border-color:#e24b4a; color:#e24b4a; }
    .qs-btn-danger:hover { background: rgba(226,75,74,0.1); }
    .qs-btn-sm { padding:4px 12px; border-radius:6px; border:1px solid rgba(128,128,128,0.25); background: rgba(128,128,128,0.08); font-size:12px; cursor:pointer; color: inherit; }
    .qs-btn-sm:hover { background: rgba(128,128,128,0.15); }
    .qs-btn-sm-danger { border-color:#e24b4a; color:#e24b4a; }
    .qs-btn-sm-danger:hover { background: rgba(226,75,74,0.1); }
    .qs-btn-import { cursor:pointer; }
    .qs-backup-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; }

    /* 入口模式选择 */
    .qs-entry-mode-row { margin-top:8px; display:flex; flex-direction:column; gap:4px; }
    .qs-entry-mode-options { display:flex; gap:8px; }
    .qs-entry-mode-option {
      display:flex; align-items:center; gap:4px;
      padding:6px 12px; border-radius:6px;
      border:0.5px solid var(--_border,#585b70);
      cursor:pointer; transition:all .15s;
      user-select:none;
    }
    .qs-entry-mode-option:hover { border-color:var(--_primary,#b4befe); }
    .qs-entry-mode-active { border-color:var(--_primary,#b4befe); background:rgba(180,190,254,0.08); }
    .qs-entry-mode-option input { margin:0; }

    /* 字体大小 */
    .qs-font-row { margin-top:12px; display:flex; flex-direction:column; gap:4px; }
    .qs-font-label { font-size:13px; font-weight:500; }
    .qs-font-control { display:flex; align-items:center; gap:10px; }
    .qs-font-val { font-size:13px; min-width:30px; color:var(--_text-muted); font-variant-numeric:tabular-nums; }

    /* range 滑块 */
    .qs-range { flex:1; max-width:160px; margin:0; height:4px; -webkit-appearance:none; appearance:none; background:var(--_border,#585b70); border-radius:2px; outline:none; cursor:pointer; }
    .qs-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%; background:var(--_primary,#b4befe); border:2px solid var(--_surface,#45475a); cursor:pointer; }
    .qs-range::-moz-range-track { height:4px; background:var(--_border,#585b70); border-radius:2px; }
    .qs-range::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--_primary,#b4befe); border:2px solid var(--_surface,#45475a); cursor:pointer; }

    /* 关于 */
    .qs-about-row { display:flex; gap:16px; flex-wrap:wrap; margin-top:4px; font-size:13px; }
    .qs-about-item { color:var(--_text-muted); }
    .qs-about-link { color:var(--_primary,#b4befe); text-decoration:none; cursor:pointer; }
    .qs-about-link:hover { text-decoration:underline; }
    .qs-about-link svg { width:12px; height:12px; vertical-align:middle; margin-right:2px; }

    /* 确认弹窗 */
    .qc-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:100000; display:flex; align-items:center; justify-content:center; }
    .qc-edit-modal {
      background:var(--_bg,#313244); border:0; border-radius:12px; padding:20px; z-index:100001;
      min-width:380px; max-width:90%;
      color:var(--_text,#cdd6f4);
    }
    .qc-edit-title { font-size:16px; font-weight:600; margin-bottom:16px; }
    .qc-edit-field { margin-bottom:16px; }
    .qc-edit-input {
      width:100%; padding:8px 12px; border-radius:6px;
      border:1px solid rgba(128,128,128,0.3);
      background:rgba(0,0,0,0.2); color:inherit; font-size:13px; outline:none;
      box-sizing:border-box;
    }
    .qc-edit-input:focus { border-color:var(--primary-color,#3b82f6); }
    .qc-edit-footer { display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
  `],
})
export class QuickCommandSettingsComponent {
  commands: QuickCommand[] = []
  groups: QuickCommandGroup[] = []
  lang: '' | 'zh-CN' | 'en-US' = (() => {
    const v = localStorage.getItem('qc-plus-locale')
    if (v === 'zh-CN' || v === 'en-US') return v
    return ''
  })()

  /*
   * 毛玻璃配色预设 — 字段说明
   * ───────────────────────────────────────────
   * bg / bgRgb         面板整体背景（rgba 半透明实现毛玻璃）/ 对应 RGB 分量
   * text                主文字颜色（命令名、标题等）
   * textSecondary       次要文字颜色（搜索框文字、命令预览等）
   * textMuted           辅助文字颜色（图标、提示、占位符等）
   * groupName           分组夹名称颜色
   * primary / primaryRgb 主色调（按钮、链接、选中态、快速入口边框）/ 对应 RGB 分量
   * surface / surfaceRgb 标题栏 / 卡片 / 元素背景色 / 对应 RGB 分量
   * border              边框颜色（面板、输入框、分隔线等）
   * inputBg             输入框背景色（搜索框、编辑弹窗输入框等）
   * hover               悬停高亮背景色
   * blur                毛玻璃模糊程度（blur 值）
   * saturate            毛玻璃饱和度（saturate 值）
   * shadow              面板整体阴影
   */
  colorThemes = [
    { value: 'acrylic-light', label: '毛玻璃·浅', bg: 'rgba(213,213,216,0.96)', bgRgb: '213,213,216', text: '#162234', textSecondary: '#939aa7', textMuted: '#8c97ab', groupName: '#1a2233', primary: '#4f7dff', primaryRgb: '79,125,255', surface: 'rgba(255,255,255,0.34)', surfaceRgb: '255,255,255', border: 'rgba(255,255,255,0.28)', inputBg: 'rgba(255,255,255,0.52)', hover: 'rgba(255,255,255,0.24)', blur: '28px', saturate: '180%', shadow: '0 10px 38px rgba(0,0,0,0.16)' },
    { value: 'acrylic-dark', label: '毛玻璃·深', bg: 'rgba(20,20,20,0.52)', bgRgb: '20,20,20', text: '#e8e8e8', textSecondary: '#b2b2b2', textMuted: '#8f8f8f', groupName: '#b2b2b2', primary: '#5b8def', primaryRgb: '91,141,239', surface: 'rgba(45,45,45,0.42)', surfaceRgb: '45,45,45', border: 'rgba(255,255,255,0.10)', inputBg: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.06)', blur: '30px', saturate: '145%', shadow: '0 10px 38px rgba(0,0,0,0.40)' },
    { value: 'ocean', label: '海洋蓝', bg: 'rgba(8,24,48,0.60)', bgRgb: '8,24,48', text: '#e0f0ff', textSecondary: '#90b8e0', textMuted: '#5888b8', groupName: '#90b8e0', primary: '#22d3ee', primaryRgb: '34,211,238', surface: 'rgba(20,50,90,0.35)', surfaceRgb: '20,50,90', border: 'rgba(100,180,240,0.14)', inputBg: 'rgba(10,30,60,0.50)', hover: 'rgba(100,160,220,0.08)', blur: '26px', saturate: '170%', shadow: '0 10px 38px rgba(0,40,80,0.40)' },
    { value: 'forest', label: '森林绿', bg: 'rgba(8,28,16,0.58)', bgRgb: '8,28,16', text: '#d8f8e0', textSecondary: '#80c898', textMuted: '#509868', groupName: '#80c898', primary: '#34d399', primaryRgb: '52,211,153', surface: 'rgba(16,50,28,0.35)', surfaceRgb: '16,50,28', border: 'rgba(80,180,120,0.12)', inputBg: 'rgba(8,30,16,0.48)', hover: 'rgba(80,160,100,0.08)', blur: '26px', saturate: '155%', shadow: '0 10px 38px rgba(0,30,10,0.40)' },
    { value: 'sunset', label: '日落橙', bg: 'rgba(40,16,8,0.62)', bgRgb: '40,16,8', text: '#ffe8d8', textSecondary: '#d0a088', textMuted: '#a07058', groupName: '#d0a088', primary: '#fb923c', primaryRgb: '251,146,60', surface: 'rgba(60,24,12,0.38)', surfaceRgb: '60,24,12', border: 'rgba(200,120,80,0.14)', inputBg: 'rgba(30,10,4,0.50)', hover: 'rgba(200,100,60,0.08)', blur: '24px', saturate: '150%', shadow: '0 10px 38px rgba(40,10,0,0.40)' },
    { value: 'lavender', label: '薰衣草紫', bg: 'rgba(22,14,36,0.58)', bgRgb: '22,14,36', text: '#ece0fc', textSecondary: '#b098d0', textMuted: '#7a60a8', groupName: '#b098d0', primary: '#a78bfa', primaryRgb: '167,139,250', surface: 'rgba(36,22,58,0.38)', surfaceRgb: '36,22,58', border: 'rgba(150,120,210,0.14)', inputBg: 'rgba(18,10,30,0.50)', hover: 'rgba(140,100,200,0.08)', blur: '28px', saturate: '160%', shadow: '0 10px 38px rgba(20,10,30,0.40)' },
    { value: 'custom', label: '自定义', bg: 'rgba(22,22,28,0.72)', bgRgb: '22,22,28', text: '#e8e8e8', textSecondary: '#b0b0b0', textMuted: '#7a7a8a', groupName: '#b0b0b0', primary: '#5b8def', primaryRgb: '91,141,239', surface: 'rgba(255,255,255,0.06)', surfaceRgb: '255,255,255', border: 'rgba(255,255,255,0.10)', inputBg: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.06)', blur: '24px', saturate: '160%', shadow: '0 8px 40px rgba(0,0,0,0.42)' },
  ]
  colorTheme: string = localStorage.getItem('qc-plus-theme') || ''
  colorPrimary: string = localStorage.getItem('qc-plus-color-primary') || ''
  colorPrimaryRgb: string = localStorage.getItem('qc-plus-color-primary-rgb') || ''
  colorBg: string = localStorage.getItem('qc-plus-color-bg') || ''
  colorBgRgb: string = localStorage.getItem('qc-plus-color-bg-rgb') || ''
  colorText: string = localStorage.getItem('qc-plus-color-text') || ''
  colorTextSecondary: string = localStorage.getItem('qc-plus-color-text-secondary') || ''
  colorMuted: string = localStorage.getItem('qc-plus-color-text-muted') || ''
  colorGroupName: string = localStorage.getItem('qc-plus-color-group-name') || ''
  colorSurface: string = localStorage.getItem('qc-plus-color-surface') || ''
  colorSurfaceRgb: string = localStorage.getItem('qc-plus-color-surface-rgb') || ''
  colorBorder: string = localStorage.getItem('qc-plus-color-border') || ''
  colorHover: string = localStorage.getItem('qc-plus-color-hover') || ''
  colorInputBg: string = localStorage.getItem('qc-plus-color-input-bg') || ''
  colorBlur: string = localStorage.getItem('qc-plus-color-blur') || ''
  colorSaturate: string = localStorage.getItem('qc-plus-color-saturate') || ''
  colorShadow: string = localStorage.getItem('qc-plus-color-shadow') || ''

  // 字体大小（px）
  fontSize: number = +(localStorage.getItem('qc-plus-font-size') || '14')

  // 入口模式
  entryMode: 'floating' | 'toolbar' = new QuickCommandService().getEntryMode()

  private svc = new QuickCommandService()

  // 清空数据确认弹窗
  showClearConfirm = false
  clearConfirmInput = ''

  get effectiveLang(): 'zh-CN' | 'en-US' {
    if (this.lang === 'zh-CN' || this.lang === 'en-US') return this.lang
    return detectSystemLocale()
  }

  get namedGroups(): QuickCommandGroup[] {
    return this.groups.filter(g => g.name)
  }

  t(zh: string, en?: string): string {
    if (this.effectiveLang === 'en-US' && en) return en
    return zh
  }

  /** 获取颜色主题的本地化名称 */
  themeLabel(c: any): string {
    const labels: Record<string, [string, string]> = {
      'acrylic-light': ['毛玻璃·浅', 'Acrylic Light'],
      'acrylic-dark':  ['毛玻璃·深', 'Acrylic Dark'],
      'ocean':  ['海洋蓝', 'Ocean'],
      'forest': ['森林绿', 'Forest'],
      'sunset': ['日落橙', 'Sunset'],
      'lavender':['薰衣草紫', 'Lavender'],
      'custom': ['自定义', 'Custom'],
    }
    const pair = labels[c.value]
    if (pair) return this.t(pair[0], pair[1])
    return c.label || ''
  }

  constructor() {
    this.refresh()
    // 预设主题：启动时重新应用 CSS 变量（applySavedTheme 已清除残留，需在此补上预设值）
    if (this.colorTheme && this.colorTheme !== 'custom' && this.colorTheme !== '') {
      this.setColorTheme(this.colorTheme)
    }
    // 自定义模式：从 localStorage 逐项恢复颜色变量
    if (this.colorTheme === 'custom' && this.colorPrimary && this.colorBg && this.colorText) {
      const root = document.documentElement
      const apply = (prop: string, key: string) => {
        const val = localStorage.getItem(`qc-plus-color-${key}`)
        if (val) root.style.setProperty(`--qc-${prop}`, val)
      }
      apply('primary', 'primary')
      apply('primary-rgb', 'primary-rgb')
      apply('bg', 'bg')
      apply('bg-rgb', 'bg-rgb')
      apply('text', 'text')
      apply('text-secondary', 'text-secondary')
      apply('text-muted', 'text-muted')
      apply('group-name', 'group-name')
      apply('border', 'border')
      apply('surface', 'surface')
      apply('surface-rgb', 'surface-rgb')
      apply('hover', 'hover')
      apply('input-bg', 'input-bg')
      apply('blur', 'blur')
      apply('saturate', 'saturate')
      apply('shadow', 'shadow')
    }
    const savedFontSize = localStorage.getItem('qc-plus-font-size')
    if (savedFontSize) {
      document.documentElement.style.setProperty('--qc-font-size', savedFontSize + 'px')
    }
  }

  private refresh(): void {
    this.commands = this.svc.getAll()
    this.groups = this.svc.getGroups()
    this.notifyPanels()
  }

  /** 通知所有浮动面板数据或语言已变更 */
  private notifyPanels(): void {
    try { window.dispatchEvent(new CustomEvent('qc-plus-data-changed')) } catch {}
  }

  onLangChange(): void {
    localStorage.setItem('qc-plus-locale', this.lang || 'auto')
    window.dispatchEvent(new CustomEvent('qc-plus-locale-changed', { detail: this.lang || 'auto' }))
    this.notifyPanels()
  }

  onFontSizeChange(val: number): void {
    this.fontSize = Math.max(11, Math.min(18, val))
    localStorage.setItem('qc-plus-font-size', String(this.fontSize))
    const root = document.documentElement
    root.style.setProperty('--qc-font-size', this.fontSize + 'px')
    this.notifyPanels()
  }

  onEntryModeChange(): void {
    new QuickCommandService().saveEntryMode(this.entryMode)
    // 通过 window 事件 + 全局回调 通知所有终端装饰器重建入口
    window.dispatchEvent(new CustomEvent('qc-plus-entry-mode-changed', { detail: this.entryMode }))
    // 全局回调兜底（设置面板先触发事件，等下一帧再触达已经就绪的监听器）
    if (typeof (window as any).__qcRebuildEntry === 'function') {
      ;(window as any).__qcRebuildEntry()
    }
    // 兜底：直接触发所有已知入口的 data 属性变更来触发重建
    try {
      const els = document.querySelectorAll('[data-qc-entry="1"]')
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        el.dispatchEvent(new CustomEvent('qc-mode-change', { bubbles: true }))
      }
    } catch {}
  }

  openGithub(): void {
    const url = 'https://github.com/DD1024z/Tabby-QuickCmd-Plus'
    try {
      // Electron shell
      ;(window as any).require('electron').shell.openExternal(url)
    } catch {
      try {
        // 标准浏览器
        window.open(url, '_blank')
      } catch {
        // 兜底
        location.href = url
      }
    }
  }

  setColorTheme(value: string): void {
    this.colorTheme = value
    localStorage.setItem('qc-plus-theme', value)

    if (value === 'custom') {
      const savedPrimary = localStorage.getItem('qc-plus-color-primary')
      if (savedPrimary) {
        this.colorPrimary = savedPrimary
        this.colorPrimaryRgb = localStorage.getItem('qc-plus-color-primary-rgb') || '91,141,239'
        this.colorBg = localStorage.getItem('qc-plus-color-bg') || 'rgba(22,22,28,0.72)'
        this.colorBgRgb = localStorage.getItem('qc-plus-color-bg-rgb') || '22,22,28'
        this.colorText = localStorage.getItem('qc-plus-color-text') || '#e8e8e8'
        this.colorTextSecondary = localStorage.getItem('qc-plus-color-text-secondary') || '#b0b0b0'
        this.colorMuted = localStorage.getItem('qc-plus-color-text-muted') || '#7a7a8a'
        this.colorSurface = localStorage.getItem('qc-plus-color-surface') || 'rgba(255,255,255,0.06)'
        this.colorSurfaceRgb = localStorage.getItem('qc-plus-color-surface-rgb') || '255,255,255'
        this.colorBorder = localStorage.getItem('qc-plus-color-border') || 'rgba(255,255,255,0.10)'
        this.colorHover = localStorage.getItem('qc-plus-color-hover') || 'rgba(255,255,255,0.06)'
        this.colorInputBg = localStorage.getItem('qc-plus-color-input-bg') || 'rgba(255,255,255,0.08)'
        this.colorBlur = localStorage.getItem('qc-plus-color-blur') || '24px'
        this.colorSaturate = localStorage.getItem('qc-plus-color-saturate') || '160%'
        this.colorShadow = localStorage.getItem('qc-plus-color-shadow') || '0 8px 40px rgba(0,0,0,0.42)'
        this.colorGroupName = localStorage.getItem('qc-plus-color-group-name') || '#b0b0b0'
      } else {
        this.colorPrimary = '#5b8def'; this.colorPrimaryRgb = '91,141,239'
        this.colorBg = 'rgba(22,22,28,0.72)'; this.colorBgRgb = '22,22,28'
        this.colorText = '#e8e8e8'; this.colorTextSecondary = '#b0b0b0'
        this.colorMuted = '#7a7a8a'
        this.colorSurface = 'rgba(255,255,255,0.06)'; this.colorSurfaceRgb = '255,255,255'
        this.colorBorder = 'rgba(255,255,255,0.10)'
        this.colorHover = 'rgba(255,255,255,0.06)'
        this.colorInputBg = 'rgba(255,255,255,0.08)'
        this.colorBlur = '24px'; this.colorSaturate = '160%'
        this.colorShadow = '0 8px 40px rgba(0,0,0,0.42)'
        this.colorGroupName = '#b0b0b0'
      }
      this.applyColorTheme()
      this.updateCustomPreview()
      return
    }

    // 从 colorThemes 数组读取预设值（唯一数据源）
    const p = this.colorThemes.find(t => t.value === value)
    if (value && p) {
      const root = document.documentElement
      root.style.setProperty('--qc-primary', p.primary)
      root.style.setProperty('--qc-primary-rgb', p.primaryRgb)
      root.style.setProperty('--qc-bg', p.bg)
      root.style.setProperty('--qc-bg-rgb', p.bgRgb)
      root.style.setProperty('--qc-text', p.text)
      root.style.setProperty('--qc-text-secondary', p.textSecondary)
      root.style.setProperty('--qc-text-muted', p.textMuted)
      root.style.setProperty('--qc-border', p.border)
      root.style.setProperty('--qc-surface', p.surface)
      root.style.setProperty('--qc-surface-rgb', p.surfaceRgb)
      root.style.setProperty('--qc-hover', p.hover)
      root.style.setProperty('--qc-input-bg', p.inputBg)
      root.style.setProperty('--qc-blur', p.blur)
      root.style.setProperty('--qc-saturate', p.saturate)
      root.style.setProperty('--qc-shadow', p.shadow)
      if (p.groupName) root.style.setProperty('--qc-group-name', p.groupName)
    } else {
      // Auto: clear custom vars
      this.colorPrimary = ''
      this.colorBg = ''
      this.colorText = ''
      this.clearColorVars()
    }
    this.notifyPanels()
  }

  applyColorTheme(): void {
    localStorage.setItem('qc-plus-theme', 'custom')
    this.colorTheme = 'custom'
    this.saveColorVars()
    this.notifyPanels()
  }

  /** 同步自定义配色到 colorThemes 数组，使预览实时更新 */
  private updateCustomPreview(): void {
    const custom = this.colorThemes.find(t => t.value === 'custom')
    if (custom) {
      custom.primary = this.colorPrimary; custom.primaryRgb = this.colorPrimaryRgb
      custom.bg = this.colorBg; custom.bgRgb = this.colorBgRgb
      custom.text = this.colorText; custom.textSecondary = this.colorTextSecondary
      custom.textMuted = this.colorMuted; custom.groupName = this.colorGroupName
      custom.surface = this.colorSurface; custom.surfaceRgb = this.colorSurfaceRgb
      custom.border = this.colorBorder; custom.hover = this.colorHover
      custom.inputBg = this.colorInputBg
      custom.blur = this.colorBlur; custom.saturate = this.colorSaturate
      custom.shadow = this.colorShadow
    }
  }

  private saveColorVars(p?: any): void {
    const root = document.documentElement
    root.style.setProperty('--qc-primary', p?.primary ?? this.colorPrimary)
    root.style.setProperty('--qc-primary-rgb', p?.primaryRgb ?? this.colorPrimaryRgb)
    root.style.setProperty('--qc-bg', p?.bg ?? this.colorBg)
    root.style.setProperty('--qc-bg-rgb', p?.bgRgb ?? this.colorBgRgb)
    root.style.setProperty('--qc-text', p?.text ?? this.colorText)
    root.style.setProperty('--qc-text-secondary', p?.textSecondary ?? this.colorTextSecondary)
    root.style.setProperty('--qc-text-muted', p?.textMuted ?? this.colorMuted)
    root.style.setProperty('--qc-border', p?.border ?? this.colorBorder)
    root.style.setProperty('--qc-surface', p?.surface ?? this.colorSurface)
    root.style.setProperty('--qc-surface-rgb', p?.surfaceRgb ?? this.colorSurfaceRgb)
    root.style.setProperty('--qc-hover', p?.hover ?? this.colorHover)
    root.style.setProperty('--qc-input-bg', p?.inputBg ?? this.colorInputBg)
    root.style.setProperty('--qc-blur', p?.blur ?? this.colorBlur)
    root.style.setProperty('--qc-saturate', p?.saturate ?? this.colorSaturate)
    root.style.setProperty('--qc-shadow', p?.shadow ?? this.colorShadow)
    root.style.setProperty('--qc-group-name', p?.groupName ?? this.colorGroupName)
    const keys = [
      { k: 'primary', v: p?.primary ?? this.colorPrimary },
      { k: 'primary-rgb', v: p?.primaryRgb ?? this.colorPrimaryRgb },
      { k: 'bg', v: p?.bg ?? this.colorBg },
      { k: 'bg-rgb', v: p?.bgRgb ?? this.colorBgRgb },
      { k: 'text', v: p?.text ?? this.colorText },
      { k: 'text-secondary', v: p?.textSecondary ?? this.colorTextSecondary },
      { k: 'text-muted', v: p?.textMuted ?? this.colorMuted },
      { k: 'group-name', v: p?.groupName ?? this.colorGroupName },
      { k: 'border', v: p?.border ?? this.colorBorder },
      { k: 'surface', v: p?.surface ?? this.colorSurface },
      { k: 'surface-rgb', v: p?.surfaceRgb ?? this.colorSurfaceRgb },
      { k: 'hover', v: p?.hover ?? this.colorHover },
      { k: 'input-bg', v: p?.inputBg ?? this.colorInputBg },
      { k: 'blur', v: p?.blur ?? this.colorBlur },
      { k: 'saturate', v: p?.saturate ?? this.colorSaturate },
      { k: 'shadow', v: p?.shadow ?? this.colorShadow },
    ]
    keys.forEach(({ k, v }) => localStorage.setItem(`qc-plus-color-${k}`, v))
  }

  private clearColorVars(): void {
    const root = document.documentElement
    const vars = ['--qc-primary','--qc-primary-rgb','--qc-bg','--qc-bg-rgb','--qc-text','--qc-text-secondary','--qc-text-muted',
      '--qc-group-name','--qc-border','--qc-surface','--qc-surface-rgb','--qc-hover','--qc-input-bg','--qc-blur','--qc-saturate','--qc-shadow']
    vars.forEach(v => root.style.removeProperty(v))
    const allKeys = ['qc-plus-color-primary','qc-plus-color-primary-rgb','qc-plus-color-bg','qc-plus-color-bg-rgb',
      'qc-plus-color-text','qc-plus-color-text-secondary','qc-plus-color-text-muted','qc-plus-color-group-name',
      'qc-plus-color-border','qc-plus-color-surface','qc-plus-color-surface-rgb','qc-plus-color-hover',
      'qc-plus-color-input-bg','qc-plus-color-blur','qc-plus-color-saturate','qc-plus-color-shadow']
    allKeys.forEach(k => localStorage.removeItem(k))
  }

  openClearConfirm(): void {
    this.clearConfirmInput = ''
    this.showClearConfirm = true
    setTimeout(() => {
      const input = document.querySelector('.qc-edit-modal .qc-edit-input') as HTMLInputElement | null
      if (input) input.focus()
    }, 50)
  }

  closeClearConfirm(): void {
    this.showClearConfirm = false
    this.clearConfirmInput = ''
  }

  doClearData(): void {
    if (this.clearConfirmInput !== 'DELETE') return
    this.showClearConfirm = false
    this.clearConfirmInput = ''
    this.svc['commands'] = []
    this.svc['groups'] = []
    this.svc['saveCommands']()
    this.svc['saveGroups']()
    this.refresh()
    alert(this.t('已清空所有数据', 'All data cleared'))
  }

  clearData(): void {
    if (confirm(this.t('确定清空所有命令数据？此操作不可撤销！', 'Clear all command data? This cannot be undone!'))) {
      this.svc['commands'] = []
      this.svc['groups'] = []
      this.svc['saveCommands']()
      this.svc['saveGroups']()
      this.refresh()
    }
  }

  /** 获取当前主题对应颜色值（用于 color input 显示） */
  currentColor(c: any, key: string): string {
    if (this.colorTheme === 'custom') {
      const map: Record<string, string> = {
        primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
        surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
        groupName: this.colorGroupName,
      }
      const val = map[key] || c[key] || c['textMuted'] || ''
      return this.toHexColor(val)
    }
    return this.toHexColor(c[key] || c['textMuted'] || '')
  }
  /** 尝试从 rgba 字符串提取 hex 给 color input 使用 */
  private toHexColor(val: string): string {
    if (!val) return '#808080'
    if (/^#[0-9a-fA-F]{3,8}$/.test(val)) return val
    const m = val.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (m) {
      return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('')
    }
    return '#808080'
  }

  /** 颜色值变更时自动切换为自定义模式 */
  onColorChange(key: string, val: string): void {
    if (this.colorTheme !== 'custom') {
      const activeTheme = this.colorThemes.find(t => t.value === this.colorTheme)
      if (activeTheme) {
        this.colorPrimary = activeTheme.primary; this.colorPrimaryRgb = activeTheme.primaryRgb || ''
        this.colorBg = activeTheme.bg; this.colorBgRgb = activeTheme.bgRgb || ''
        this.colorText = activeTheme.text; this.colorTextSecondary = activeTheme.textSecondary || ''
        this.colorMuted = activeTheme.textMuted || ''
        this.colorSurface = activeTheme.surface; this.colorSurfaceRgb = activeTheme.surfaceRgb || ''
        this.colorBorder = activeTheme.border; this.colorHover = activeTheme.hover || ''
        this.colorInputBg = activeTheme.inputBg || ''; this.colorBlur = activeTheme.blur || ''
        this.colorSaturate = activeTheme.saturate || ''; this.colorShadow = activeTheme.shadow || ''
        this.colorGroupName = activeTheme.groupName || ''
      }
      this.colorTheme = 'custom'
      localStorage.setItem('qc-plus-theme', 'custom')
    }
    const map: Record<string, string> = {
      primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
      surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
      groupName: this.colorGroupName,
    }
    map[key] = val
    ;({ primary: this.colorPrimary, bg: this.colorBg, text: this.colorText,
       surface: this.colorSurface, border: this.colorBorder, muted: this.colorMuted,
       groupName: this.colorGroupName } = map)
    this.saveColorVars()
    this.updateCustomPreview()
    this.notifyPanels()
  }

  exportData(): void {
    const json = this.svc.exportAll()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
    a.download = `quick-cmd-plus_backup_${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  onImport(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const ok = this.svc.importAll(reader.result as string)
      if (ok) alert(this.t('导入成功', 'Import successful'))
      else alert(this.t('导入失败：文件格式无效', 'Import failed: invalid file format'))
      this.refresh()
    }
    reader.readAsText(file)
    input.value = ''
  }
}

@Injectable()
export class QuickCommandSettingsTabProvider extends SettingsTabProvider {
  id = 'qc-settings'
  icon = 'fas fa-terminal'
  title = 'QuickCmd+'

  getComponentType(): any {
    return QuickCommandSettingsComponent
  }

  async getSettingsTabs() {
    return [{
      title: 'QuickCmd+',
      icon: 'fas fa-terminal',
      weight: 99,
      component: QuickCommandSettingsComponent,
    }]
  }
}
