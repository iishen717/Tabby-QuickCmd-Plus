/**
 * QuickCommand+ 浮动面板组件
 * 功能描述：浮动在终端上的快捷命令面板，支持搜索/分组/执行/最小化/拖拽
 * 创建人：DD1024z + Deepseek-V4-Flash
 * 创建时间：2026-06-26
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core'
import { QuickCommandService, QuickCommand, QuickCommandGroup, CommandStep, resolveSteps, PositionMemoryData } from './qc-command.service'
import { QuickCommandI18nService } from './qc-i18n.service'

@Component({
  selector: 'qc-floating-panel',
  template: `
    <!-- ====== 浮动面板主体 ====== -->
    <div class="qc-panel"
      [class.minimized]="minimized"
      [class.resizing]="resizing !== null"
      [style.left.px]="panelX"
      [style.top.px]="panelY"
      [style.width.px]="panelWidth"
      [style.height.px]="panelHeight || null"
      [style.max-height.px]="panelHeight ? null : 420"
      (mousedown)="noBubble($event)">

      <!-- 玻璃高光层 -->
      <div class="qc-glass-shine"></div>

      <!-- 标题栏 -->
      <div class="qc-titlebar" (mousedown)="startDrag($event)">
        <span class="qc-title-dot"></span>
        <span class="qc-title">{{ i18n.t('app.title') }}</span>
        <span class="qc-ssh-badge" *ngIf="sshHost">{{ sshHost }}</span>
        <div class="qc-title-spacer"></div>
        <span class="qc-title-btn qc-title-btn-mem"
              [title]="posMemoryOn ? i18n.t('panel.memory_on') : i18n.t('panel.memory_off')"
              [class.active]="posMemoryOn"
              (click)="togglePosMemory(); $event.stopPropagation()">&#x2605;</span>
        <span class="qc-title-btn qc-title-btn-close"
              [title]="i18n.t('panel.close')"
              (click)="doClose(); $event.stopPropagation()">&#x2715;</span>
      </div>

      <ng-container *ngIf="!minimized">
        <!-- 搜索栏 -->
        <div class="qc-search">
          <!-- 分组筛选触发器 -->
          <div class="qc-filter-dropdown" [class.open]="showGroupDropdown">
            <div class="qc-filter-trigger" #filterTrigger (click)="toggleFilterDropdown(filterTrigger); $event.stopPropagation()">
              <span class="qc-filter-label">{{ getFilterGroupLabel() }}</span>
              <span class="qc-filter-clear-btn" *ngIf="filterGroup" (click)="filterGroup = ''; onSearch(); $event.stopPropagation()" [title]="i18n.t('app.all_groups')">&#x2715;</span>
              <span class="qc-filter-arrow">{{ showGroupDropdown ? '&#x25B2;' : '&#x25BC;' }}</span>
            </div>
          </div>
          <div class="qc-search-input-wrap">
            <input class="qc-search-input" type="text"
              [placeholder]="i18n.t('app.search')"
              [(ngModel)]="searchText"
              (input)="onSearch()"
              (keydown.enter)="executeFirst()"
              (keydown.escape)="doClose()">
            <span class="qc-search-clear" *ngIf="searchText" (click)="searchText=''; onSearch()">&#x2715;</span>
          </div>
        </div>

        <!-- 快捷命令栏 -->
        <div class="qc-quick-bar" *ngIf="pinnedCommands.length > 0" (wheel)="onQuickBarWheel($event)">
          <div class="qc-quick-cmd" *ngFor="let pcmd of pinnedCommands"
            (click)="executeCommand(pcmd)" [title]="pcmd.text">
            <span class="qc-quick-icon">&#x2691;</span>
            <span class="qc-quick-name">{{ pcmd.name }}</span>
          </div>
        </div>

        <!-- 命令列表 -->
        <div class="qc-list" #listRef>
          <ng-container *ngFor="let group of displayGroups; let gi = index">
            <!-- 分组头 -->
            <div class="qc-group-header"
              (click)="toggleGroup(group.name)"
              dragover="event.preventDefault()"
              (drop)="onDropToGroup($event, group.name)"
              (dragleave)="onDragLeave($event)">
              <span class="qc-group-arrow">{{ group.expanded ? '&#x25BC;' : '&#x25B6;' }}</span>
              <span class="qc-group-icon">{{ group.expanded ? '&#x1F4C2;' : '&#x1F4C1;' }}</span>
              <span class="qc-group-name">{{ group.name || i18n.t('app.ungrouped') }}</span>
              <span class="qc-group-count">{{ getGroupCommands(group.name).length }}</span>
              <div class="qc-group-actions">
                <span class="qc-group-act" (click)="addCommandToGroup(group.name); $event.stopPropagation()" [title]="i18n.t('panel.add')">+</span>
                <span class="qc-group-act" (click)="showGroupRenameDialog(group.name); $event.stopPropagation()" [title]="i18n.t('group.rename')">&#x270E;</span>
                <span class="qc-group-act qc-group-act-del" (click)="deleteGroup(group.name); $event.stopPropagation()" [title]="i18n.t('group.delete')">&#x2212;</span>
              </div>
            </div>

            <!-- 命令行 -->
            <div *ngIf="group.expanded" class="qc-cmd-group-body"
              (dragover)="onListDragOver($event)"
              (dragleave)="onListDragLeave($event)"
              (drop)="onListDrop($event, group.name)">
              <div *ngFor="let cmd of getGroupCommands(group.name)" class="qc-cmd-row"
                (click)="executeCommand(cmd)"
                (dblclick)="editCommand(cmd)"
                [class.highlighted]="highlightedId === cmd.id"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event, cmd)">
                <span class="qc-cmd-drag" draggable="true"
                  (dragstart)="onDragStart($event, cmd)"
                  (dragend)="onDragEnd($event)" [title]="i18n.t('panel.drag_reorder')">&#x2261;</span>
                <div class="qc-cmd-body">
                  <span class="qc-cmd-name">{{ cmd.name }}</span>
                  <span class="qc-cmd-preview" [title]="cmd.text">{{ getPreview(cmd) }}</span>
                </div>
                <span class="qc-cmd-badge" *ngIf="cmd.params && cmd.params.length > 0" [title]="i18n.t('panel.param_hint')">{{ getParamBadge(cmd) }}</span>
                <span class="qc-cmd-shortcut-badge" *ngIf="cmd.shortcut">{{ cmd.shortcut }}</span>
                <div class="qc-cmd-actions">
                  <span class="qc-cmd-act" (click)="togglePin(cmd); $event.stopPropagation()"
                    [title]="cmd.pinned ? i18n.t('panel.unpin') : i18n.t('panel.pin')"
                    [class.active]="cmd.pinned">&#x2691;</span>
                  <span class="qc-cmd-act" (click)="editCommand(cmd); $event.stopPropagation()" [title]="i18n.t('panel.edit')">&#x270E;</span>
                  <span class="qc-cmd-act" (click)="sendToLine(cmd); $event.stopPropagation()" [title]="i18n.t('panel.send_to_line')">&#x21E7;</span>
                  <span class="qc-cmd-act qc-cmd-act-run" (click)="executeAlways(cmd); $event.stopPropagation()" [title]="i18n.t('panel.send_and_exec')">&#x23CE;</span>
                  <span class="qc-cmd-act qc-cmd-act-del" (click)="deleteCommand(cmd); $event.stopPropagation()" [title]="i18n.t('panel.delete')">&#x2715;</span>
                </div>
              </div>
              <div class="qc-drop-end" [class.drag-over]="listDropOver"></div>
            </div>
          </ng-container>

          <div class="qc-empty" *ngIf="filteredCommands.length === 0 && searchText">
            <span class="qc-empty-icon">&#x1F50D;</span>
            <span>{{ i18n.t('app.noresults') }}</span>
          </div>
          <div class="qc-empty" *ngIf="filteredCommands.length === 0 && !searchText">
            <span class="qc-empty-icon">&#x2328;</span>
            <span>{{ i18n.t('panel.hint.search') }}</span>
          </div>
        </div>

        <!-- 底部栏 -->
        <div class="qc-footer">
          <span class="qc-footer-btn qc-footer-btn-primary" (click)="addCommand()">+ {{ i18n.t('panel.add') }}</span>
          <span class="qc-footer-btn" (click)="addNewGroup()">+ {{ i18n.t('group.add') }}</span>
          <span class="qc-footer-count" *ngIf="selectedCount > 0">{{ selectedCount }} cmd</span>
        </div>
      </ng-container>

      <!-- 调整大小手柄 -->
      <div class="qc-rsz qc-rsz-e"  (mousedown)="startResize($event, 'e')"></div>
      <div class="qc-rsz qc-rsz-w"  (mousedown)="startResize($event, 'w')"></div>
      <div class="qc-rsz qc-rsz-s"  (mousedown)="startResize($event, 's')"></div>
      <div class="qc-rsz qc-rsz-n"  (mousedown)="startResize($event, 'n')"></div>
      <div class="qc-rsz qc-rsz-se" (mousedown)="startResize($event, 'se')"></div>
      <div class="qc-rsz qc-rsz-sw" (mousedown)="startResize($event, 'sw')"></div>
      <div class="qc-rsz qc-rsz-ne" (mousedown)="startResize($event, 'ne')"></div>
      <div class="qc-rsz qc-rsz-nw" (mousedown)="startResize($event, 'nw')"></div>
    </div>

    <!-- ====== 分组下拉（在面板外部，使用 fixed 定位，避免被面板 overflow/stacking 裁剪） ====== -->
    <div class="qc-filter-backdrop" *ngIf="showGroupDropdown" (click)="showGroupDropdown = false; $event.stopPropagation()" (mousedown)="$event.stopPropagation()"></div>
    <div class="qc-filter-menu" *ngIf="showGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="filterMenuX" [style.top.px]="filterMenuY">
      <div class="qc-filter-option" [class.active]="filterGroup === ''"
        (click)="filterGroup = ''; showGroupDropdown = false; onSearch()">
        <span class="qc-filter-opt-icon">&#x1F3F7;</span> {{ i18n.t('app.all_groups') }}
      </div>
      <div class="qc-filter-opt-divider"></div>
      <div class="qc-filter-option" *ngFor="let g of allGroups"
        [class.active]="filterGroup === (g.name || '__ungrouped__')"
        (click)="filterGroup = (g.name || '__ungrouped__'); showGroupDropdown = false; onSearch()">
        <span class="qc-filter-opt-icon">{{ (g.name ? '&#x1F4C1;' : '&#x1F4C4;') }}</span> {{ g.name || i18n.t('app.ungrouped') }}
      </div>
    </div>

    <!-- ====== 编辑命令弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showEditModal" (click)="closeEditModal()"></div>
    <div class="qc-modal" *ngIf="showEditModal" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ editCmd?.id ? i18n.t('settings.edit_cmd') : i18n.t('panel.add') }}</span>
      </div>
      <div class="qc-modal-body">
        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('settings.name') }}</label>
          <input class="qc-field-input" type="text" [(ngModel)]="editCmd.name" (keydown.enter)="saveEditCmd()" placeholder="e.g. git status">
        </div>

        <label class="qc-field-label" style="margin-bottom:6px;">{{ i18n.t('settings.text') }}</label>
        <div class="qc-step-row" *ngFor="let step of editCmdSteps; let i = index"
          (dragover)="onStepDragOver($event, i)"
          (dragleave)="onStepDragLeave($event)"
          (drop)="onStepDrop($event, i)"
          [class.dragging]="stepDragIdx === i">
          <span class="qc-step-drag" draggable="true"
            (dragstart)="onStepDragStart($event, i)"
            (dragend)="onStepDragEnd($event)" [title]="i18n.t('panel.drag_reorder')">&#x2261;</span>
          <span class="qc-step-type"
            (click)="step.type = (step.type === 'break' ? 'command' : 'break'); $event.stopPropagation()"
            [title]="step.type === 'break' ? i18n.t('settings.step_type_cmd') : i18n.t('settings.step_type_break')"
            [class.is-break]="step.type === 'break'">{{ step.type === 'break' ? '&#x26A0;' : '&#x25B6;' }}</span>
          <input class="qc-step-delay" type="number" min="0" max="60" step="0.2"
            [(ngModel)]="step.delaySeconds" [placeholder]="i18n.t('settings.delay_short')"
            [title]="i18n.t('settings.delay_hint')">
          <textarea class="qc-step-input" [(ngModel)]="step.text" rows="1"
            *ngIf="step.type !== 'break'" [placeholder]="(i18n.t('settings.step_placeholder') + ' ' + (i+1))"
            (input)="autoGrow($event)" (keydown.enter)="saveEditCmd()"></textarea>
          <span class="qc-step-break-label" *ngIf="step.type === 'break'">{{ i18n.t('settings.send_ctrlc') }}</span>
          <span class="qc-step-del" (click)="removeStep(i)">&#x2715;</span>
        </div>
        <div class="qc-step-actions">
          <span class="qc-step-add" (click)="addStep()">+ {{ i18n.t('settings.add_step') }}</span>
          <span class="qc-step-add qc-step-add-break" (click)="addBreakStep()">+ {{ i18n.t('settings.add_break') }}</span>
        </div>

        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('settings.group') }}</label>
          <div class="qc-filter-dropdown" [class.open]="showEditGroupDropdown">
            <div class="qc-filter-trigger" #editGroupTrigger (click)="toggleEditGroupDropdown(editGroupTrigger); $event.stopPropagation()">
              <span class="qc-filter-label">{{ editCmd.group || i18n.t('app.ungrouped') }}</span>
              <span class="qc-filter-arrow">{{ showEditGroupDropdown ? '&#x25B2;' : '&#x25BC;' }}</span>
            </div>
          </div>
        </div>
        <div class="qc-check-row">
          <label class="qc-check"><input type="checkbox" [(ngModel)]="editCmd.appendCR"><span>{{ i18n.t('settings.append_cr') }}</span></label>
          <label class="qc-check"><input type="checkbox" [(ngModel)]="editCmd.pinned"><span>{{ i18n.t('settings.pinned') }}</span></label>
        </div>
        <div class="qc-usage-row" *ngIf="editCmd?.id && editCmd?.usageCount !== undefined">
          <span class="qc-usage-label">{{ i18n.t('settings.usage_count') }}: <strong>{{ editCmd.usageCount || 0 }}</strong></span>
          <span class="qc-usage-reset" (click)="onResetUsage()">{{ i18n.t('settings.reset') }}</span>
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="closeEditModal()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="saveEditCmd()">{{ i18n.t('settings.save') }}</button>
      </div>
    </div>

    <!-- 编辑弹窗 — 分组下拉菜单 -->
    <div class="qc-filter-backdrop" *ngIf="showEditGroupDropdown" (click)="showEditGroupDropdown = false; $event.stopPropagation()" (mousedown)="$event.stopPropagation()"></div>
    <div class="qc-filter-menu" *ngIf="showEditGroupDropdown" (mousedown)="$event.stopPropagation()"
      [style.left.px]="editGroupMenuX" [style.top.px]="editGroupMenuY">
      <div class="qc-filter-option" [class.active]="!editCmd.group"
        (click)="editCmd.group = ''; showEditGroupDropdown = false">
        <span class="qc-filter-opt-icon">&#x1F4C4;</span> {{ i18n.t('app.ungrouped') }}
      </div>
      <div class="qc-filter-opt-divider" *ngIf="allGroups.length > 0"></div>
      <div class="qc-filter-option" *ngFor="let g of allGroups"
        [class.active]="editCmd.group === g.name"
        (click)="editCmd.group = g.name; showEditGroupDropdown = false">
        <span class="qc-filter-opt-icon">&#x1F4C1;</span> {{ g.name }}
      </div>
    </div>

    <!-- ====== 参数输入弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showParamModal" (click)="closeParamModal()"></div>
    <div class="qc-modal" *ngIf="showParamModal" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ paramModalCmd?.name || i18n.t('panel.param_hint') }}</span>
      </div>
      <div class="qc-modal-body">
        <div class="qc-field" *ngFor="let p of paramModalParams">
          <label class="qc-field-label">{{ p }}</label>
          <input class="qc-field-input" type="text" [(ngModel)]="paramModalValues[p]"
            (keydown.enter)="confirmParamModal()" [placeholder]="i18n.t('panel.param_hint') + ': ' + p" autofocus>
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="closeParamModal()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="confirmParamModal()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>

    <!-- ====== 分组编辑弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showGroupRename" (click)="closeGroupRename()"></div>
    <div class="qc-modal qc-modal-sm" *ngIf="showGroupRename" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ groupRenameIsNew ? i18n.t('group.add') : i18n.t('group.edit') }}</span>
      </div>
      <div class="qc-modal-body">
        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('group.name') }}</label>
          <input class="qc-field-input" type="text" [(ngModel)]="groupRenameValue"
            (keydown.enter)="confirmGroupRename()" [placeholder]="i18n.t('group.name')" autofocus>
        </div>
        <div class="qc-field">
          <label class="qc-field-label">{{ i18n.t('group.order') }}</label>
          <input class="qc-field-input" type="number" min="0" step="1" [(ngModel)]="groupRenameOrder"
            (keydown.enter)="confirmGroupRename()" placeholder="0">
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="closeGroupRename()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="confirmGroupRename()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>

    <!-- ====== 多步命令提示弹窗 ====== -->
    <div class="qc-overlay" *ngIf="showMultiStepHint" (click)="cancelMultiStepHint()"></div>
    <div class="qc-modal qc-modal-sm" *ngIf="showMultiStepHint" (click)="$event.stopPropagation()">
      <div class="qc-modal-header">
        <span class="qc-modal-title">{{ i18n.t('panel.multi_step_title') }}</span>
      </div>
      <div class="qc-modal-body">
        <p class="qc-modal-text">{{ i18n.t('panel.multi_step_hint', { count: multiStepCount }) }}</p>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn qc-btn-ghost" (click)="cancelMultiStepHint()">{{ i18n.t('settings.cancel') }}</button>
        <button class="qc-btn qc-btn-primary" (click)="confirmMultiStepJoin()">{{ i18n.t('settings.ok') }}</button>
      </div>
    </div>
  `,
  styles: [`
    /* ========================================
       CSS 自定义属性（继承自 :root 的 --qc-*）
       ======================================== */
    :host {
      display: contents;
      --_bg: var(--qc-bg, rgba(22,22,28,0.72));
      --_bg-rgb: var(--qc-bg-rgb, 22,22,28);
      --_text: var(--qc-text, #e8e8e8);
      --_text-secondary: var(--qc-text-secondary, #b0b0b0);
      --_text-muted: var(--qc-text-muted, #7a7a8a);
      --_primary: var(--qc-primary, #5b8def);
      --_primary-rgb: var(--qc-primary-rgb, 91,141,239);
      --_border: var(--qc-border, rgba(255,255,255,0.10));
      --_surface: var(--qc-surface, rgba(255,255,255,0.06));
      --_surface-rgb: var(--qc-surface-rgb, 255,255,255);
      --_input-bg: var(--qc-input-bg, rgba(255,255,255,0.08));
      --_hover: var(--qc-hover, rgba(255,255,255,0.08));
      --_group-name: var(--qc-group-name, var(--_text-secondary));
      --_shadow: var(--qc-shadow, 0 8px 40px rgba(0,0,0,0.42));
      --_blur: var(--qc-blur, 24px);
      --_saturate: var(--qc-saturate, 160%);
      --_warning: #fab387;
      --_danger: #f38ba8;
    }

    /* ========================================
       面板主体 — 毛玻璃核心
       ======================================== */
    .qc-panel {
      position: absolute;
      z-index: 99999;
      width: 340px;
      background: var(--_bg);
      backdrop-filter: blur(var(--_blur)) saturate(var(--_saturate));
      -webkit-backdrop-filter: blur(var(--_blur)) saturate(var(--_saturate));
      border: 1px solid var(--_border);
      border-radius: 14px;
      box-shadow: var(--_shadow);
      display: flex;
      flex-direction: column;
      user-select: none;
      font-size: var(--qc-font-size, 14px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', system-ui, sans-serif;
      overflow: hidden;
      transition: box-shadow 0.25s ease;
    }
    .qc-panel:hover {
      box-shadow: var(--_shadow), 0 0 0 1px rgba(255,255,255,0.04) inset;
    }
    .qc-panel.minimized {
      width: auto !important;
      height: auto !important;
      border-radius: 10px;
      box-shadow: var(--_shadow);
    }

    /* 玻璃高光 */
    .qc-glass-shine {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      border-radius: inherit;
      background:
        radial-gradient(160% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 50%, transparent 100%),
        linear-gradient(170deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0.03) 100%);
    }

    /* ========================================
       标题栏
       ======================================== */
    .qc-titlebar {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      cursor: move;
      flex-shrink: 0;
      border-bottom: 1px solid var(--_border);
      background: rgba(255,255,255,0.03);
    }
    .qc-title-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--_primary);
      flex-shrink: 0;
      box-shadow: 0 0 6px rgba(var(--_primary-rgb), 0.4);
    }
    .qc-title {
      font-weight: 600;
      font-size: 0.95em;
      color: var(--_text);
      letter-spacing: 0.02em;
    }
    .qc-ssh-badge {
      margin-left: 2px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.78em;
      font-weight: 500;
      color: var(--_primary);
      background: rgba(var(--_primary-rgb), 0.12);
      border: 1px solid rgba(var(--_primary-rgb), 0.2);
    }
    .qc-title-spacer { flex: 1; }
    .qc-title-btn {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .qc-title-btn:hover { background: var(--_hover); color: var(--_text); }
    .qc-title-btn-mem { font-size: 14px; }
    .qc-title-btn-mem.active { color: #f9e2af; }
    .qc-title-btn-mem:hover { color: #f9e2af; }
    .qc-title-btn-close:hover { background: rgba(243,139,168,0.2); color: var(--_danger); }

    /* ========================================
       搜索栏
       ======================================== */
    .qc-search {
      position: relative; z-index: 1;
      display: flex; gap: 8px;
      padding: 10px 12px;
      flex-shrink: 0;
    }
    /* 自定义分组下拉 - 触发器 */
    .qc-filter-dropdown { flex-shrink: 0; }
    .qc-filter-trigger {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px 7px 12px;
      border-radius: 10px; cursor: pointer;
      background: var(--_input-bg);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid var(--_border);
      color: var(--_text-secondary);
      font-size: 0.85em; font-weight: 500;
      transition: all 0.18s ease;
      white-space: nowrap; user-select: none;
      min-width: 90px;
    }
    .qc-filter-trigger:hover { border-color: rgba(var(--_primary-rgb), 0.5); background: var(--_hover); }
    .qc-filter-dropdown.open .qc-filter-trigger { border-color: var(--_primary); box-shadow: 0 0 0 3px rgba(var(--_primary-rgb), 0.12); }
    .qc-filter-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .qc-filter-arrow { font-size: 0.65em; color: var(--_text-muted); transition: transform 0.18s; flex-shrink: 0; }

    /* 下拉遮罩和菜单 — fixed 定位在面板外部，不受面板 overflow/stacking 影响 */
    .qc-filter-backdrop { position: fixed; inset: 0; z-index: 100000; }
    .qc-filter-menu {
      position: fixed; z-index: 100001;
      min-width: 150px; max-width: 240px; max-height: 220px;
      overflow-y: auto; overflow-x: hidden;
      background: rgb(var(--_bg-rgb, 22,22,28));
      border: 1px solid var(--_border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.55);
      padding: 6px;
    }
    .qc-filter-option {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 10px; border-radius: 8px;
      font-size: 0.84em; color: var(--_text-secondary);
      cursor: pointer; transition: all 0.1s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qc-filter-option:hover { background: var(--_hover); color: var(--_text); }
    .qc-filter-option.active { background: rgba(var(--_primary-rgb), 0.12); color: var(--_primary); font-weight: 600; }
    .qc-filter-opt-icon { font-size: 0.85em; flex-shrink: 0; opacity: 0.6; }
    .qc-filter-opt-divider { height: 1px; margin: 4px 8px; background: var(--_border); }
    .qc-filter-clear-btn {
      width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; cursor: pointer;
      font-size: 0.65em; color: var(--_text-muted);
      background: rgba(255,255,255,0.06);
      transition: all 0.12s; flex-shrink: 0;
    }
    .qc-filter-clear-btn:hover { background: rgba(243,139,168,0.2); color: var(--_danger); }
    .qc-search-input-wrap {
      flex: 1; position: relative; display: flex; align-items: center;
    }
    .qc-search-input {
      width: 100%; padding: 7px 32px 7px 12px;
      border-radius: 10px; box-sizing: border-box;
      background: var(--_input-bg);
      border: 1px solid var(--_border);
      color: var(--_text);
      font-size: 0.9em; outline: none;
      transition: border-color 0.15s;
    }
    .qc-search-input::placeholder { color: var(--_text-muted); }
    .qc-search-input:focus { border-color: var(--_primary); }
    .qc-search-clear {
      position: absolute; right: 8px;
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      font-size: 11px; cursor: pointer;
      color: var(--_text-muted);
      background: rgba(255,255,255,0.06);
      transition: all 0.12s;
    }
    .qc-search-clear:hover { background: rgba(255,255,255,0.14); color: var(--_text); }

    /* ========================================
       快捷命令栏
       ======================================== */
    .qc-quick-bar {
      position: relative; z-index: 1;
      display: flex; gap: 6px;
      padding: 0 12px 10px;
      flex-shrink: 0;
      overflow-x: auto;
    }
    .qc-quick-cmd {
      display: flex; align-items: center; gap: 4px;
      flex-shrink: 0;
      padding: 5px 12px;
      border-radius: 20px;
      background: rgba(var(--_primary-rgb), 0.10);
      border: 1px solid rgba(var(--_primary-rgb), 0.18);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .qc-quick-cmd:hover {
      background: rgba(var(--_primary-rgb), 0.18);
      border-color: rgba(var(--_primary-rgb), 0.32);
      transform: translateY(-1px);
    }
    .qc-quick-icon { font-size: 0.75em; color: var(--_primary); flex-shrink: 0; }
    .qc-quick-name {
      font-size: 0.82em; font-weight: 500;
      color: var(--_text);
      max-width: 120px; overflow: hidden; text-overflow: ellipsis;
    }

    /* ========================================
       命令列表 & 分组头
       ======================================== */
    .qc-list {
      position: relative; z-index: 1;
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 0 8px; min-width: 0;
    }
    .qc-group-header {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 10px;
      margin: 2px 0;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.12s;
      position: relative;
      z-index: 1;
    }
    .qc-group-header:hover { background: var(--_hover); }
    .qc-group-header.drag-over {
      outline: 2px solid var(--_primary);
      outline-offset: -1px;
    }
    .qc-group-arrow {
      font-size: 0.65em; color: var(--_text-muted);
      width: 14px; text-align: center; flex-shrink: 0;
      transition: transform 0.15s;
    }
    .qc-group-icon { font-size: 0.8em; flex-shrink: 0; }
    .qc-group-name {
      font-weight: 600; font-size: 0.88em;
      color: var(--_group-name);
      flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qc-group-count {
      font-size: 0.72em; font-weight: 600;
      color: var(--_text-muted);
      background: var(--_surface);
      padding: 2px 7px; border-radius: 10px;
      flex-shrink: 0;
    }
    .qc-group-actions {
      display: flex; gap: 2px; flex-shrink: 0;
      opacity: 0; transition: opacity 0.12s;
    }
    .qc-group-header:hover .qc-group-actions { opacity: 1; }
    .qc-group-act {
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      font-size: 0.9em; cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .qc-group-act:hover { background: var(--_hover); color: var(--_text); }
    .qc-group-act-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }

    /* ========================================
       命令行
       ======================================== */
    .qc-cmd-group-body {
      position: relative; z-index: 1;
      padding: 2px 0 2px 12px;
      border-left: 1px solid var(--_border);
      margin-left: 12px;
    }
    .qc-cmd-row {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px; margin: 2px 0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.12s;
      background: transparent;
      border: 1px solid transparent;
    }
    .qc-cmd-row:hover, .qc-cmd-row.highlighted {
      background: var(--_surface);
      border-color: var(--_border);
    }
    .qc-cmd-row.drag-over { border-top: 2px solid var(--_primary); }
    .qc-cmd-row.drag-over-bottom { border-bottom: 2px solid var(--_primary); }
    .qc-cmd-row.dragging { opacity: 0.35; }
    .qc-cmd-drag {
      font-size: 15px; color: var(--_text-muted); cursor: grab;
      flex-shrink: 0; width: 16px; text-align: center;
      user-select: none; letter-spacing: -2px;
    }
    .qc-cmd-drag:active { cursor: grabbing; }
    .qc-cmd-body { flex: 1; min-width: 0; }
    .qc-cmd-name {
      display: block; font-size: 0.88em; font-weight: 500;
      color: var(--_text); line-height: 1.4;
    }
    .qc-cmd-preview {
      display: block; font-size: 0.74em; font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
      color: var(--_text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-top: 1px;
    }
    .qc-cmd-badge {
      font-size: 0.7em; font-weight: 600; padding: 2px 6px;
      border-radius: 6px;
      background: rgba(250,179,135,0.18);
      color: var(--_warning);
      flex-shrink: 0; letter-spacing: 0.02em;
    }
    .qc-cmd-shortcut-badge {
      font-size: 0.7em; padding: 2px 6px; border-radius: 6px;
      background: var(--_surface); color: var(--_text-muted);
      font-family: monospace; flex-shrink: 0;
    }
    .qc-cmd-actions {
      display: flex; gap: 1px; flex-shrink: 0;
      opacity: 0; transition: opacity 0.12s;
    }
    .qc-cmd-row:hover .qc-cmd-actions { opacity: 1; }
    .qc-cmd-act {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      font-size: 0.85em; cursor: pointer;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .qc-cmd-act:hover { background: var(--_hover); color: var(--_text); }
    .qc-cmd-act.active { color: var(--_primary); opacity: 1 !important; }
    .qc-cmd-act-run { font-size: 1.05em; }
    .qc-cmd-act-run:hover { background: rgba(var(--_primary-rgb), 0.14); color: var(--_primary); }
    .qc-cmd-act-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }
    .qc-drop-end {
      height: 0; transition: height 0.12s;
      border-radius: 6px; margin: 2px 10px;
    }
    .qc-drop-end.drag-over { height: 4px; background: var(--_primary); }

    /* ========================================
       空状态
       ======================================== */
    .qc-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 20px; text-align: center;
    }
    .qc-empty-icon { font-size: 28px; opacity: 0.5; }
    .qc-empty span:last-child {
      font-size: 0.88em; color: var(--_text-muted);
      line-height: 1.5;
    }

    /* ========================================
       底部栏
       ======================================== */
    .qc-footer {
      position: relative; z-index: 1;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-top: 1px solid var(--_border);
      flex-shrink: 0;
    }
    .qc-footer-btn {
      font-size: 0.82em; font-weight: 500;
      cursor: pointer;
      padding: 5px 10px; border-radius: 8px;
      color: var(--_text-muted);
      transition: all 0.12s;
    }
    .qc-footer-btn:hover { background: var(--_hover); color: var(--_text); }
    .qc-footer-btn-primary { color: var(--_primary); }
    .qc-footer-btn-primary:hover { background: rgba(var(--_primary-rgb), 0.1); }
    .qc-footer-count {
      margin-left: auto;
      font-size: 0.78em; font-weight: 500;
      color: var(--_text-muted);
    }

    /* ========================================
       调整大小手柄
       ======================================== */
    .qc-rsz { position: absolute; z-index: 2; }
    .qc-rsz-e, .qc-rsz-w { top: 4px; bottom: 4px; width: 8px; cursor: ew-resize; }
    .qc-rsz-s, .qc-rsz-n { left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .qc-rsz-e { right: 0; border-radius: 0 14px 14px 0; }
    .qc-rsz-w { left: 0; border-radius: 14px 0 0 14px; }
    .qc-rsz-s { bottom: 0; border-radius: 0 0 14px 14px; }
    .qc-rsz-n { top: 0; border-radius: 14px 14px 0 0; }
    .qc-rsz-se, .qc-rsz-sw, .qc-rsz-ne, .qc-rsz-nw { width: 14px; height: 14px; }
    .qc-rsz-se { right: 0; bottom: 0; cursor: nwse-resize; }
    .qc-rsz-sw { left: 0; bottom: 0; cursor: nesw-resize; }
    .qc-rsz-ne { right: 0; top: 0; cursor: nesw-resize; }
    .qc-rsz-nw { left: 0; top: 0; cursor: nwse-resize; }

    /* ========================================
       弹窗通用
       ======================================== */
    .qc-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100000;
    }
    .qc-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: var(--_bg);
      backdrop-filter: blur(calc(var(--_blur) * 1.2)) saturate(var(--_saturate));
      -webkit-backdrop-filter: blur(calc(var(--_blur) * 1.2)) saturate(var(--_saturate));
      border: 1px solid var(--_border);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 100001;
      width: 600px; max-width: 92vw;
      overflow: hidden;
      isolation: isolate;
    }
    .qc-modal-sm { width: 380px; }
    .qc-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--_border);
      background: rgba(255,255,255,0.02);
    }
    .qc-modal-title {
      font-weight: 600; font-size: 1em;
      color: var(--_text);
    }
    .qc-modal-body {
      padding: 20px;
      max-height: 55vh; overflow-y: auto;
    }
    .qc-modal-text {
      font-size: 0.9em; color: var(--_text-secondary);
      line-height: 1.6; margin: 0;
    }
    .qc-modal-footer {
      display: flex; gap: 8px; justify-content: flex-end;
      padding: 14px 20px;
      border-top: 1px solid var(--_border);
      background: rgba(255,255,255,0.015);
    }

    /* 表单字段 */
    .qc-field { margin-bottom: 14px; }
    .qc-field-label {
      display: block; font-size: 0.78em; font-weight: 600;
      color: var(--_text-muted); margin-bottom: 5px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .qc-field-input {
      width: 100%; padding: 9px 12px; border-radius: 10px;
      box-sizing: border-box;
      background: var(--_input-bg);
      border: 1px solid var(--_border);
      color: var(--_text);
      font-size: 0.92em; outline: none;
      transition: border-color 0.15s;
    }
    .qc-field-input:focus { border-color: var(--_primary); }
    select.qc-field-input {
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 30px;
    }
    select.qc-field-input option { color: #000; background: #fff; }

    /* 复选框行 */
    .qc-check-row { display: flex; gap: 18px; margin: 12px 0; }
    .qc-check {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.88em; color: var(--_text-secondary);
      cursor: pointer;
    }
    .qc-check input[type="checkbox"] {
      width: 16px; height: 16px; margin: 0;
      accent-color: var(--_primary); cursor: pointer;
    }

    /* 用量行 */
    .qc-usage-row {
      display: flex; align-items: center; gap: 10px;
      margin-top: 4px; padding: 8px 12px;
      border-radius: 8px; background: var(--_surface);
      font-size: 0.8em; color: var(--_text-muted);
    }
    .qc-usage-label strong { color: var(--_text); font-size: 1.05em; }
    .qc-usage-reset {
      margin-left: auto; cursor: pointer;
      color: var(--_warning); font-size: 0.85em;
      padding: 3px 10px; border-radius: 6px;
      transition: background 0.12s;
    }
    .qc-usage-reset:hover { background: rgba(250,179,135,0.12); }

    /* 按钮 */
    .qc-btn {
      padding: 8px 20px; border-radius: 10px;
      border: 1px solid var(--_border);
      background: var(--_surface);
      color: var(--_text);
      font-size: 0.88em; font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
    }
    .qc-btn:hover { background: var(--_hover); }
    .qc-btn-primary {
      background: var(--_primary);
      color: #fff;
      border-color: var(--_primary);
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(var(--_primary-rgb), 0.3);
    }
    .qc-btn-primary:hover {
      opacity: 0.9;
      box-shadow: 0 6px 20px rgba(var(--_primary-rgb), 0.4);
      transform: translateY(-1px);
    }
    .qc-btn-ghost {
      background: transparent; border-color: transparent;
      color: var(--_text-muted);
    }
    .qc-btn-ghost:hover { background: var(--_hover); color: var(--_text); }

    /* ========================================
       步骤编辑器
       ======================================== */
    .qc-step-row {
      display: flex; gap: 5px; align-items: center;
      margin-bottom: 4px;
      padding: 6px 8px;
      border-radius: 10px;
      background: var(--_surface);
      border: 1px solid transparent;
      transition: border-color 0.12s;
    }
    .qc-step-row:hover { border-color: var(--_border); }
    .qc-step-row.dragging { opacity: 0.4; }
    .qc-step-row.drag-over { border-top: 2px solid var(--_primary); }
    .qc-step-row.drag-over-bottom { border-bottom: 2px solid var(--_primary); }
    .qc-step-drag {
      font-size: 15px; color: var(--_text-muted); cursor: grab;
      flex-shrink: 0; width: 16px; text-align: center;
      user-select: none;
    }
    .qc-step-drag:active { cursor: grabbing; }
    .qc-step-type {
      font-size: 0.85em; cursor: pointer; flex-shrink: 0;
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 7px;
      color: var(--_primary);
      background: rgba(var(--_primary-rgb), 0.10);
      transition: background 0.12s;
    }
    .qc-step-type.is-break {
      color: #fab387; background: rgba(250,179,135,0.12);
    }
    .qc-step-type:hover { background: rgba(var(--_primary-rgb), 0.18); }
    .qc-step-type.is-break:hover { background: rgba(250,179,135,0.2); }
    .qc-step-input {
      flex: 1; padding: 7px 10px; border-radius: 8px;
      box-sizing: border-box;
      background: var(--_input-bg); border: 1px solid var(--_border);
      color: var(--_text); font-size: 0.88em; outline: none;
      resize: none; overflow: hidden; min-height: 30px;
      field-sizing: content; font-family: monospace;
    }
    .qc-step-input:focus { border-color: var(--_primary); }
    .qc-step-delay {
      width: 60px; padding: 7px 4px; border-radius: 8px;
      box-sizing: border-box; flex-shrink: 0;
      background: var(--_input-bg); border: 1px solid var(--_border);
      color: var(--_text-muted); font-size: 0.78em;
      outline: none; text-align: center;
    }
    .qc-step-delay:focus { border-color: var(--_primary); color: var(--_text); }
    .qc-step-del {
      flex-shrink: 0; cursor: pointer;
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      color: var(--_text-muted); font-size: 0.8em;
      transition: all 0.12s;
    }
    .qc-step-del:hover { background: rgba(243,139,168,0.15); color: var(--_danger); }
    .qc-step-break-label {
      flex: 1; font-size: 0.85em; font-weight: 600;
      color: #fab387; padding: 0 4px;
    }
    .qc-step-actions {
      display: flex; gap: 14px; margin-top: 4px; margin-bottom: 8px;
    }
    .qc-step-add {
      font-size: 0.82em; font-weight: 500;
      color: var(--_primary); cursor: pointer;
      padding: 4px 8px; border-radius: 6px;
      transition: background 0.12s;
    }
    .qc-step-add:hover { background: rgba(var(--_primary-rgb), 0.08); }
    .qc-step-add-break { color: #fab387; }
    .qc-step-add-break:hover { background: rgba(250,179,135,0.08); }

    /* ========================================
       滚动条
       ======================================== */
    .qc-list::-webkit-scrollbar,
    .qc-quick-bar::-webkit-scrollbar,
    .qc-modal-body::-webkit-scrollbar {
      width: 5px; height: 5px;
    }
    .qc-list::-webkit-scrollbar-track,
    .qc-quick-bar::-webkit-scrollbar-track,
    .qc-modal-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .qc-list::-webkit-scrollbar-thumb,
    .qc-quick-bar::-webkit-scrollbar-thumb,
    .qc-modal-body::-webkit-scrollbar-thumb {
      background: var(--_border);
      border-radius: 10px;
    }
    .qc-list::-webkit-scrollbar-thumb:hover,
    .qc-quick-bar::-webkit-scrollbar-thumb:hover,
    .qc-modal-body::-webkit-scrollbar-thumb:hover {
      background: var(--_text-muted);
    }
  `],
})
export class QuickCommandFloatingPanel implements OnInit, OnDestroy {
  @ViewChild('listRef') listRef!: ElementRef

  svc = new QuickCommandService()
  i18n = new QuickCommandI18nService()

  private destroyed = false
  minimized = false
  panelX = 20
  panelY = 60
  /** 面板宽度，从 localStorage 恢复，默认 320 */
  panelWidth: number = +(localStorage.getItem('qc-plus-panel-width') || '320')
  /** 面板高度，0 表示自动（不固定），拖拽后持久化 */
  panelHeight: number = +(localStorage.getItem('qc-plus-panel-height') || '0')
  private resizing: { dir: string; startW: number; startH: number; lastX: number; lastY: number } | null = null
  private resizeMoveHandler: ((ev: MouseEvent) => void) | null = null
  private resizeUpHandler: (() => void) | null = null
  searchText = ''
  filterGroup = ''
  showGroupDropdown = false
  filterMenuX = 0
  filterMenuY = 0
  showEditGroupDropdown = false
  editGroupMenuX = 0
  editGroupMenuY = 0
  highlightedId = ''

  commands: QuickCommand[] = []
  groups: QuickCommandGroup[] = []
  filteredCommands: QuickCommand[] = []
  pinnedCommands: QuickCommand[] = []

  sshHost = ''
  terminalRef: any = null
  profileId = ''

  onClose: (() => void) | null = null
  onMinimize: (() => void) | null = null

  posMemoryOn = false

  private dragging = false
  private dragOffsetX = 0
  private dragOffsetY = 0
  private dragMoveHandler: any = null
  private dragUpHandler: any = null

  get allGroups(): QuickCommandGroup[] {
    return this.groups
  }

  get displayGroups(): QuickCommandGroup[] {
    return this.groups.filter(g => {
      if (this.filterGroup === '__ungrouped__') {
        if (g.name !== '') return false
      } else if (this.filterGroup) {
        if (g.name !== this.filterGroup) return false
      }
      if (this.searchText) {
        const cmds = this.getGroupCommands(g.name)
        return cmds.length > 0
      }
      return true
    })
  }

  get selectedCount(): number {
    return this.filteredCommands.length
  }

  ngOnInit(): void {
    this.loadData()
    this.initTerminalInfo()
    window.addEventListener('qc-plus-locale-changed', this.onLocaleChanged)
    window.addEventListener('qc-plus-data-changed', this.onDataChanged)
  }

  applyPositionMemory(): void {
    this.initTerminalInfo()
    this.posMemoryOn = this.profileId ? this.svc.hasPositionMemory(this.profileId) : false
    this.restorePosition()
    this.loadData()
  }

  private initTerminalInfo(): void {
    if (this.terminalRef) {
      try {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh) {
          this.sshHost = ssh.host || ssh.options?.host || ''
          if (this.sshHost) this.sshHost = '@' + this.sshHost
        }
      } catch { /* ignore */ }
    }
    if (!this.profileId && this.terminalRef?.profile?.id) {
      this.profileId = this.terminalRef.profile.id
    }
    if (!this.profileId && this.terminalRef) {
      try {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh?.host) this.profileId = 'ssh:' + ssh.host
      } catch { /* ignore */ }
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true
    this.savePosMemory()
    window.removeEventListener('qc-plus-locale-changed', this.onLocaleChanged)
    window.removeEventListener('qc-plus-data-changed', this.onDataChanged)
    this.cleanDrag()
    this.cleanResize()
  }

  private onLocaleChanged = (): void => {
    this.i18n = new QuickCommandI18nService()
    this.loadData()
  }

  private onDataChanged = (): void => {
    this.loadData()
  }

  loadData(): void {
    this.svc.reload()
    this.commands = this.svc.getAll()
    this.groups = this.svc.getGroups()
    this.pinnedCommands = this.svc.getPinned()
    if (this.filterGroup) {
      const valid = this.groups.some(g =>
        this.filterGroup === '__ungrouped__' ? !g.name : g.name === this.filterGroup
      )
      if (!valid) this.filterGroup = ''
    }
    this.onSearch()
  }

  /** 获取分组筛选下拉当前显示的文字 */
  getFilterGroupLabel(): string {
    if (!this.filterGroup || this.filterGroup === '') return this.i18n.t('app.all_groups')
    if (this.filterGroup === '__ungrouped__') return this.i18n.t('app.ungrouped')
    return this.filterGroup
  }

  /** 切换分组下拉，计算菜单位置 */
  toggleFilterDropdown(triggerEl: HTMLElement): void {
    if (this.showGroupDropdown) { this.showGroupDropdown = false; return }
    const rect = triggerEl.getBoundingClientRect()
    this.filterMenuX = rect.left
    this.filterMenuY = rect.bottom + 4
    this.showGroupDropdown = true
  }

  /** 编辑弹窗内分组下拉 */
  toggleEditGroupDropdown(triggerEl: HTMLElement): void {
    if (this.showEditGroupDropdown) { this.showEditGroupDropdown = false; return }
    const rect = triggerEl.getBoundingClientRect()
    this.editGroupMenuX = rect.left
    this.editGroupMenuY = rect.bottom + 4
    this.showEditGroupDropdown = true
  }

  onSearch(): void {
    let filtered = this.commands
    if (this.searchText) {
      const q = this.searchText.toLowerCase()
      filtered = filtered.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.text || '').toLowerCase().includes(q)
      )
    }
    if (this.filterGroup === '__ungrouped__') {
      filtered = filtered.filter(c => !c.group)
    } else if (this.filterGroup) {
      filtered = filtered.filter(c => c.group === this.filterGroup)
    }
    this.filteredCommands = filtered
  }

  getGroupCommands(groupName: string): QuickCommand[] {
    return this.filteredCommands.filter(c => (c.group || '') === (groupName || ''))
  }

  getPreview(cmd: QuickCommand): string {
    const text = cmd.text.replace(/\n/g, ' \u21B5 ')
    return text.length > 35 ? text.slice(0, 35) + '...' : text
  }

  toggleGroup(name: string): void {
    const target = this.groups.find(g => g.name === name)
    if (!target) return
    const willExpand = !target.expanded
    if (willExpand) {
      // 手风琴：收起所有已展开的分组
      this.groups.forEach(g => { if (g.expanded && g.name !== name) this.svc.toggleGroupExpanded(g.name) })
    }
    this.svc.toggleGroupExpanded(name)
    this.groups = this.svc.getGroups()
  }

  executeFirst(): void {
    if (this.filteredCommands.length > 0) {
      this.executeCommand(this.filteredCommands[0])
    }
  }

  onQuickBarWheel(event: WheelEvent): void {
    const el = event.currentTarget as HTMLElement
    if (!el) return
    event.preventDefault()
    el.scrollLeft += event.deltaY
  }

  executeCommand(cmd: QuickCommand): void {
    if (!this.terminalRef) return
    if (cmd.params && cmd.params.length > 0) {
      this.paramModalCmd = cmd
      this.paramModalParams = [...cmd.params]
      this.paramModalValues = {}
      this.paramModalForceExecute = false
      this.showParamModal = true
      return
    }
    this.sendCommand(cmd, cmd.text, false)
  }

  executeAlways(cmd: QuickCommand): void {
    if (!this.terminalRef) return
    if (cmd.params && cmd.params.length > 0) {
      this.paramModalCmd = cmd
      this.paramModalParams = [...cmd.params]
      this.paramModalValues = {}
      this.paramModalForceExecute = true
      this.showParamModal = true
      return
    }
    this.sendCommand(cmd, cmd.text, true)
  }

  confirmParamModal(): void {
    if (!this.paramModalCmd) return
    let text = this.paramModalCmd.text
    for (const p of this.paramModalParams) {
      const val = this.paramModalValues[p] || ''
      text = text.split('${' + p + '}').join(val)
    }
    this.sendCommand(this.paramModalCmd, text, this.paramModalForceExecute)
    this.closeParamModal()
  }

  closeParamModal(): void {
    this.showParamModal = false
    this.paramModalCmd = null
    this.paramModalParams = []
    this.paramModalValues = {}
  }

  sendToLine(cmd: QuickCommand): void {
    if (!this.terminalRef) return
    const steps = resolveSteps({ ...cmd, steps: cmd.steps, text: cmd.text })
    if (steps.length > 1) {
      this.multiStepCmd = cmd
      this.multiStepCount = steps.length
      this.showMultiStepHint = true
      return
    }
    this.sendLineText(steps[0]?.text || cmd.text)
  }

  confirmMultiStepJoin(): void {
    if (!this.multiStepCmd) return
    const steps = resolveSteps({ ...this.multiStepCmd, steps: this.multiStepCmd.steps, text: this.multiStepCmd.text })
    const joined = steps.map(s => s.text).filter(Boolean).join(' && ')
    if (joined) this.sendLineText(joined)
    this.cancelMultiStepHint()
  }

  cancelMultiStepHint(): void {
    this.showMultiStepHint = false
    this.multiStepCmd = null
    this.multiStepCount = 0
  }

  private sendLineText(text: string): void {
    if (!text) return
    try {
      let sent = false
      if (typeof this.terminalRef.sendInput === 'function') {
        this.terminalRef.sendInput(text); sent = true
      } else if (typeof this.terminalRef.write === 'function') {
        this.terminalRef.write(text); sent = true
      } else {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh && typeof ssh.write === 'function') { ssh.write(text); sent = true }
      }
      if (!sent) {
        const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
        if (hostEl) {
          const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input') as HTMLTextAreaElement | HTMLInputElement | null
          if (input) {
            input.focus(); input.value = text
            input.dispatchEvent(new Event('input', { bubbles: true }))
            sent = true
          }
        }
      }
      if (sent) this.focusTerminal()
    } catch (e) { console.warn('[QC+] sendLineText error', e) }
  }

  private sendCommand(cmd: QuickCommand, text: string, forceExecute = false): void {
    this.svc.incrementUsage(cmd.id)
    const steps = resolveSteps({ ...cmd, steps: cmd.steps, text })
    if (steps.length === 0) return
    this.executeSteps(cmd, steps, 0, forceExecute)
  }

  private sendRawBreak(onDone: () => void): void {
    try {
      const ctrlC = '\x03'
      let sent = false
      if (typeof this.terminalRef.sendInput === 'function') { this.terminalRef.sendInput(ctrlC); sent = true }
      else if (typeof this.terminalRef.write === 'function') { this.terminalRef.write(ctrlC); sent = true }
      else {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh && typeof ssh.write === 'function') { ssh.write(ctrlC); sent = true }
      }
      if (!sent) {
        const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
        if (hostEl) {
          const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input') as HTMLTextAreaElement | HTMLInputElement | null
          if (input) {
            input.focus()
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }))
            input.dispatchEvent(new KeyboardEvent('keypress', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }))
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }))
          }
        }
      }
    } catch { /* ignore */ }
    setTimeout(onDone, 100)
  }

  private executeSteps(cmd: QuickCommand, steps: CommandStep[], idx: number, forceExecute = false): void {
    if (this.destroyed) return
    if (idx >= steps.length) {
      this.focusTerminal()
      return
    }

    const step = steps[idx]
    const line = step.text
    const isLast = idx === steps.length - 1
    const appendLine = forceExecute ? true : (isLast ? (cmd.appendCR !== false) : true)

    // break 类型：发送 Ctrl+C 中断
    if (step.type === 'break') {
      // 延时执行：给 pty 行规程足够时间处理上一步的 \n
      // 防止 \x03 在同一个 n_tty_receive_buf 调用中覆盖 \n 的效果
      setTimeout(() => {
        this.sendRawBreak(() => {
          const nextDelay = step.delaySeconds || 0
          if (nextDelay > 0) { setTimeout(() => this.executeSteps(cmd, steps, idx + 1, forceExecute), nextDelay * 1000) }
          else { this.executeSteps(cmd, steps, idx + 1, forceExecute) }
        })
      }, 150)
      return
    }

    try {
      let sent = false
      if (typeof this.terminalRef.sendInput === 'function') {
        this.terminalRef.sendInput(line)
        if (appendLine) this.terminalRef.sendInput('\n')
        sent = true
      } else if (typeof this.terminalRef.write === 'function') {
        this.terminalRef.write(line)
        if (appendLine) this.terminalRef.write('\n')
        sent = true
      } else {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (ssh && typeof ssh.write === 'function') { ssh.write(line); if (appendLine) ssh.write('\n'); sent = true }
      }
      if (!sent) {
        const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
        if (hostEl) {
          const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input') as HTMLTextAreaElement | HTMLInputElement | null
          if (input) {
            input.focus(); input.value = line
            input.dispatchEvent(new Event('input', { bubbles: true }))
            if (appendLine) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
            sent = true
          }
        }
      }
      if (!sent && idx === 0) console.warn('[QC+] No terminal input method available')
      if (idx + 1 < steps.length) {
        const nextDelay = step.delaySeconds || 0
        if (nextDelay > 0) { setTimeout(() => this.executeSteps(cmd, steps, idx + 1, forceExecute), nextDelay * 1000) }
        else { this.executeSteps(cmd, steps, idx + 1, forceExecute) }
      } else {
        // 所有步骤执行完毕，进入 idx>=length 守卫回收焦点
        this.executeSteps(cmd, steps, idx + 1, forceExecute)
      }
    } catch (e) { console.warn('[QC+] executeSteps error', e) }
  }

  private focusTerminal(): void {
    try {
      const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
      if (!hostEl) return
      const input = hostEl.querySelector('.xterm-helper-textarea, .xterm textarea, textarea, input') as HTMLElement | null
      if (input) input.focus()
    } catch { /* ignore */ }
  }

  showEditModal = false
  editCmd: any = { name: '', text: '' }

  showParamModal = false
  paramModalCmd: QuickCommand | null = null
  paramModalParams: string[] = []
  paramModalValues: Record<string, string> = {}
  private paramModalForceExecute = false

  showGroupRename = false
  groupRenameIsNew = false
  groupRenameOldName = ''
  groupRenameValue = ''
  groupRenameOrder = 0

  showMultiStepHint = false
  multiStepCount = 0
  private multiStepCmd: QuickCommand | null = null

  addCommand(): void {
    this.editCmd = { name: '', text: '', group: '', appendCR: true, pinned: false, steps: [{ text: '', delaySeconds: 0, type: 'command' }] }
    this.showEditModal = true
  }

  addCommandToGroup(groupName: string): void {
    this.editCmd = { name: '', text: '', group: groupName || '', appendCR: true, pinned: false, steps: [{ text: '', delaySeconds: 0, type: 'command' }] }
    this.showEditModal = true
  }

  editCommand(cmd: QuickCommand): void {
    this.editCmd = JSON.parse(JSON.stringify(cmd))
    if (!this.editCmd.steps || this.editCmd.steps.length === 0) {
      if (this.editCmd.text) {
        const lines = this.editCmd.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
        const globalDelay = this.editCmd.delaySeconds || 0
        this.editCmd.steps = lines.map((line: string, i: number) => ({ text: line, delaySeconds: i < lines.length - 1 ? globalDelay : 0 }))
      } else { this.editCmd.steps = [{ text: '', delaySeconds: 0 }] }
    }
    this.showEditModal = true
    // 等待 DOM 渲染后自动调整 textarea 高度
    setTimeout(() => {
      document.querySelectorAll('.qc-step-input').forEach(el => {
        const ta = el as HTMLTextAreaElement
        if (ta.scrollHeight > ta.clientHeight) {
          ta.style.height = ta.scrollHeight + 'px'
        }
      })
    }, 50)
  }

  togglePin(cmd: QuickCommand): void {
    this.svc.update(cmd.id, { pinned: !cmd.pinned })
    cmd.pinned = !cmd.pinned
    this.loadData()
  }

  onResetUsage(): void {
    if (!this.editCmd?.id) return
    this.svc.update(this.editCmd.id, { usageCount: 0 })
    this.editCmd.usageCount = 0
  }

  get editCmdSteps(): CommandStep[] { return this.editCmd?.steps || [] }
  set editCmdSteps(v: CommandStep[]) { this.editCmd.steps = v }

  addStep(): void { this.editCmd.steps.push({ text: '', delaySeconds: 0, type: 'command' }) }

  addBreakStep(): void { this.editCmd.steps.push({ text: '', delaySeconds: 1, type: 'break' }) }

  autoGrow(event: Event): void {
    const ta = event.target as HTMLTextAreaElement
    ta.style.height = ta.scrollHeight + 'px'
  }

  removeStep(index: number): void {
    this.editCmd.steps.splice(index, 1)
    if (this.editCmd.steps.length === 0) this.editCmd.steps.push({ text: '', delaySeconds: 0 })
  }

  /* ---- 步骤拖拽排序 ---- */
  stepDragIdx: number | null = null

  onStepDragStart(event: DragEvent, idx: number): void {
    this.stepDragIdx = idx
    event.dataTransfer!.effectAllowed = 'move'
  }

  onStepDragOver(event: DragEvent, idx: number): void {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    const el = event.currentTarget as HTMLElement
    const rows = el.parentElement?.querySelectorAll('.qc-step-row')
    rows?.forEach(r => r.classList.remove('drag-over', 'drag-over-bottom'))
    const rect = el.getBoundingClientRect()
    const y = event.clientY - rect.top
    if (y > rect.height / 2) {
      el.classList.add('drag-over-bottom')
    } else {
      el.classList.add('drag-over')
    }
  }

  onStepDragLeave(event: DragEvent): void {
    ;(event.currentTarget as HTMLElement).classList.remove('drag-over', 'drag-over-bottom')
  }

  onStepDragEnd(): void {
    this.stepDragIdx = null
    document.querySelectorAll('.qc-step-row.drag-over, .qc-step-row.drag-over-bottom').forEach(el => el.classList.remove('drag-over', 'drag-over-bottom'))
  }

  onStepDrop(event: DragEvent, idx: number): void {
    event.preventDefault()
    if (this.stepDragIdx === null) { this.onStepDragEnd(); return }
    const steps = this.editCmd.steps
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const y = event.clientY - rect.top
    const dropAfter = y > rect.height / 2
    let targetIdx = idx
    if (dropAfter) targetIdx = idx + 1
    if (this.stepDragIdx === targetIdx || this.stepDragIdx === targetIdx - 1) { this.onStepDragEnd(); return }
    const [moved] = steps.splice(this.stepDragIdx, 1)
    const insertAt = this.stepDragIdx < targetIdx ? targetIdx - 1 : targetIdx
    steps.splice(insertAt, 0, moved)
    this.onStepDragEnd()
  }

  saveEditCmd(): void {
    if (!this.editCmd.name || !this.editCmd.name.trim()) return
    const steps = this.editCmd.steps || []
    const text = steps.map((s: CommandStep) => s.text).join('\n')
    if (!text.trim()) return
    const updateData = {
      name: this.editCmd.name.trim(), text: text.trim(), group: this.editCmd.group || '',
      appendCR: this.editCmd.appendCR !== false, pinned: !!this.editCmd.pinned,
      sendCtrlC: false, sendCtrlCAfter: false, // 步骤模式下清除旧版兼容字段，避免 resolveSteps 追加重复 break
      steps: steps.map((s: CommandStep) => ({ text: s.text, delaySeconds: Math.max(0, +(s.delaySeconds || 0)), type: s.type || 'command' })),
    }
    if (this.editCmd.id) { this.svc.update(this.editCmd.id, updateData) }
    else { this.svc.add({ ...updateData, params: [], sshProfiles: [] }) }
    this.showEditModal = false; this.searchText = ''; this.loadData()
  }

  closeEditModal(): void { this.showEditModal = false; this.showEditGroupDropdown = false }

  getParamBadge(cmd: QuickCommand): string {
    const count = cmd.params?.length || 0
    return count > 1 ? `${count} vars` : '${...}'
  }

  private dragCmdId: string | null = null
  listDropOver = false

  onDragStart(event: DragEvent, cmd: QuickCommand): void {
    this.dragCmdId = cmd.id
    event.dataTransfer?.setData('text/plain', cmd.id)
    event.dataTransfer!.effectAllowed = 'move'
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    const el = event.currentTarget as HTMLElement
    const y = event.clientY - el.getBoundingClientRect().top
    const dropBottom = y > el.offsetHeight / 2
    document.querySelectorAll('.qc-cmd-row.drag-over, .qc-cmd-row.drag-over-bottom, .qc-group-header.drag-over').forEach(r => r.classList.remove('drag-over', 'drag-over-bottom'))
    el.classList.add(dropBottom ? 'drag-over-bottom' : 'drag-over')
  }

  onDragLeave(event: DragEvent): void { (event.currentTarget as HTMLElement).classList.remove('drag-over', 'drag-over-bottom') }

  onDrop(event: DragEvent, targetCmd: QuickCommand): void {
    event.preventDefault(); this.cleanDragStyles()
    const srcId = this.dragCmdId || event.dataTransfer?.getData('text/plain')
    if (!srcId || srcId === targetCmd.id) return
    const allCmds = this.commands
    const srcIdx = allCmds.findIndex(c => c.id === srcId)
    const tgtIdx = allCmds.findIndex(c => c.id === targetCmd.id)
    if (srcIdx === -1 || tgtIdx === -1) return
    const srcCmd = allCmds[srcIdx]
    if ((srcCmd.group || '') !== (targetCmd.group || '')) {
      this.svc.update(srcCmd.id, { group: targetCmd.group || '' })
      srcCmd.group = targetCmd.group || ''
    }
    // 检测鼠标位置决定插入到目标上方还是下方
    const el = event.currentTarget as HTMLElement
    const y = event.clientY - el.getBoundingClientRect().top
    const dropAfter = y > el.offsetHeight / 2
    const [moved] = allCmds.splice(srcIdx, 1)
    const adjustedTgt = tgtIdx > srcIdx ? tgtIdx - 1 : tgtIdx
    const insertAt = dropAfter ? adjustedTgt + 1 : adjustedTgt
    allCmds.splice(insertAt, 0, moved)
    this.svc.reorder(allCmds.map(c => c.id))
    this.loadData()
  }

  onDropToGroup(event: DragEvent, groupName: string): void {
    event.preventDefault(); this.cleanDragStyles()
    const srcId = this.dragCmdId || event.dataTransfer?.getData('text/plain')
    if (!srcId) return
    const srcCmd = this.commands.find(c => c.id === srcId)
    if (!srcCmd || (srcCmd.group || '') === (groupName || '')) return
    this.svc.update(srcCmd.id, { group: groupName || '' })
    const allIds = this.commands.map(c => c.id)
    const idx = allIds.indexOf(srcId)
    if (idx !== -1) allIds.splice(idx, 1)
    allIds.push(srcId)
    this.svc.reorder(allIds)
    this.loadData()
  }

  onDragEnd(event: DragEvent): void { this.dragCmdId = null; this.cleanDragStyles(); this.listDropOver = false }

  onListDragOver(event: DragEvent): void {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    this.listDropOver = true
  }

  onListDragLeave(event: DragEvent): void {
    this.listDropOver = false
  }

  onListDrop(event: DragEvent, groupName: string): void {
    event.preventDefault()
    this.listDropOver = false
    this.cleanDragStyles()
    const srcId = this.dragCmdId || event.dataTransfer?.getData('text/plain')
    if (!srcId) return
    const srcCmd = this.commands.find(c => c.id === srcId)
    if (!srcCmd) return
    if ((srcCmd.group || '') !== (groupName || '')) {
      this.svc.update(srcCmd.id, { group: groupName || '' })
      srcCmd.group = groupName || ''
    }
    const allIds = this.commands.map(c => c.id)
    const idx = allIds.indexOf(srcId)
    if (idx !== -1) allIds.splice(idx, 1)
    allIds.push(srcId)
    this.svc.reorder(allIds)
    this.loadData()
  }

  private cleanDragStyles(): void {
    document.querySelectorAll('.qc-cmd-row.dragging, .qc-cmd-row.drag-over, .qc-cmd-row.drag-over-bottom, .qc-group-header.drag-over')
      .forEach(el => el.classList.remove('dragging', 'drag-over', 'drag-over-bottom'))
  }

  showGroupRenameDialog(oldName: string): void {
    this.groupRenameIsNew = false; this.groupRenameOldName = oldName; this.groupRenameValue = oldName
    const g = this.svc.getGroups().find(gr => gr.name === oldName)
    this.groupRenameOrder = g?.order ?? 0
    this.showGroupRename = true
  }

  deleteGroup(name: string): void {
    if (name && !confirm(this.i18n.t('group.delete_confirm', { name }))) return
    this.svc.removeGroup(name)
    this.loadData()
  }

  deleteCommand(cmd: QuickCommand): void {
    if (!confirm(this.i18n.t('panel.delete_confirm', { name: cmd.name }))) return
    this.svc.remove(cmd.id)
    this.loadData()
  }

  confirmGroupRename(): void {
    const newName = this.groupRenameValue?.trim()
    if (this.groupRenameIsNew) {
      if (newName) this.svc.addGroup(newName, this.groupRenameOrder)
    } else {
      if (!newName || newName === this.groupRenameOldName) {
        // 名称没变，只更新排序
        this.svc.updateGroupOrder(this.groupRenameOldName, this.groupRenameOrder)
        this.closeGroupRename(); this.loadData(); return
      }
      this.svc.renameGroup(this.groupRenameOldName, newName)
      this.svc.updateGroupOrder(newName, this.groupRenameOrder)
    }
    this.closeGroupRename(); this.loadData()
  }

  closeGroupRename(): void { this.showGroupRename = false; this.groupRenameIsNew = false; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0 }

  addNewGroup(): void { this.groupRenameIsNew = true; this.groupRenameOldName = ''; this.groupRenameValue = ''; this.groupRenameOrder = 0; this.showGroupRename = true }

  startDrag(event: MouseEvent): void {
    if (event.button !== 0) return
    this.dragging = true
    this.dragOffsetX = event.clientX - this.panelX
    this.dragOffsetY = event.clientY - this.panelY
    const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
    this.dragMoveHandler = (ev: MouseEvent) => {
      if (!this.dragging) return
      let x = ev.clientX - this.dragOffsetX
      let y = ev.clientY - this.dragOffsetY
      if (hostEl) {
        const panelEl = hostEl.querySelector('.qc-panel') as HTMLElement | null
        const ph = panelEl?.offsetHeight || 200; const pw = panelEl?.offsetWidth || 320
        const maxX = Math.max(0, hostEl.clientWidth - pw - 4); const maxY = Math.max(0, hostEl.clientHeight - ph - 4)
        x = Math.max(0, Math.min(x, maxX)); y = Math.max(0, Math.min(y, maxY))
      }
      this.panelX = x; this.panelY = y
    }
    this.dragUpHandler = () => {
      this.dragging = false
      if (this.posMemoryOn && this.profileId) { this.svc.savePositionMemory(this.profileId, { panelX: this.panelX, panelY: this.panelY }) }
      else { this.svc.savePanelPosition({ x: this.panelX, y: this.panelY }) }
      this.cleanDrag()
    }
    document.addEventListener('mousemove', this.dragMoveHandler)
    document.addEventListener('mouseup', this.dragUpHandler)
  }

  private cleanDrag(): void {
    if (this.dragMoveHandler) { document.removeEventListener('mousemove', this.dragMoveHandler); this.dragMoveHandler = null }
    if (this.dragUpHandler) { document.removeEventListener('mouseup', this.dragUpHandler); this.dragUpHandler = null }
  }

  /* ---- 面板大小调整 ---- */
  startResize(event: MouseEvent, dir: string): void {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const panelEl = (event.currentTarget as HTMLElement).closest('.qc-panel') as HTMLElement
    const startH = this.panelHeight || panelEl?.offsetHeight || 420
    this.resizing = { dir, startW: this.panelWidth, startH, lastX: event.clientX, lastY: event.clientY }
    this.resizeMoveHandler = (ev: MouseEvent) => {
      if (!this.resizing) return
      const dx = ev.clientX - this.resizing.lastX
      const dy = ev.clientY - this.resizing.lastY
      this.resizing.lastX = ev.clientX
      this.resizing.lastY = ev.clientY
      const dir = this.resizing.dir
      // 获取容器边界约束
      const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
      const maxW = hostEl ? hostEl.clientWidth : 9999
      const maxH = hostEl ? hostEl.clientHeight : 9999
      let newW = this.panelWidth
      let newH = this.panelHeight || this.resizing.startH
      // E/SE/NE：右边缘不超出容器
      if (dir.includes('e')) { const limit = maxW - this.panelX; newW = Math.max(300, Math.min(newW + dx, limit)) }
      // W/NW/SW：左边缘不超出容器左边界
      if (dir.includes('w')) { const maxShrink = newW - 300; const leftLimit = this.panelX; const dw = Math.max(Math.min(dx, maxShrink, leftLimit), -maxShrink); newW -= dw; this.panelX += dw }
      // S/SW/SE：下边缘不超出容器
      if (dir.includes('s')) { const limit = maxH - this.panelY; newH = Math.max(400, Math.min(newH + dy, limit)) }
      // N/NE/NW：上边缘不超出容器上边界
      if (dir.includes('n')) { const maxShrink = newH - 400; const topLimit = this.panelY; const dh = Math.max(Math.min(dy, maxShrink, topLimit), -maxShrink); newH -= dh; this.panelY += dh }
      this.panelWidth = Math.round(newW)
      this.panelHeight = Math.round(newH)
    }
    this.resizeUpHandler = () => {
      localStorage.setItem('qc-plus-panel-width', String(this.panelWidth))
      localStorage.setItem('qc-plus-panel-height', String(this.panelHeight || '0'))
      this.resizing = null
      this.cleanResize()
    }
    document.addEventListener('mousemove', this.resizeMoveHandler)
    document.addEventListener('mouseup', this.resizeUpHandler)
  }

  private cleanResize(): void {
    if (this.resizeMoveHandler) { document.removeEventListener('mousemove', this.resizeMoveHandler); this.resizeMoveHandler = null }
    if (this.resizeUpHandler) { document.removeEventListener('mouseup', this.resizeUpHandler); this.resizeUpHandler = null }
  }

  private restorePosition(): void {
    if (this.posMemoryOn && this.profileId) {
      const mem = this.svc.getPositionMemory(this.profileId)
      if (mem) {
        this.panelX = Math.max(0, mem.panelX || 20); this.panelY = Math.max(0, mem.panelY || 60)
        if (mem.filterGroup !== undefined) this.filterGroup = mem.filterGroup
        if (this.filterGroup && this.filterGroup !== '__ungrouped__') {
          if (!this.groups.some(g => g.name === this.filterGroup)) this.filterGroup = ''
        }
        if (mem.groupExpanded) {
          this.groups.forEach(g => { if (mem.groupExpanded[g.name] !== undefined) g.expanded = mem.groupExpanded[g.name] })
        }
        if (mem.panelScrollTop > 0) {
          setTimeout(() => { if (this.listRef?.nativeElement) this.listRef.nativeElement.scrollTop = mem.panelScrollTop }, 50)
        }
        return
      }
    }
    const saved = this.svc.getPanelPosition()
    if (saved.x !== 20 || saved.y !== 60) { this.panelX = Math.max(0, saved.x); this.panelY = Math.max(0, saved.y) }
    setTimeout(() => {
      const hostEl = this.terminalRef?.element?.nativeElement as HTMLElement | null
      if (hostEl) {
        const panelEl = hostEl.querySelector('.qc-panel') as HTMLElement | null
        const ph = panelEl?.offsetHeight || 200; const pw = panelEl?.offsetWidth || 320
        this.panelX = Math.max(0, Math.min(this.panelX, Math.max(0, hostEl.clientWidth - pw - 4)))
        this.panelY = Math.max(0, Math.min(this.panelY, Math.max(0, hostEl.clientHeight - ph - 4)))
      }
    }, 0)
  }

  private savePosMemory(): void {
    if (!this.profileId && this.terminalRef) {
      try {
        const ssh = this.terminalRef?.sshSession ?? this.terminalRef?._session ?? null
        if (this.terminalRef?.profile?.id) this.profileId = this.terminalRef.profile.id
        else if (ssh?.host) this.profileId = 'ssh:' + ssh.host
      } catch { /* ignore */ }
    }
    if (this.posMemoryOn && this.profileId) {
      const scrollTop = this.listRef?.nativeElement?.scrollTop || 0
      const groupExp: Record<string, boolean> = {}
      this.groups.forEach(g => { groupExp[g.name] = g.expanded })
      this.svc.savePositionMemory(this.profileId, {
        panelScrollTop: scrollTop > 0 ? scrollTop : undefined,
        filterGroup: this.filterGroup, groupExpanded: groupExp,
      })
    }
  }

  togglePosMemory(): void {
    if (!this.profileId) return
    this.posMemoryOn = this.svc.togglePositionMemory(this.profileId)
    if (this.posMemoryOn) {
      const groupExp: Record<string, boolean> = {}
      this.groups.forEach(g => { groupExp[g.name] = g.expanded })
      this.svc.savePositionMemory(this.profileId, {
        entryX: 0, entryY: 0, panelX: this.panelX, panelY: this.panelY,
        panelScrollTop: this.listRef?.nativeElement?.scrollTop || 0,
        filterGroup: this.filterGroup, groupExpanded: groupExp,
      })
    }
  }

  doClose(): void {
    if (!this.profileId) this.initTerminalInfo()
    this.savePosMemory()
    if (this.onClose) this.onClose()
  }

  noBubble(event: MouseEvent): void { event.stopPropagation() }
}