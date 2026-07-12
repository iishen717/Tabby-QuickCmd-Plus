/**
 * QuickCommand+ 插件入口
 * 功能描述：注册 TerminalDecorator（浮动入口）+ 浮动面板 + 设置页
 * 创建人：DD1024z + Deepseek-V4-Flash
 * 创建时间：2026-06-26
 * 修改人：DD1024z + Deepseek-V4-Flash
 * 修改时间：2026-06-27
 *   模块启动时自动应用已保存的颜色主题
 */
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgModule, Injectable, Injector } from '@angular/core'
import TabbyCoreModule from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { TerminalDecorator } from 'tabby-terminal'

import { QuickCommandTerminalDecorator } from './qc-terminal-decorator'
import { QuickCommandFloatingPanel } from './qc-floating-panel.component'
import { QuickCommandSettingsTabProvider, QuickCommandSettingsComponent } from './qc-settings.component'
import { ToolbarButtonProvider, ToolbarButton } from 'tabby-core'

/** 启动时应用已保存的颜色主题 */
function applySavedTheme(): void {
  try {
    const theme = localStorage.getItem('qc-plus-theme')
    const root = document.documentElement

    /*
     * 预设主题色值（与 settings 组件保持一致；settings 打开时 setColorTheme 会再应用一次）
     * --qc-bg / --qc-bg-rgb       面板整体背景 / RGB 分量
     * --qc-text                    主文字颜色（命令名、标题等）
     * --qc-text-secondary          次要文字颜色（搜索框文字、命令预览等）
     * --qc-text-muted              辅助文字颜色（图标、提示、占位符等）
     * --qc-group-name              分组夹名称颜色
     * --qc-primary / --qc-primary-rgb 主色调（按钮、选中态、快速入口等）/ RGB 分量
     * --qc-surface / --qc-surface-rgb 标题栏/卡片背景色 / RGB 分量
     * --qc-border                  边框颜色
     * --qc-input-bg                输入框背景色
     * --qc-hover                   悬停高亮背景色
     * --qc-blur                    毛玻璃模糊程度
     * --qc-saturate                毛玻璃饱和度
     * --qc-shadow                  面板整体阴影
     */
    const presets: Record<string, Record<string, string>> = {
      'acrylic-light': { '--qc-primary':'#4f7dff','--qc-primary-rgb':'79,125,255','--qc-bg':'rgba(213,213,216,0.96)','--qc-bg-rgb':'213,213,216','--qc-text':'#162234','--qc-text-secondary':'#607188','--qc-text-muted':'#8c97ab','--qc-group-name':'#4a6080','--qc-border':'rgba(255,255,255,0.28)','--qc-surface':'rgba(255,255,255,0.34)','--qc-surface-rgb':'255,255,255','--qc-hover':'rgba(255,255,255,0.24)','--qc-input-bg':'rgba(255,255,255,0.52)','--qc-blur':'28px','--qc-saturate':'180%','--qc-shadow':'0 10px 38px rgba(0,0,0,0.16)' },
      'acrylic-dark':  { '--qc-primary':'#5b8def','--qc-primary-rgb':'91,141,239','--qc-bg':'rgba(20,20,20,0.52)','--qc-bg-rgb':'20,20,20','--qc-text':'#e8e8e8','--qc-text-secondary':'#b2b2b2','--qc-text-muted':'#8f8f8f','--qc-group-name':'#b2b2b2','--qc-border':'rgba(255,255,255,0.10)','--qc-surface':'rgba(45,45,45,0.42)','--qc-surface-rgb':'45,45,45','--qc-hover':'rgba(255,255,255,0.06)','--qc-input-bg':'rgba(255,255,255,0.08)','--qc-blur':'30px','--qc-saturate':'145%','--qc-shadow':'0 10px 38px rgba(0,0,0,0.40)' },
      'ocean':  { '--qc-primary':'#22d3ee','--qc-primary-rgb':'34,211,238','--qc-bg':'rgba(8,24,48,0.60)','--qc-bg-rgb':'8,24,48','--qc-text':'#e0f0ff','--qc-text-secondary':'#90b8e0','--qc-text-muted':'#5888b8','--qc-group-name':'#90b8e0','--qc-border':'rgba(100,180,240,0.14)','--qc-surface':'rgba(20,50,90,0.35)','--qc-surface-rgb':'20,50,90','--qc-hover':'rgba(100,160,220,0.08)','--qc-input-bg':'rgba(10,30,60,0.50)','--qc-blur':'26px','--qc-saturate':'170%','--qc-shadow':'0 10px 38px rgba(0,40,80,0.40)' },
      'forest': { '--qc-primary':'#34d399','--qc-primary-rgb':'52,211,153','--qc-bg':'rgba(8,28,16,0.58)','--qc-bg-rgb':'8,28,16','--qc-text':'#d8f8e0','--qc-text-secondary':'#80c898','--qc-text-muted':'#509868','--qc-group-name':'#80c898','--qc-border':'rgba(80,180,120,0.12)','--qc-surface':'rgba(16,50,28,0.35)','--qc-surface-rgb':'16,50,28','--qc-hover':'rgba(80,160,100,0.08)','--qc-input-bg':'rgba(8,30,16,0.48)','--qc-blur':'26px','--qc-saturate':'155%','--qc-shadow':'0 10px 38px rgba(0,30,10,0.40)' },
      'sunset': { '--qc-primary':'#fb923c','--qc-primary-rgb':'251,146,60','--qc-bg':'rgba(40,16,8,0.62)','--qc-bg-rgb':'40,16,8','--qc-text':'#ffe8d8','--qc-text-secondary':'#d0a088','--qc-text-muted':'#a07058','--qc-group-name':'#d0a088','--qc-border':'rgba(200,120,80,0.14)','--qc-surface':'rgba(60,24,12,0.38)','--qc-surface-rgb':'60,24,12','--qc-hover':'rgba(200,100,60,0.08)','--qc-input-bg':'rgba(30,10,4,0.50)','--qc-blur':'24px','--qc-saturate':'150%','--qc-shadow':'0 10px 38px rgba(40,10,0,0.40)' },
      'lavender': { '--qc-primary':'#a78bfa','--qc-primary-rgb':'167,139,250','--qc-bg':'rgba(22,14,36,0.58)','--qc-bg-rgb':'22,14,36','--qc-text':'#ece0fc','--qc-text-secondary':'#b098d0','--qc-text-muted':'#7a60a8','--qc-group-name':'#b098d0','--qc-border':'rgba(150,120,210,0.14)','--qc-surface':'rgba(36,22,58,0.38)','--qc-surface-rgb':'36,22,58','--qc-hover':'rgba(140,100,200,0.08)','--qc-input-bg':'rgba(18,10,30,0.50)','--qc-blur':'28px','--qc-saturate':'160%','--qc-shadow':'0 10px 38px rgba(20,10,30,0.40)' },
    }

    // 预设主题：直接应用色值
    if (theme && presets[theme]) {
      const p = presets[theme]
      for (const [k, v] of Object.entries(p)) {
        root.style.setProperty(k, v)
      }
      console.log('[QC+] Preset theme applied:', theme)
      return
    }

    // 自定义模式：从 localStorage 逐项恢复
    if (theme === 'custom') {
      const keys = [
        'primary','primary-rgb','bg','bg-rgb',
        'text','text-secondary','text-muted','group-name',
        'border','surface','surface-rgb',
        'hover','input-bg','blur','saturate','shadow'
      ]
      let applied = false
      for (const k of keys) {
        const val = localStorage.getItem(`qc-plus-color-${k}`)
        if (val) { root.style.setProperty(`--qc-${k}`, val); applied = true }
      }
      if (applied) console.log('[QC+] Custom glass theme applied')
      return
    }

    // Auto / 空：清除所有变量，使用默认值
    const allVars = [
      '--qc-primary','--qc-primary-rgb','--qc-bg','--qc-bg-rgb',
      '--qc-text','--qc-text-secondary','--qc-text-muted','--qc-group-name',
      '--qc-border','--qc-surface','--qc-surface-rgb',
      '--qc-hover','--qc-input-bg','--qc-blur','--qc-saturate','--qc-shadow'
    ]
    allVars.forEach(v => root.style.removeProperty(v))
  } catch { /* ignore */ }
}
applySavedTheme()

/** 在 Tabby 首页显示 QuickCmd+ 入口按钮，点击直接弹出独立面板 */
@Injectable()
export class QuickCmdStartPageButtonProvider extends ToolbarButtonProvider {
  constructor(private injector: Injector) {
    super()
  }

  provide(): ToolbarButton[] {
    return [{
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><text x="2" y="19" font-size="20" font-family="monospace" font-weight="bold">&gt;_</text></svg>',
      title: 'QuickCmd-Plus',
      weight: 9,
      showInStartPage: true,
      click: () => {
        QuickCommandTerminalDecorator.openStandalonePanel(this.injector)
      },
    }]
  }
}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TabbyCoreModule,
  ],
  declarations: [
    QuickCommandFloatingPanel,
    QuickCommandSettingsComponent,
  ],
  providers: [
    { provide: TerminalDecorator, useClass: QuickCommandTerminalDecorator, multi: true },
    { provide: SettingsTabProvider, useClass: QuickCommandSettingsTabProvider, multi: true },
    { provide: ToolbarButtonProvider, useClass: QuickCmdStartPageButtonProvider, multi: true },
  ],
})
export default class QuickCommandPlusModule {
  constructor() {
    console.log('[QC+] Module loaded OK')
  }
}
